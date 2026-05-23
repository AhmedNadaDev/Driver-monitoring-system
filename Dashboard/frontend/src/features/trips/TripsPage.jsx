import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ChevronRight, Search, Loader2, Car } from 'lucide-react'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'

const BACKEND  = import.meta.env.VITE_BACKEND_URL || ''
const NGROK_H  = { 'ngrok-skip-browser-warning': 'true' }

function formatDuration(start, end) {
  if (!start) return '—'
  const ms = (end ? new Date(end) : new Date()) - new Date(start)
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1)  return '<1m'
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch { return '—' }
}

const TripsPage = () => {
  const [trips,   setTrips]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    fetch(`${BACKEND}/api/trips`, { headers: NGROK_H })
      .then((r) => r.json())
      .then((data) => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = trips.filter((t) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (t.driver?.name  || '').toLowerCase().includes(q) ||
      (t.driver?.id    || '').toLowerCase().includes(q) ||
      (t.route?.name   || '').toLowerCase().includes(q) ||
      (t.bus?.busId    || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">
            {loading ? 'Loading…' : `${filtered.length} trip${filtered.length !== 1 ? 's' : ''} recorded`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trips…"
            className="h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Loading trips…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border/40 p-16 text-center shadow-sm">
          <Car className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {trips.length === 0 ? 'No trips recorded yet.' : 'No trips match your search.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t._id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{t.driver?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground font-mono">{t.driver?.id || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">{t.route?.name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground">{formatDuration(t.startTime, t.endTime)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreBadge score={t.score ?? 100} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-muted-foreground text-sm">{formatDate(t.startTime)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {t.driver?._id ? (
                          <Link
                            to={`/drivers/${t.driver._id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group/link"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Driver</span>
                            <ChevronRight className="h-3 w-3 opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all" />
                          </Link>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-4 sm:hidden">
            {filtered.map((t) => (
              <div
                key={t._id}
                className="rounded-2xl bg-card border border-border/40 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{t.driver?.name || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {t.driver?.id || ''} · {formatDate(t.startTime)}
                    </p>
                  </div>
                  <ScoreBadge score={t.score ?? 100} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDuration(t.startTime, t.endTime)}</span>
                    <span className={(t.violations?.length || 0) > 0 ? 'text-destructive' : 'text-emerald-500'}>
                      {t.violations?.length || 0} violation{(t.violations?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {t.driver?._id && (
                    <Link
                      to={`/drivers/${t.driver._id}`}
                      className="text-sm font-medium text-primary flex items-center gap-1"
                    >
                      Driver <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default TripsPage
