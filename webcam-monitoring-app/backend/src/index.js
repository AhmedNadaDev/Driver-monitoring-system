const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const config = require('./config/env');
const { connectDB } = require('./db/connect');
const AiClient = require('./services/aiClient');
const CooldownManager = require('./services/cooldownManager');
const EventLogger = require('./services/eventLogger');

const createInferController = require('./controllers/inferController');
const createHealthController = require('./controllers/healthController');
const createStatusController = require('./controllers/statusController');
const createLogsController = require('./controllers/logsController');
const createLastEventsController = require('./controllers/lastEventsController');
const { createSafetyEventController, getSafetyEvents } = require('./controllers/safetyEventController');
const { getSpeedLimit } = require('./services/speedLimitService');
const { startTrip, stopTrip } = require('./controllers/tripController');
const { getDrivers, getRoutes, getBuses } = require('./controllers/dataController');
const alertsRouter = require('./routes/alerts');
const errorHandler = require('./middleware/errorHandler');

// backend/src/index.js is in webcam-monitoring-app/backend/src/
// Two levels up reaches the webcam-monitoring-app root (where storage/ lives).
const APP_ROOT = path.resolve(__dirname, '../..');

async function main() {
  // ── Connect to MongoDB ───────────────────────────────────────────────────
  await connectDB(config.MONGO_URI);

  const app = express();
  app.disable('x-powered-by');

  // ── CORS ───────────────────────────────────────────────────────────────────
  // origin: true  →  echo back whatever Origin the browser sends.
  // Safe because this backend is only reachable via the private ngrok URL.
  // Compatible with credentials:true (unlike wildcard '*').
  const CORS_OPTIONS = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  };

  // Preflight must be handled BEFORE any other middleware.
  app.options('*', cors(CORS_OPTIONS));
  app.use(cors(CORS_OPTIONS));

  // ── Debug logging (remove once deployment is stable) ──────────────────────
  app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.path}  origin: ${req.headers.origin || '(none)'}`);
    next();
  });

  // Serve snapshot images.  Allow any origin so <img> tags in any frontend
  // (dashboard at :5173, webcam UI at :5174) can load images without CORS errors.
  app.use('/storage', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(path.join(APP_ROOT, 'storage')));

  app.use(express.json({ limit: '25mb' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
    },
  });

  const appState = {
    aiServiceReachable: null,
    smoking:    { label: 'none',   confidence: null },
    drowsiness: { label: 'awake',  confidence: null },
    belt:       { label: 'belt',   confidence: null },
    cellphone:  { label: 'none',   confidence: null },
    steering:   { label: 'hands_on_wheel', confidence: null },
    lastEvents: null,
  };

  // ── Alert config (injected wherever needed) ─────────────────────────────
  const alertConfig = {
    N8N_WEBHOOK_URL:      config.N8N_WEBHOOK_URL,
    ALERT_ENABLED:        config.ALERT_ENABLED,
    ALERT_MIN_CONFIDENCE: config.ALERT_MIN_CONFIDENCE,
  };

  // Make alertConfig available to Express routes via app.get('alertConfig')
  app.set('alertConfig', alertConfig);

  if (alertConfig.ALERT_ENABLED && alertConfig.N8N_WEBHOOK_URL) {
    console.log(`[alerts] Smart Alerts enabled — forwarding to: ${alertConfig.N8N_WEBHOOK_URL}`);
    console.log(`[alerts] Minimum confidence threshold: ${alertConfig.ALERT_MIN_CONFIDENCE}`);
  } else if (!alertConfig.N8N_WEBHOOK_URL) {
    console.log('[alerts] Smart Alerts inactive — set N8N_WEBHOOK_URL in .env to enable.');
  } else {
    console.log('[alerts] Smart Alerts disabled via ALERT_ENABLED=false.');
  }

  // EventLogger no longer needs logsBaseDir (JSON files are replaced by MongoDB).
  const eventLogger = new EventLogger({
    snapshotBaseDir: config.SNAPSHOT_BASE_DIR,
  });
  await eventLogger.init();
  appState.lastEvents = eventLogger.getLastEvents();

  const cooldownManager = new CooldownManager(config.EVENT_COOLDOWN_MS);

  const aiClient = new AiClient({
    aiServiceUrl: config.AI_SERVICE_URL,
    healthPath:   config.AI_HEALTH_PATH,
    predictPath:  config.AI_PREDICT_PATH,
  });

  async function refreshAiHealth() {
    try {
      await aiClient.checkHealth();
      appState.aiServiceReachable = true;
    } catch {
      appState.aiServiceReachable = false;
    }
  }

  await refreshAiHealth();
  setInterval(refreshAiHealth, 5000).unref();

  // ── Controller setup ─────────────────────────────────────────────────────
  const healthController     = createHealthController({ appState });
  const statusController     = createStatusController({ appState });
  const logsController       = createLogsController({ eventLogger });
  const lastEventsController = createLastEventsController({ eventLogger });

  const inferController = createInferController({
    config,
    aiClient,
    eventLogger,
    cooldownManager,
    appState,
    io,
    alertConfig,
  });

  const safetyEventController = createSafetyEventController({ io });

  // ── Socket.IO ────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    socket.emit('liveStatus', {
      aiServiceReachable: appState.aiServiceReachable,
      smoking:    appState.smoking,
      drowsiness: appState.drowsiness,
      belt:       appState.belt,
      cellphone:  appState.cellphone,
      steering:   appState.steering,
      lastEvents: appState.lastEvents,
    });
  });

  // ── Rate limiter ─────────────────────────────────────────────────────────
  const inferLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit:    config.INFER_RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders:   false,
  });

  // ── Routes: existing ─────────────────────────────────────────────────────
  app.get('/api/health',        healthController);
  app.get('/api/status',        statusController);
  app.get('/api/logs/:type',    logsController);
  app.get('/api/last-events',   lastEventsController);
  app.post('/api/infer',        inferLimiter, inferController);

  // ── Routes: trips ────────────────────────────────────────────────────────
  app.post('/api/trips/start',   startTrip);
  app.post('/api/trips/stop/:id', stopTrip);

  // ── Routes: data (drivers / routes / buses) from shared MongoDB ──────────
  app.get('/api/drivers', getDrivers);
  app.get('/api/routes',  getRoutes);
  app.get('/api/buses',   getBuses);

  // ── Routes: Driving safety events (GPS + harsh braking) ─────────────────
  app.get('/api/safety-events',  getSafetyEvents);
  app.post('/api/safety-events', safetyEventController);

  // ── Route: Speed limit lookup via OpenStreetMap Overpass ─────────────────
  app.get('/api/speed-limit', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params are required' });
    }
    try {
      const result = await getSpeedLimit(lat, lng);
      return res.json(result ?? { limit: null });
    } catch {
      return res.json({ limit: null });
    }
  });

  // ── Routes: Smart Alerts ─────────────────────────────────────────────────
  app.use('/api/alerts', alertsRouter);

  app.use(errorHandler);

  // ── Ensure snapshot directories exist ────────────────────────────────────
  await fs.ensureDir(config.SNAPSHOT_BASE_DIR);

  const port = config.BACKEND_PORT;
  server.listen(port, () => {
    console.log(`[backend] listening on http://localhost:${port}`);
    console.log(`[backend] storage snapshots: ${config.SNAPSHOT_BASE_DIR}`);
  });
}

main().catch((err) => {
  console.error('[backend] failed to start:', err);
  process.exit(1);
});
