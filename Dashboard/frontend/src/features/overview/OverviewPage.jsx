import { useState, useEffect } from 'react'
import { Users, Navigation2, Bus, Shield, AlertCircle, AlertTriangle, Info, Activity } from 'lucide-react'
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import StatCard from '../../shared/components/StatCard.jsx'
import { notifications, safetyScoreHistory } from '../../data/mockData.js'
import apiClient from '../../services/apiClient.js'

/* ── Violation type config ───────────────────────────────────────────── */
const V_CONFIG = {
  drowsy:          { label: 'Drowsy Driving',  color: '#f59e0b' },
  cellphone:       { label: 'Phone Use',       color: '#3b82f6' },
  cigarettes:      { label: 'Smoking',         color: '#f97316' },
  vape:            { label: 'Vaping',          color: '#a855f7' },
  no_belt:         { label: 'No Seat Belt',    color: '#ef4444' },
  hands_off_wheel: { label: 'Hands Off Wheel', color: '#06b6d4' },
}

/* ── Custom Pie tooltip ─────────────────────────────────────────────── */
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-xl bg-card border border-border/50 px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground mt-0.5">
        <span className="font-bold text-foreground">{d.value}</span> detections
      </p>
    </div>
  )
}

/* ── Custom Area tooltip ────────────────────────────────────────────── */
const AreaTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-card border border-border/50 px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">
        Score: <span className="font-bold text-foreground">{payload[0].value}</span>
      </p>
    </div>
  )
}

/* ── Component ──────────────────────────────────────────────────────── */
const OverviewPage = () => {
  const [routeCount,       setRouteCount]       = useState(null)
  const [busCount,         setBusCount]         = useState(null)
  const [driverCount,      setDriverCount]      = useState(null)
  const [avgScore,         setAvgScore]         = useState(null)
  const [violationData,    setViolationData]    = useState([])
  const [totalViolations,  setTotalViolations]  = useState(null)

  useEffect(() => {
    Promise.all([
      apiClient.get('/drivers').then((r) => r.data).catch(() => []),
      apiClient.get('/routes').then((r) => r.data).catch(() => []),
      apiClient.get('/buses').then((r) => r.data).catch(() => []),
      apiClient.get('/violations').then((r) => r.data).catch(() => []),
    ]).then(([drvs, rts, bss, viols]) => {
      /* Drivers */
      const driverList = Array.isArray(drvs) ? drvs : []
      setDriverCount(driverList.length)
      setRouteCount(Array.isArray(rts) ? rts.length : 0)
      setBusCount(Array.isArray(bss) ? bss.length : 0)

      /* Fleet avg score (drivers with at least 1 trip) */
      const withTrips = driverList.filter((d) => d.totalTrips > 0)
      setAvgScore(
        withTrips.length > 0
          ? Math.round(withTrips.reduce((s, d) => s + (d.avgScore || 0), 0) / withTrips.length)
          : driverList.length > 0 ? 100 : 0
      )

      /* Violations breakdown */
      const violList = Array.isArray(viols) ? viols : []
      setTotalViolations(violList.length)
      const counts = {}
      violList.forEach((v) => { counts[v.type] = (counts[v.type] || 0) + 1 })
      setViolationData(
        Object.entries(counts)
          .map(([type, count]) => ({
            type,
            count,
            name:  V_CONFIG[type]?.label  ?? type,
            color: V_CONFIG[type]?.color  ?? '#6b7280',
          }))
          .sort((a, b) => b.count - a.count)
      )
    })
  }, [])

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-children">
        <div className="animate-fade-up">
          <StatCard
            title="Total Drivers"
            value={driverCount ?? '—'}
            icon={Users}
            trend="Registered"
            trendUp
            variant="blue"
          />
        </div>
        <div className="animate-fade-up">
          <StatCard
            title="Total Routes"
            value={routeCount ?? '—'}
            icon={Navigation2}
            trend="Active bus lines"
            trendUp
            variant="emerald"
          />
        </div>
        <div className="animate-fade-up">
          <StatCard
            title="Total Buses"
            value={busCount ?? '—'}
            icon={Bus}
            trend="In fleet"
            trendUp
            variant="amber"
          />
        </div>
        <div className="animate-fade-up">
          <StatCard
            title="Avg Safety Score"
            value={avgScore ?? '—'}
            icon={Shield}
            trend="Fleet average"
            trendUp={avgScore !== null ? avgScore >= 80 : true}
            variant="rose"
          />
        </div>
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Safety score trend */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Fleet Safety Score Trend</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={safetyScoreHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                domain={[65, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                dx={-4}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(221 83% 53%)"
                strokeWidth={2.5}
                fill="url(#scoreGrad)"
                dot={{ fill: 'hsl(221 83% 53%)', strokeWidth: 2, stroke: 'white', r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(221 83% 53%)', strokeWidth: 2, stroke: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Violations by type */}
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">Violations by Type</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalViolations !== null ? `${totalViolations} total detections` : 'Loading…'}
            </p>
          </div>

          {violationData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={violationData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={70}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {violationData.map((e) => (
                      <Cell key={e.type} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-3 space-y-1.5">
                {violationData.map((e) => (
                  <div key={e.type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: e.color }}
                      />
                      <span className="text-muted-foreground font-medium">{e.name}</span>
                    </div>
                    <span className="font-bold text-foreground">{e.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {totalViolations === 0 ? 'No violations recorded yet' : 'Loading…'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Recent Alerts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest system notifications</p>
          </div>
          <button className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            View all
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {notifications.slice(0, 6).map((n) => {
            const isAlert   = n.type === 'alert'
            const isWarning = n.type === 'warning'
            return (
              <div
                key={n.id}
                className="group flex gap-3 rounded-xl p-3 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all duration-200 cursor-default"
              >
                <div
                  className={`mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                    isAlert
                      ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                      : isWarning
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                      : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
                  }`}
                >
                  {isAlert ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : isWarning ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground font-medium">{n.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default OverviewPage
