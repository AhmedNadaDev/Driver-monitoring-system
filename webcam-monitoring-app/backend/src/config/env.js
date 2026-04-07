const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// backend/src/config/env.js -> project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function resolvePathFromRoot(value, fallbackRelative) {
  if (value === undefined || value === null || value === '') return path.resolve(PROJECT_ROOT, fallbackRelative);
  if (path.isAbsolute(value)) return value;
  return path.resolve(PROJECT_ROOT, value);
}

const env = {
  BACKEND_PORT: Number(process.env.BACKEND_PORT || 5000),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  DRIVER_NAME: process.env.DRIVER_NAME || 'Ahmed',

  EVENT_COOLDOWN_MS: Number(process.env.EVENT_COOLDOWN_MS || 10000),

  SMOKING_EVENT_MIN_CONF: Number(process.env.SMOKING_EVENT_MIN_CONF || 0.3),
  DROWSY_EVENT_MIN_CONF: Number(process.env.DROWSY_EVENT_MIN_CONF || 0.35),
  CELLPHONE_EVENT_MIN_CONF: Number(process.env.CELLPHONE_EVENT_MIN_CONF || 0.3),
  BELT_EVENT_MIN_CONF: Number(process.env.BELT_EVENT_MIN_CONF || 0.3),

  MAX_FRAME_BYTES: Number(process.env.MAX_FRAME_BYTES || 400000),

  SNAPSHOT_BASE_DIR: resolvePathFromRoot(process.env.SNAPSHOT_BASE_DIR, 'storage/snapshots'),
  LOGS_BASE_DIR: resolvePathFromRoot(process.env.LOGS_BASE_DIR, 'storage/logs'),

  // Python inference endpoint
  AI_HEALTH_PATH: process.env.AI_HEALTH_PATH || '/health',
  AI_PREDICT_PATH: process.env.AI_PREDICT_PATH || '/predict',

  // How to protect the backend from accidental large payloads / abuse
  INFER_RATE_LIMIT_PER_MIN: Number(process.env.INFER_RATE_LIMIT_PER_MIN || 60)
};

module.exports = env;

