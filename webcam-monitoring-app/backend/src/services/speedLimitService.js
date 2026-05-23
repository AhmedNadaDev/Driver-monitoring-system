const https = require('https');

const USER_AGENT = 'DriverMonitoringSystem/1.0';
const TIMEOUT_MS = 8000;

// Standard speed limits by OSM highway type (km/h).
// Used when a road exists but has no explicit maxspeed tag.
const HIGHWAY_DEFAULTS = {
  motorway:        120,
  motorway_link:   100,
  trunk:           100,
  trunk_link:       80,
  primary:          80,
  primary_link:     70,
  secondary:        70,
  secondary_link:   60,
  tertiary:         50,
  tertiary_link:    50,
  unclassified:     50,
  residential:      40,
  living_street:    20,
  service:          30,
  road:             50,
};

function parseMpeed(raw) {
  if (!raw) return null;
  const m = raw.match(/^(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return raw.toLowerCase().includes('mph') ? Math.round(n * 1.60934) : n;
}

function overpassGet(query) {
  return new Promise((resolve) => {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Looks up the speed limit of the nearest road to (lat, lng).
 *
 * Returns:
 *   { limit: number, source: 'tagged'|'road_type', roadType?: string }
 *   or null if nothing found.
 */
async function getSpeedLimit(lat, lng) {
  const query = `[out:json][timeout:7];way(around:50,${lat},${lng})[highway];out tags 5;`;
  const data  = await overpassGet(query);

  if (!data?.elements?.length) return null;

  // 1. Prefer an explicit maxspeed tag
  for (const el of data.elements) {
    const limit = parseMpeed(el.tags?.maxspeed);
    if (limit != null) return { limit, source: 'tagged' };
  }

  // 2. Fall back to road-type default — pick the most common highway class
  const counts = {};
  for (const el of data.elements) {
    const t = el.tags?.highway;
    if (t && HIGHWAY_DEFAULTS[t] !== undefined) counts[t] = (counts[t] || 0) + 1;
  }

  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;

  return { limit: HIGHWAY_DEFAULTS[best[0]], source: 'road_type', roadType: best[0] };
}

module.exports = { getSpeedLimit };
