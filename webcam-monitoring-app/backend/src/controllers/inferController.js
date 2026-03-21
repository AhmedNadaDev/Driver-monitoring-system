const { validateInferBody } = require('../utils/validators');

function createInferController({ config, aiClient, eventLogger, cooldownManager, appState, io }) {
  return async function infer(req, res, next) {
    try {
      const validation = validateInferBody(req.body, { maxFrameBytes: config.MAX_FRAME_BYTES });
      if (!validation.ok) return res.status(400).json({ success: false, error: validation.error });

      const { imageBase64, imageMime, width, height } = req.body;

      const imageBuffer = Buffer.from(imageBase64, 'base64');

      // Forward to Python AI service.
      const predictions = await aiClient.predict({ imageBase64, imageMime, width, height });
      if (!predictions?.success) throw new Error('AI service returned unsuccessful response');

      const smokingPred = predictions.smoking || {};
      const drowsinessPred = predictions.drowsiness || {};

      const smokingLabel = smokingPred.detected ? smokingPred.label : 'none';
      const smokingConfidence = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : null;
      const drowsinessLabel = drowsinessPred.label || 'awake';
      const drowsinessConfidence =
        typeof drowsinessPred.confidence === 'number' ? drowsinessPred.confidence : null;

      // Update live app state regardless of whether we save snapshots.
      appState.smoking = { label: smokingLabel, confidence: smokingConfidence };
      appState.drowsiness = { label: drowsinessLabel, confidence: drowsinessConfidence };
      appState.lastEvents = eventLogger.getLastEvents();

      const livePayload = {
        aiServiceReachable: appState.aiServiceReachable,
        smoking: appState.smoking,
        drowsiness: appState.drowsiness,
        lastEvents: appState.lastEvents
      };
      io.emit('liveStatus', livePayload);

      const savedEvents = [];

      // Event detection + cooldown logic (per event type).
      const now = Date.now();
      if (smokingPred.detected && smokingPred.label === 'cigarettes') {
        const conf = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : 0;
        if (conf >= config.SMOKING_EVENT_MIN_CONF && cooldownManager.isAllowed('cigarettes', now)) {
          const record = await eventLogger.saveEvent({
            type: 'cigarettes',
            confidence: conf,
            source: 'webcam',
            model: 'smoking-model',
            imageBuffer,
            driverName: config.DRIVER_NAME
          });
          cooldownManager.markTriggered('cigarettes', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      if (smokingPred.detected && smokingPred.label === 'vape') {
        const conf = typeof smokingPred.confidence === 'number' ? smokingPred.confidence : 0;
        if (conf >= config.SMOKING_EVENT_MIN_CONF && cooldownManager.isAllowed('vape', now)) {
          const record = await eventLogger.saveEvent({
            type: 'vape',
            confidence: conf,
            source: 'webcam',
            model: 'smoking-model',
            imageBuffer,
            driverName: config.DRIVER_NAME
          });
          cooldownManager.markTriggered('vape', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      if (drowsinessPred.detected && drowsinessPred.label === 'drowsy') {
        const conf = typeof drowsinessPred.confidence === 'number' ? drowsinessPred.confidence : 0;
        if (conf >= config.DROWSY_EVENT_MIN_CONF && cooldownManager.isAllowed('drowsy', now)) {
          const record = await eventLogger.saveEvent({
            type: 'drowsy',
            confidence: conf,
            source: 'webcam',
            model: 'drowsiness-model',
            imageBuffer,
            driverName: config.DRIVER_NAME
          });
          cooldownManager.markTriggered('drowsy', now);
          savedEvents.push(record);
          io.emit('eventSaved', record);
        }
      }

      appState.lastEvents = eventLogger.getLastEvents();

      return res.json({
        success: true,
        aiServiceReachable: appState.aiServiceReachable,
        smoking: appState.smoking,
        drowsiness: appState.drowsiness,
        lastEvents: appState.lastEvents,
        savedEvents
      });
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = createInferController;

