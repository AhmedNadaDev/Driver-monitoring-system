import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Calendar, Car, Shield } from 'lucide-react'
import { drivers, trips } from '../../data/mockData.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'

const DriverDetailsPage = () => {
  const { id } = useParams()
  const driver = drivers.find((d) => d.id === id)
  const driverTrips = trips.filter((t) => t.driverId === id)

  if (!driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold text-foreground">Driver not found</p>
          <p className="text-sm text-muted-foreground">The driver you're looking for doesn't exist.</p>
          <Link
            to="/drivers"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Drivers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/drivers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Drivers
      </Link>

      <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary">
            {driver.avatar}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{driver.name}</h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">{driver.id}</p>
          </div>
          <ScoreBadge score={driver.avgScore} size="md" />
        </div>
        
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Safety Score</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{driver.avgScore}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Total Trips</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{driver.totalTrips}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">This Month</span>
            </div>
            <p className="text-2xl font-bold text-foreground">12</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-6">Recent Trips</h3>
        {driverTrips.length === 0 ? (
          <div className="text-center py-8">
            <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No trips found for this driver.</p>
          </div>
        ) : (
          <div className="space-y-3 -mx-2">
            {driverTrips.map((t) => (
              <Link
                key={t.id}
                to={`/trips/${t.id}`}
                className="flex items-center justify-between rounded-xl p-4 hover:bg-muted/50 transition-all group -mx-2"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Car className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t.id}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{t.date}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{t.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-medium ${t.violations.length > 0 ? 'text-destructive' : 'text-success'}`}>
                      {t.violations.length} violations
                    </span>
                  </div>
                  <ScoreBadge score={t.score} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DriverDetailsPage