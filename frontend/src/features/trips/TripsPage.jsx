import { Link } from 'react-router-dom'
import { Eye, ChevronRight, Search } from 'lucide-react'
import { trips } from '../../data/mockData.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'

const TripsPage = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{trips.length} trips recorded</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search trips..."
          className="h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
        />
      </div>
    </div>

    <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trip ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duration</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr
                key={t.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors group"
              >
                <td className="px-6 py-4">
                  <span className="font-semibold text-foreground font-mono text-xs">{t.id}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-foreground font-medium">{t.driverName}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-muted-foreground">{t.duration}</span>
                </td>
                <td className="px-6 py-4">
                  <ScoreBadge score={t.score} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-muted-foreground text-sm">{t.date}</span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`/trips/${t.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors group/link"
                  >
                    <Eye className="h-4 w-4" /> 
                    <span>View</span>
                    <ChevronRight className="h-3 w-3 opacity-0 -ml-1 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:hidden">
      {trips.map((t) => (
        <Link
          key={t.id}
          to={`/trips/${t.id}`}
          className="block rounded-2xl bg-card border border-border/40 p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{t.driverName}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {t.id} · {t.date}
              </p>
            </div>
            <ScoreBadge score={t.score} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{t.duration}</span>
              <span className={t.violations.length > 0 ? 'text-destructive' : 'text-success'}>
                {t.violations.length} violations
              </span>
            </div>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              View <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  </div>
)

export default TripsPage