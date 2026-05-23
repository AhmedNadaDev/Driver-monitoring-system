const https = require("https");

const USER_AGENT = "DriverMonitoringSystem/1.0 (contact: tvm56281@gmail.com)";
const TIMEOUT_MS = 5000;

/**
 * Calls OpenStreetMap Nominatim to convert lat/lng into a human-readable address.
 * Returns { locationName, locationAddress, locationSource } or null on failure.
 * Never throws — all errors resolve to null so the caller can fall back gracefully.
 */
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            const json = JSON.parse(raw);
            const addr = json.address || {};

            const road =
              addr.road || addr.pedestrian || addr.street || addr.path || "";
            const suburb =
              addr.suburb || addr.neighbourhood || addr.quarter || "";
            const city =
              addr.city || addr.town || addr.village || addr.county || "";
            const country = addr.country || "";

            const locationName = city || suburb || road || "Unknown Location";
            const locationAddress =
              [road, suburb, city, country].filter(Boolean).join(", ") ||
              json.display_name ||
              `${lat}, ${lng}`;

            resolve({
              locationName,
              locationAddress,
              locationSource: "osm_nominatim",
            });
          } catch {
            resolve(null);
          }
        });
      },
    );

    req.on("error", () => resolve(null));
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      resolve(null);
    });
  });
}

module.exports = { reverseGeocode };
