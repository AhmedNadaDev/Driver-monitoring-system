const Violation = require('../models/Violation');
const Trip = require('../models/Trip');
const { reverseGeocode } = require('../services/geocodingService');

const SAFETY_TYPES = ['speed_violation', 'harsh_braking'];

/**
 * GET /api/safety-events
 * Query: ?type=speed_violation|harsh_braking  &driverId=  &tripId=  &limit=50
 *
 * Returns recent sensor-sourced violation documents (speed violations + harsh
 * braking), newest first. Max 100 per request.
 */
async function getSafetyEvents(req, res, next) {
  try {
    const filter = { type: { $in: SAFETY_TYPES } };

    if (req.query.type && SAFETY_TYPES.includes(req.query.type)) {
      filter.type = req.query.type;
    }
    if (req.query.tripId)   filter.trip   = req.query.tripId;
    if (req.query.driverId) filter.driver = req.query.driverId;

    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const events = await Violation.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('driver', 'id name')
      .populate('route',  'name')
      .populate('bus',    'busId')
      .lean();

    return res.json({ success: true, count: events.length, events });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/safety-events
 *
 * Body: {
 *   type:       'speed_violation' | 'harsh_braking'
 *   driverId?:  string
 *   routeId?:   string
 *   busId?:     string
 *   tripId?:    string
 *   speed?:     number  (km/h — for speed_violation)
 *   speedLimit?: number (km/h — for speed_violation)
 *   location?:  { lat: number, lng: number }
 * }
 *
 * Persists the event as a Violation document (same collection used by the
 * webcam pipeline) so it appears in the dashboard and logs automatically.
 * Emits a Socket.IO 'safetyEvent' to all connected clients.
 * Deducts 10 points from the active trip score (floored at 0).
 */
function createSafetyEventController({ io }) {
  return async function handleSafetyEvent(req, res, next) {
    try {
      const { type, driverId, routeId, busId, tripId, speed, speedLimit, location } = req.body;

      if (!SAFETY_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid type. Allowed: ${SAFETY_TYPES.join(', ')}`,
        });
      }

      // Reverse-geocode the coordinates (best-effort, never blocks the response)
      let locationName    = null;
      let locationAddress = null;
      let locationSource  = null;

      if (location?.lat != null && location?.lng != null) {
        const geo = await reverseGeocode(location.lat, location.lng);
        if (geo) {
          locationName    = geo.locationName;
          locationAddress = geo.locationAddress;
          locationSource  = geo.locationSource;
        } else {
          locationSource = 'coordinates_only';
        }
      }

      const violation = await Violation.create({
        type,
        confidence: 1.0,
        source:     'sensor',
        model:      null,
        speed:      speed      != null ? Number(speed)      : null,
        speedLimit: speedLimit != null ? Number(speedLimit) : null,
        location:   location   ?? null,
        locationName,
        locationAddress,
        locationSource,
        driver:     driverId   || null,
        route:      routeId    || null,
        bus:        busId      || null,
        trip:       tripId     || null,
      });

      // Deduct trip score best-effort (same pipeline as webcam violations).
      if (tripId) {
        Trip.findByIdAndUpdate(tripId, [
          {
            $set: {
              score:      { $max: [0, { $subtract: ['$score', 10] }] },
              violations: { $concatArrays: ['$violations', [violation._id]] },
            },
          },
        ]).catch(() => {});
      }

      const record = {
        id:              violation._id.toString(),
        type:            violation.type,
        timestamp:       violation.timestamp.toISOString(),
        source:          violation.source,
        speed:           violation.speed,
        speedLimit:      violation.speedLimit,
        location:        violation.location,
        locationName:    violation.locationName,
        locationAddress: violation.locationAddress,
        locationSource:  violation.locationSource,
        driver:          driverId || null,
        trip:            tripId   || null,
      };

      io.emit('safetyEvent', record);

      return res.status(201).json({ success: true, event: record });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { createSafetyEventController, getSafetyEvents };
