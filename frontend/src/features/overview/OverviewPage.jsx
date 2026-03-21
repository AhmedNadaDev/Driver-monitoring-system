import { Users, MapPin, Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import StatCard from '../../shared/components/StatCard.jsx'
import { drivers, trips, notifications, safetyScoreHistory } from '../../data/mockData.js'

const OverviewPage = () => {
  const totalDrivers = drivers.length
  const totalTrips = trips.length
  const avgScore = Math.round(drivers.reduce((s, d) => s + d.avgScore, 0) / drivers.length)
  const totalViolations = trips.reduce((s, t) => s + t.violations.length, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          title="Total Drivers" 
          value={totalDrivers} 
          icon={Users} 
          trend="2 this month" 
          trendUp 
          variant="blue"
        />
        <StatCard 
          title="Total Trips" 
          value={totalTrips} 
          icon={MapPin} 
          trend="12% vs last month" 
          trendUp 
          variant="emerald"
        />
        <StatCard 
          title="Avg Safety Score" 
          value={avgScore} 
          icon={Shield} 
          trend="3.2% improvement" 
          trendUp 
          variant="amber"
        />
        <StatCard
          title="Total Violations"
          value={totalViolations}
          icon={AlertTriangle}
          trend="8 this week"
          trendUp={false}
          variant="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Fleet Safety Score Trend</h2>
              <p className="text-sm text-muted-foreground mt-1">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={safetyScoreHistory}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                domain={[65, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                  background: 'hsl(0 0% 100%)',
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: 'hsl(222 47% 11%)',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="hsl(221 83% 53%)"
                strokeWidth={3}
                fill="url(#scoreGrad)"
                dot={{ fill: 'hsl(221 83% 53%)', strokeWidth: 2, stroke: 'hsl(0 0% 100%)', r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(221 83% 53%)', strokeWidth: 2, stroke: 'hsl(0 0% 100%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Notifications</h2>
            <p className="text-sm text-muted-foreground mt-1">Latest alerts and updates</p>
          </div>
          <div className="space-y-3 -mx-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="group flex gap-3 rounded-xl p-3 hover:bg-muted/50 transition-all duration-200 -mx-1">
                <div
                  className={`mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-lg ${
                    n.type === 'alert'
                      ? 'bg-red-50 text-red-500 dark:bg-red-500/10'
                      : n.type === 'warning'
                      ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                      : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10'
                  }`}
                >
                  {n.type === 'alert' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : n.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-relaxed line-clamp-2">{n.message}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground font-medium">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewPage