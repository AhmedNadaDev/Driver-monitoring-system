const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const config = require('./config/env');
const AiClient = require('./services/aiClient');
const CooldownManager = require('./services/cooldownManager');
const EventLogger = require('./services/eventLogger');

const createInferController = require('./controllers/inferController');
const createHealthController = require('./controllers/healthController');
const createStatusController = require('./controllers/statusController');
const createLogsController = require('./controllers/logsController');
const createLastEventsController = require('./controllers/lastEventsController');
const errorHandler = require('./middleware/errorHandler');

// backend/src/index.js -> project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

async function main() {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.FRONTEND_ORIGIN,
      credentials: true
    })
  );

  // Snapshots live under `<project>/storage/snapshots/...`.
  app.use('/storage', express.static(path.join(PROJECT_ROOT, 'storage')));

  app.use(express.json({ limit: '25mb' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.FRONTEND_ORIGIN,
      credentials: true
    }
  });

  const appState = {
    aiServiceReachable: null,
    smoking: { label: 'none', confidence: null },
    drowsiness: { label: 'awake', confidence: null },
    lastEvents: null
  };

  const eventLogger = new EventLogger({
    snapshotBaseDir: config.SNAPSHOT_BASE_DIR,
    logsBaseDir: config.LOGS_BASE_DIR
  });
  await eventLogger.init();
  appState.lastEvents = eventLogger.getLastEvents();

  const cooldownManager = new CooldownManager(config.EVENT_COOLDOWN_MS);

  const aiClient = new AiClient({
    aiServiceUrl: config.AI_SERVICE_URL,
    healthPath: config.AI_HEALTH_PATH,
    predictPath: config.AI_PREDICT_PATH
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

  const healthController = createHealthController({ appState });
  const statusController = createStatusController({ appState });
  const logsController = createLogsController({ eventLogger });
  const lastEventsController = createLastEventsController({ eventLogger });

  const inferController = createInferController({
    config,
    aiClient,
    eventLogger,
    cooldownManager,
    appState,
    io
  });

  io.on('connection', (socket) => {
    socket.emit('liveStatus', {
      aiServiceReachable: appState.aiServiceReachable,
      smoking: appState.smoking,
      drowsiness: appState.drowsiness,
      lastEvents: appState.lastEvents
    });
  });

  const inferLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.INFER_RATE_LIMIT_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.get('/api/health', healthController);
  app.get('/api/status', statusController);
  app.get('/api/logs/:type', logsController);
  app.get('/api/last-events', lastEventsController);
  app.post('/api/infer', inferLimiter, inferController);

  app.use(errorHandler);

  const port = config.BACKEND_PORT;
  app.listen(port, () => {
    console.log(`[backend] listening on http://localhost:${port}`);
    console.log(`[backend] storage snapshots: ${config.SNAPSHOT_BASE_DIR}`);
  });

  // Ensure we have the runtime storage directories even if user deletes them.
  await fs.ensureDir(config.SNAPSHOT_BASE_DIR);
  await fs.ensureDir(config.LOGS_BASE_DIR);
}

main().catch((err) => {
  console.error('[backend] failed to start:', err);
  process.exit(1);
});

