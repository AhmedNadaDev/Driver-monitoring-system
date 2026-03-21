const StatCard = ({ title, value, icon: Icon, trend, trendUp, variant = 'blue' }) => {
  const gradientMap = {
    blue: 'stat-gradient-blue',
    emerald: 'stat-gradient-emerald',
    amber: 'stat-gradient-amber',
    rose: 'stat-gradient-rose',
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 border border-border/40">
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent transform translate-x-8 -translate-y-8" />
      
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {trend && (
            <p
              className={`text-xs font-semibold flex items-center gap-1 ${
                trendUp ? 'text-success' : 'text-destructive'
              }`}
            >
              <span className="text-[10px]">{trendUp ? '↑' : '↓'}</span>
              {trend}
            </p>
          )}
        </div>
        
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${gradientMap[variant]} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  )
}

export default StatCard