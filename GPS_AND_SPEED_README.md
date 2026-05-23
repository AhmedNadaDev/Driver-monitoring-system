# GPS & Speed Monitoring — Full Documentation

## Overview

The Driver Monitoring System includes real-time GPS speed tracking and harsh braking detection. These features run on the driver's phone during an active trip, send violation events to the backend, store them in MongoDB, and display them in the dashboard.

---

## Architecture

```
Phone (Safari / Chrome)
  └── useGPS.js               → reads GPS speed + position
  └── useHarshBraking.js      → reads accelerometer for braking
  └── useSpeedLimit.js        → asks backend for road speed limit
        │
        ▼
Webcam Backend (Node.js — port 4000)
  └── GET  /api/speed-limit   → queries OpenStreetMap Overpass API
  └── POST /api/safety-events → saves violation to MongoDB, emits Socket.IO
  └── services/geocodingService.js    → reverse geocodes lat/lng → city name
  └── services/speedLimitService.js   → queries Overpass for road speed limit
        │
        ▼
MongoDB (driver-monitoringnew)
  └── violations collection   → stores speed_violation + harsh_braking docs
        │
        ▼
Dashboard Frontend (React — port 5173)
  └── DriverDetailsPage.jsx   → shows violations per trip
  └── ViolationSlider.jsx     → renders sensor event cards (no image)
  └── OverviewPage.jsx        → pie chart includes speed + braking types
```

---

## Files Involved

### Frontend — Webcam App

| File | Purpose |
|------|---------|
| `webcam-monitoring-app/frontend/src/hooks/useGPS.js` | Tracks GPS position and speed continuously |
| `webcam-monitoring-app/frontend/src/hooks/useHarshBraking.js` | Detects harsh braking via accelerometer |
| `webcam-monitoring-app/frontend/src/hooks/useSpeedLimit.js` | Fetches road speed limit from backend |
| `webcam-monitoring-app/frontend/src/components/DrivingSafetyPanel.jsx` | UI panel showing speed, limit, sensor status |
| `webcam-monitoring-app/frontend/src/pages/WebcamMonitorPage.jsx` | Wires all hooks together, sends violations |
| `webcam-monitoring-app/frontend/src/lib/api.js` | `postSafetyEvent()` — POST to /api/safety-events |

### Backend — Webcam App

| File | Purpose |
|------|---------|
| `webcam-monitoring-app/backend/src/services/geocodingService.js` | Reverse geocodes lat/lng using OpenStreetMap Nominatim |
| `webcam-monitoring-app/backend/src/services/speedLimitService.js` | Queries OpenStreetMap Overpass for road speed limit |
| `webcam-monitoring-app/backend/src/controllers/safetyEventController.js` | POST handler — geocodes, saves, emits Socket.IO |
| `webcam-monitoring-app/backend/src/models/Violation.js` | Mongoose schema including GPS + location fields |
| `webcam-monitoring-app/backend/src/index.js` | Registers /api/safety-events and /api/speed-limit routes |

### Dashboard App

| File | Purpose |
|------|---------|
| `Dashboard/backend/models/Violation.js` | Same schema — reads from shared MongoDB |
| `Dashboard/frontend/src/shared/components/ViolationSlider.jsx` | Renders sensor violation cards (speed, location, map link) |
| `Dashboard/frontend/src/features/drivers/DriverDetailsPage.jsx` | Shows violations per trip including sensor types |
| `Dashboard/frontend/src/features/overview/OverviewPage.jsx` | Pie chart includes speed_violation + harsh_braking |

---

## How GPS Speed Works

### 1. Start Tracking
GPS tracking starts automatically when the driver presses **Start Trip** and stops when they press **Stop Trip**.

```js
const gps = useGPS({
  enabled:     !!activeTrip,
  speedLimit:  effectiveSpeedLimit,
  onViolation: handleSensorViolation,
})
```

### 2. Reading Speed
The hook calls `navigator.geolocation.watchPosition()` which fires every 1–5 seconds.

**Primary source:** `pos.coords.speed` — provided directly by the GPS chip in m/s, converted to km/h:
```js
speedKmh = Math.round(pos.coords.speed * 3.6)
```

**Fallback (Haversine):** When `coords.speed` is null (common on some Android devices), speed is calculated from the distance between two consecutive GPS fixes:
```js
const distM  = haversineMeters(lat1, lng1, lat2, lng2)
const dtSec  = (pos.timestamp - prevTime) / 1000
speedKmh     = Math.round((distM / dtSec) * 3.6)
```

### 3. Violation Detection
A `speed_violation` is triggered when:
- Current speed exceeds the speed limit
- At least **30 seconds** have passed since the last violation (cooldown)

```js
if (speedKmh > speedLimitRef.current) {
  if (Date.now() - lastViolationTime >= 30_000) {
    onViolation({ type: 'speed_violation', speed: speedKmh, speedLimit, location })
  }
}
```

---

## How Speed Limit Detection Works

The speed limit is fetched automatically from OpenStreetMap while the trip is active.

### Flow
1. `useSpeedLimit(gps.location)` runs in the frontend
2. It calls `GET /api/speed-limit?lat=LAT&lng=LNG` on your backend
3. The backend (`speedLimitService.js`) queries the Overpass API from Node.js:
   ```
   https://overpass-api.de/api/interpreter
   ```
4. The query finds all drivable roads within 50 metres of the current position
5. Result is returned to the frontend and displayed

### Priority
| Condition | Result |
|-----------|--------|
| Road has explicit `maxspeed` tag | Use that value — shown as `60 km/h (signed)` |
| Road has no `maxspeed` but type is known | Use road-type default — shown as `40 km/h (residential)` |
| No road found at all | Keep previous limit or show `80 km/h (default)` |

### Road Type Defaults (km/h)

| OSM Highway Type | Default Speed |
|-----------------|--------------|
| motorway | 120 |
| trunk | 100 |
| primary | 80 |
| secondary | 70 |
| tertiary | 50 |
| unclassified | 50 |
| residential | 40 |
| living_street | 20 |
| service | 30 |

### Re-query Logic
The speed limit is NOT re-fetched on every GPS tick. It re-queries only when:
- The device has moved **more than 80 metres** from the last query point, AND
- At least **30 seconds** have passed

This prevents hammering the free Overpass API.

### Unit Conversion
If the road has a speed limit in mph (e.g. UK roads tagged `maxspeed=30 mph`), it is automatically converted to km/h:
```js
return Math.round(mph * 1.60934)
```

---

## How Harsh Braking Works

### Detection
The hook listens to `DeviceMotionEvent` which fires ~60 times per second on phones. It measures the total deceleration force:

```js
const decel = -(event.accelerationIncludingGravity.y)
if (decel > 15) { // 15 m/s² threshold (~1.5g)
  triggerViolation()
}
```

**Why 15 m/s²?**
- Normal braking: 3–5 m/s²
- Hard braking: 8–12 m/s²
- Emergency stop: 15+ m/s²

A cooldown of **15 seconds** prevents one hard stop from creating multiple events.

### iOS Permission (iPhone)
iOS 13+ requires explicit user permission before `DeviceMotionEvent` data is accessible. The system handles this:

1. On trip start, the hook detects it is running on iOS
2. An **"Allow (iPhone)"** button appears in the Driving Safety panel
3. The driver taps it — iOS shows a native permission dialog
4. After approval, motion tracking starts automatically

On Android, permission is not required and tracking starts immediately.

---

## What Gets Saved to MongoDB

Every violation is saved as a document in the `violations` collection:

```json
{
  "type": "speed_violation",
  "confidence": 1.0,
  "source": "sensor",
  "model": null,
  "speed": 95,
  "speedLimit": 80,
  "location": {
    "lat": 30.0444,
    "lng": 31.2357
  },
  "locationName": "Cairo",
  "locationAddress": "Tahrir Square, Garden City, Cairo, Egypt",
  "locationSource": "osm_nominatim",
  "driver": "<ObjectId>",
  "route": "<ObjectId>",
  "bus": "<ObjectId>",
  "trip": "<ObjectId>",
  "timestamp": "2026-05-11T10:30:00.000Z"
}
```

```json
{
  "type": "harsh_braking",
  "confidence": 1.0,
  "source": "sensor",
  "location": { "lat": 30.0444, "lng": 31.2357 },
  "locationName": "Cairo",
  "locationAddress": "Corniche El Nil, Cairo, Egypt",
  "locationSource": "osm_nominatim",
  "driver": "<ObjectId>",
  "trip": "<ObjectId>",
  "timestamp": "2026-05-11T10:31:00.000Z"
}
```

**Schema fields added for GPS/sensor violations:**

| Field | Type | Description |
|-------|------|-------------|
| `speed` | Number | Recorded speed in km/h (speed_violation only) |
| `speedLimit` | Number | Active speed limit at time of violation |
| `location.lat` | Number | GPS latitude |
| `location.lng` | Number | GPS longitude |
| `locationName` | String | City or area name from OpenStreetMap |
| `locationAddress` | String | Full address (road, suburb, city, country) |
| `locationSource` | String | `osm_nominatim` or `coordinates_only` |

---

## Reverse Geocoding

When a violation is saved, the backend automatically converts the lat/lng coordinates into a human-readable address using OpenStreetMap Nominatim:

```
GET https://nominatim.openstreetmap.org/reverse?format=json&lat=30.0444&lon=31.2357
```

The service extracts:
- `address.road` — street name
- `address.suburb` / `address.neighbourhood` — area
- `address.city` / `address.town` — city
- `address.country` — country

These are combined into `locationName` (short) and `locationAddress` (full). If geocoding fails (timeout, no internet), the violation is still saved with raw coordinates and `locationSource: "coordinates_only"`.

---

## Real-Time Events (Socket.IO)

After every violation is saved, the backend immediately emits a `safetyEvent` to all connected clients:

```js
io.emit('safetyEvent', {
  id, type, timestamp, speed, speedLimit,
  location, locationName, locationAddress,
  driver, trip
})
```

The dashboard and the webcam monitor page both listen for this event and update the UI instantly without any page refresh.

---

## Dashboard Display

### Driver Details Page
When you open a driver's profile and expand a trip:
- Speed violations and harsh braking appear as **sensor event cards** (no broken image placeholder)
- Each card shows: violation type icon, timestamp, speed badge (for speed violations), location badge with city name, and a "View on map ↗" link to OpenStreetMap

### Overview Page
The violations pie chart includes `speed_violation` (dark red) and `harsh_braking` (orange) alongside camera-detected violations.

---

## API Endpoints

### POST /api/safety-events
Saves a speed or braking violation.

**Request body:**
```json
{
  "type": "speed_violation",
  "speed": 95,
  "speedLimit": 80,
  "location": { "lat": 30.0444, "lng": 31.2357 },
  "driverId": "...",
  "routeId": "...",
  "busId": "...",
  "tripId": "..."
}
```

**Response:**
```json
{
  "success": true,
  "event": { "id": "...", "type": "speed_violation", "locationName": "Cairo", ... }
}
```

### GET /api/safety-events
Returns recent sensor violations. Supports query filters:

| Param | Description |
|-------|-------------|
| `type` | `speed_violation` or `harsh_braking` |
| `driverId` | Filter by driver |
| `tripId` | Filter by trip |
| `limit` | Max results (default 50, max 100) |

### GET /api/speed-limit?lat=LAT&lng=LNG
Returns the speed limit of the nearest road.

**Response:**
```json
{ "limit": 50, "source": "tagged" }
{ "limit": 40, "source": "road_type", "roadType": "residential" }
{ "limit": null }
```

---

## Environment Variables

### Webcam Frontend (`webcam-monitoring-app/frontend/.env`)
```env
VITE_BACKEND_URL=https://your-ngrok-url.ngrok-free.app
VITE_SPEED_LIMIT_KMH=80
```

`VITE_SPEED_LIMIT_KMH` is the **fallback** default limit used before OpenStreetMap returns a result. Default is 80.

---

## Requirements & Limitations

| Requirement | Detail |
|-------------|--------|
| HTTPS | Required by iOS Safari for geolocation. ngrok provides HTTPS automatically. |
| Physical movement | `coords.speed` is null when stationary. The Haversine fallback also returns 0 when not moving. Speed shows `—` until the phone is moving. |
| iPhone motion permission | Driver must tap "Allow (iPhone)" button once per session for harsh braking to work. |
| Phone mounting | For accurate harsh braking detection, the phone should be mounted (dashboard holder), not loose in a pocket or cupholder. |
| OpenStreetMap coverage | Speed limit detection depends on OSM data quality. In areas with sparse OSM data, road-type defaults are used. |
| Internet connection | Required for speed limit lookup and reverse geocoding. Violations are still saved with raw coordinates if geocoding fails. |
