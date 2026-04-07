import { useEffect, useMemo, useRef, useState } from 'react';
import StatusPanel from '../components/StatusPanel.jsx';
import { createSocket } from '../lib/socket.js';

const DEFAULT_INFERENCE_INTERVAL_MS = 500;
const DEFAULT_CAPTURE_QUALITY = 0.75;
const DEFAULT_CAPTURE_MAX_EDGE = 960;

export default function WebcamMonitorPage() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const driverName = 'Ahmed';
  const inferenceIntervalMs = Number(
    import.meta.env.VITE_INFERENCE_INTERVAL_MS || DEFAULT_INFERENCE_INTERVAL_MS
  );
  const captureQuality = Number(import.meta.env.VITE_CAPTURE_QUALITY || DEFAULT_CAPTURE_QUALITY);
  const captureMaxEdge = Number(
    import.meta.env.VITE_CAPTURE_MAX_EDGE || DEFAULT_CAPTURE_MAX_EDGE
  );

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const sendingRef = useRef(false);

  const [backendConnected, setBackendConnected] = useState(false);
  const [aiReachable, setAiReachable] = useState(null);

  const [cameraActive, setCameraActive] = useState(false);

  const [smoking, setSmoking] = useState({ label: 'none', confidence: null });
  const [alertness, setAlertness] = useState({ label: 'awake', confidence: null });
  const [belt, setBelt] = useState({ label: 'belt', confidence: null });
  const [cellphone, setCellphone] = useState({ label: 'none', confidence: null });
  const [lastEvent, setLastEvent] = useState(null);

  const socket = useMemo(() => createSocket(backendUrl), [backendUrl]);

  useEffect(() => {
    socketRef.current = socket;

    socket.on('connect', () => setBackendConnected(true));
    socket.on('disconnect', () => setBackendConnected(false));
    socket.on('connect_error', () => setBackendConnected(false));

    socket.on('liveStatus', (payload) => {
      if (!payload) return;
      if (typeof payload.aiServiceReachable === 'boolean') setAiReachable(payload.aiServiceReachable);

      if (payload.smoking) {
        setSmoking({
          label: payload.smoking.label || 'none',
          confidence: payload.smoking.confidence ?? null
        });
      }

      if (payload.drowsiness) {
        setAlertness({
          label: payload.drowsiness.label || 'awake',
          confidence: payload.drowsiness.confidence ?? null
        });
      }

      if (payload.belt) {
        setBelt({
          label: payload.belt.label || 'no_belt',
          confidence: payload.belt.confidence ?? null
        });
      }

      if (payload.cellphone) {
        setCellphone({
          label: payload.cellphone.label || 'none',
          confidence: payload.cellphone.confidence ?? null
        });
      }

      if (payload.lastEvents?.last) setLastEvent(payload.lastEvents.last);
    });

    socket.on('eventSaved', (event) => {
      if (event?.timestamp) setLastEvent(event);
    });

    return () => {
      socket.off();
      socket.close();
    };
  }, [socket]);

  useEffect(() => {
    // Prime the page with whatever backend knows right now.
    const controller = new AbortController();
    async function prime() {
      try {
        const res = await fetch(`${backendUrl}/api/status`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.aiServiceReachable === 'boolean') setAiReachable(data.aiServiceReachable);
        if (data.smoking) setSmoking({ label: data.smoking.label, confidence: data.smoking.confidence });
        if (data.drowsiness) setAlertness({ label: data.drowsiness.label, confidence: data.drowsiness.confidence });
        if (data.belt) setBelt({ label: data.belt.label, confidence: data.belt.confidence });
        if (data.cellphone) setCellphone({ label: data.cellphone.label, confidence: data.cellphone.confidence });
        if (data.lastEvents?.last) setLastEvent(data.lastEvents.last);
      } catch {
        // Ignore; socket will update soon.
      }
    }
    prime();
    return () => controller.abort();
  }, [backendUrl]);

  useEffect(() => {
    let stream;
    async function startCamera() {
      try {
        const constraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!videoRef.current) throw new Error('video ref missing');

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      } catch {
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraActive) return;
    const timer = setInterval(() => {
      void sendFrame();
    }, inferenceIntervalMs);
    return () => clearInterval(timer);
  }, [cameraActive, inferenceIntervalMs]);

  async function sendFrame() {
    if (sendingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    sendingRef.current = true;
    try {
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const maxEdge = Math.max(vw, vh);
      const scale = Math.min(1, captureMaxEdge / maxEdge);
      const tw = Math.max(1, Math.round(vw * scale));
      const th = Math.max(1, Math.round(vh * scale));

      canvas.width = tw;
      canvas.height = th;
      ctx.drawImage(video, 0, 0, tw, th);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to encode frame'));
          },
          'image/jpeg',
          captureQuality
        );
      });

      if (!blob || blob.size === 0) return;
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read frame'));
        reader.readAsDataURL(blob);
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${backendUrl}/api/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          imageMime: 'image/jpeg',
          width: tw,
          height: th
        }),
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) return;

      const data = await res.json();
      if (typeof data.aiServiceReachable === 'boolean') setAiReachable(data.aiServiceReachable);
      if (data.smoking) setSmoking({ label: data.smoking.label, confidence: data.smoking.confidence });
      if (data.drowsiness) setAlertness({ label: data.drowsiness.label, confidence: data.drowsiness.confidence });
      if (data.belt) setBelt({ label: data.belt.label, confidence: data.belt.confidence });
      if (data.cellphone) setCellphone({ label: data.cellphone.label, confidence: data.cellphone.confidence });
      if (Array.isArray(data.savedEvents) && data.savedEvents.length > 0) {
        setLastEvent(data.savedEvents[data.savedEvents.length - 1]);
      }
    } catch {
      // Do not break the UI if one inference fails.
    } finally {
      sendingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-3 rounded-xl border border-gray-800 bg-gray-900/40 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">Driver Information</div>
          <div className="mt-1 text-sm text-gray-200">
            Driver Name: <span className="font-semibold">{driverName}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-3">
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="text-sm text-gray-300">
              Webcam monitoring
              {!cameraActive ? ' (starting…)' : ''}
            </div>
            <div className="text-xs text-gray-500">Inference: {inferenceIntervalMs}ms</div>
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl bg-black object-cover aspect-video"
          />
        </div>

        <StatusPanel
          backendConnected={backendConnected}
          aiReachable={aiReachable}
          cameraActive={cameraActive}
          smokingLabel={smoking.label}
          smokingConfidence={smoking.confidence}
          alertnessLabel={alertness.label}
          alertnessConfidence={alertness.confidence}
          beltLabel={belt.label}
          beltConfidence={belt.confidence}
          cellphoneLabel={cellphone.label}
          cellphoneConfidence={cellphone.confidence}
          lastEvent={lastEvent}
        />
      </div>
    </div>
  );
}

