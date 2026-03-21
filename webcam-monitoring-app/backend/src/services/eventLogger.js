const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { toUTCDateParts, toFilenameTimestamp } = require('../utils/time');

const EVENT_TYPES = ['cigarettes', 'vape', 'drowsy'];

class EventLogger {
  constructor({ snapshotBaseDir, logsBaseDir }) {
    this.snapshotBaseDir = snapshotBaseDir;
    this.logsBaseDir = logsBaseDir;

    this.lastEventByType = {};
    this.writeChainByType = {};
  }

  async init() {
    await fs.ensureDir(this.snapshotBaseDir);
    await fs.ensureDir(this.logsBaseDir);

    for (const type of EVENT_TYPES) {
      const snapshotDir = path.join(this.snapshotBaseDir, type);
      await fs.ensureDir(snapshotDir);

      const logPath = this._logFilePath(type);
      const exists = await fs.pathExists(logPath);
      if (!exists) await fs.writeJson(logPath, [], { spaces: 2 });

      // Load last event so `/api/last-events` is meaningful after restarts.
      try {
        const events = await fs.readJson(logPath);
        if (Array.isArray(events) && events.length > 0) {
          this.lastEventByType[type] = events[events.length - 1];
        }
      } catch {
        // If corruption occurs, reset that file to keep the service running.
        await fs.writeJson(logPath, [], { spaces: 2 });
      }
    }
  }

  _logFilePath(type) {
    return path.join(this.logsBaseDir, `${type}.json`);
  }

  _snapshotFilePath(type, filename) {
    return path.join(this.snapshotBaseDir, type, filename);
  }

  _snapshotRelativePath(filename, type) {
    // Required to match the structure in the JSON logs.
    return path.posix.join('storage', 'snapshots', type, filename);
  }

  getLastEvents() {
    const cigarettes = this.lastEventByType.cigarettes || null;
    const vape = this.lastEventByType.vape || null;
    const drowsy = this.lastEventByType.drowsy || null;
    const last =
      cigarettes?.timestamp || vape?.timestamp || drowsy?.timestamp
        ? [cigarettes, vape, drowsy].filter(Boolean).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;
    return { cigarettes, vape, drowsy, last };
  }

  async saveEvent({ type, confidence, source, model, imageBuffer, driverName }) {
    if (!EVENT_TYPES.includes(type)) throw new Error(`Invalid event type: ${type}`);

    const ts = new Date();
    const { date, time } = toUTCDateParts(ts);
    const filenameBase = `${type}_${toFilenameTimestamp(ts)}_${uuidv4().slice(0, 8)}`;
    const filename = `${filenameBase}.png`;

    const record = {
      id: uuidv4(),
      object: type,
      date,
      time,
      timestamp: ts.toISOString(),
      photo: this._snapshotRelativePath(filename, type),
      confidence: Number(confidence),
      source: source || 'webcam',
      model: model || null,
      driverName: driverName || 'Ahmed'
    };

    // Convert and persist snapshot only when we know the event is meaningful.
    const outPath = this._snapshotFilePath(type, filename);
    await sharp(imageBuffer).png().toFile(outPath);

    // Append to the corresponding JSON log file with a per-type write queue.
    const logPath = this._logFilePath(type);
    if (!this.writeChainByType[type]) this.writeChainByType[type] = Promise.resolve();
    this.writeChainByType[type] = this.writeChainByType[type].then(async () => {
      const events = await fs.readJson(logPath);
      const arr = Array.isArray(events) ? events : [];
      arr.push(record);
      await fs.writeJson(logPath, arr, { spaces: 2 });
    });
    await this.writeChainByType[type];

    this.lastEventByType[type] = record;
    return record;
  }

  async readLogs(type) {
    if (!EVENT_TYPES.includes(type)) throw new Error('Invalid log type');
    const logPath = this._logFilePath(type);
    const events = await fs.readJson(logPath);
    return Array.isArray(events) ? events : [];
  }
}

module.exports = EventLogger;

