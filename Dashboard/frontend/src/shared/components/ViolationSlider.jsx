import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Camera, AlertCircle, MapPin, Gauge, Zap } from 'lucide-react'

const SENSOR_TYPES = ['speed_violation', 'harsh_braking']

const WEBCAM_URL = (import.meta.env.VITE_WEBCAM_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

const buildImageUrl = (imagePath) => {
  if (!imagePath) return null
  const clean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${WEBCAM_URL}${clean}`
}

const formatTime = (ts) => {
  if (!ts) return '—'
  try { return new Date(ts).toLocaleString() } catch { return '—' }
}

const formatConfidence = (conf) =>
  typeof conf === 'number' ? `${(conf * 100).toFixed(1)}%` : '—'

// ── Camera violation image panel ──────────────────────────────────────────────

function ViolationImage({ violation }) {
  const [status, setStatus] = useState('loading')
  const url = buildImageUrl(violation?.imagePath)
  useEffect(() => { setStatus(url ? 'loading' : 'error') }, [url])

  return (
    <div className="relative w-full h-full">
      {url && (
        <img
          src={url}
          alt={`${violation?.type ?? 'violation'} detection`}
          className={`w-full h-full object-cover transition-opacity duration-200 ${status === 'ok' ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setStatus('ok')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse">
          <Camera className="h-8 w-8 text-gray-600" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-800 text-gray-500">
          <AlertCircle className="h-7 w-7 opacity-40" />
          <span className="text-xs opacity-60">{url ? 'Image failed to load' : 'No image'}</span>
        </div>
      )}
    </div>
  )
}

// ── Sensor event card (speed_violation / harsh_braking) ───────────────────────

function SensorEventCard({ violation }) {
  const isSpeed = violation?.type === 'speed_violation'

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Icon + type header */}
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isSpeed ? 'bg-red-500/15' : 'bg-orange-500/15'
        }`}>
          {isSpeed
            ? <Gauge className="h-4.5 w-4.5 text-red-400" style={{ width: 18, height: 18 }} />
            : <Zap   className="h-4.5 w-4.5 text-orange-400" style={{ width: 18, height: 18 }} />
          }
        </div>
        <div>
          <p className={`text-sm font-semibold ${isSpeed ? 'text-red-300' : 'text-orange-300'}`}>
            {isSpeed ? 'Speed Violation' : 'Harsh Braking'}
          </p>
          <p className="text-[11px] text-gray-500">{formatTime(violation?.timestamp)}</p>
        </div>
      </div>

      {/* Speed info */}
      {isSpeed && violation?.speed != null && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <Gauge className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm font-bold text-red-300">{violation.speed} km/h</span>
          {violation?.speedLimit != null && (
            <span className="text-xs text-gray-400">· limit {violation.speedLimit} km/h</span>
          )}
        </div>
      )}

      {/* Location */}
      {(violation?.locationName || violation?.location?.lat != null) && (
        <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-0.5">
            {violation?.locationName ? (
              <p className="text-sm font-medium text-gray-200">{violation.locationName}</p>
            ) : (
              <p className="text-xs font-mono text-gray-400">
                {violation.location.lat?.toFixed(5)}, {violation.location.lng?.toFixed(5)}
              </p>
            )}
            {violation?.locationAddress && violation.locationAddress !== violation.locationName && (
              <p className="text-xs text-gray-400 leading-tight">{violation.locationAddress}</p>
            )}
            {violation?.location?.lat != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${violation.location.lat}&mlon=${violation.location.lng}&zoom=16`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                View on map ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* No location fallback */}
      {!violation?.locationName && violation?.location?.lat == null && (
        <p className="text-xs text-gray-600 italic">No location recorded</p>
      )}
    </div>
  )
}

// ── Main ViolationSlider ──────────────────────────────────────────────────────

const ViolationSlider = ({ violations = [] }) => {
  const [idx, setIdx] = useState(0)

  const safeIdx = Math.min(idx, Math.max(0, violations.length - 1))
  const total   = violations.length

  if (!total) return null

  const v    = violations[safeIdx]
  const prev = () => setIdx((i) => Math.max(0, i - 1))
  const next = () => setIdx((i) => Math.min(total - 1, i + 1))

  const isSensor = SENSOR_TYPES.includes(v?.type)

  // ── Sensor violations: clean card, no image area ──────────────────────────
  if (isSensor) {
    return (
      <div className="rounded-xl overflow-hidden bg-gray-900 shadow-inner">
        <SensorEventCard violation={v} />

        {/* Navigation between multiple events */}
        {total > 1 && (
          <div className="flex items-center justify-between border-t border-gray-700/60 px-3 py-2">
            <button
              onClick={prev}
              disabled={safeIdx === 0}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="text-xs text-gray-500">{safeIdx + 1} / {total}</span>
            <button
              onClick={next}
              disabled={safeIdx === total - 1}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Dot indicators */}
        {total > 1 && total <= 8 && (
          <div className="flex justify-center gap-1 pb-2">
            {violations.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Camera violations: image slider (unchanged) ───────────────────────────
  return (
    <div className="rounded-xl overflow-hidden bg-gray-900 shadow-inner">
      <div className="relative aspect-video bg-gray-800 select-none">
        <ViolationImage key={v._id ?? safeIdx} violation={v} />

        {total > 1 && (
          <>
            <button
              onClick={prev}
              disabled={safeIdx === 0}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              disabled={safeIdx === total - 1}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 z-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute top-2 right-2 z-10 bg-black/60 rounded-md px-2 py-0.5 text-xs text-white font-medium">
              {safeIdx + 1}&nbsp;/&nbsp;{total}
            </div>
          </>
        )}

        <div className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 pointer-events-none">
          <p className="text-white text-xs font-semibold">
            Confidence: {formatConfidence(v?.confidence)}
          </p>
          <p className="text-gray-300 text-xs mt-0.5">{formatTime(v?.timestamp)}</p>
        </div>
      </div>

      {total > 1 && total <= 8 && (
        <div className="flex justify-center gap-1 py-2 bg-gray-900">
          {violations.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIdx ? 'w-4 bg-white' : 'w-1.5 bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ViolationSlider
