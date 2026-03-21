import { Link } from 'react-router-dom'
import { Plus, Eye, ChevronRight, Search } from 'lucide-react'
import { drivers } from '../../data/mockData.js'
import ScoreBadge from '../../shared/components/ScoreBadge.jsx'

const DriversPage = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{drivers.length} drivers registered</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drivers..."
            className="h-10 pl-10 pr-4 rounded-xl bg-muted/50 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-64"
          />
        </div>
        <Link
          to="/drivers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
        >
          <Plus className="h-4 w-4" /> Add Driver
        </Link>
      </div>
    </div>

    <div className="rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Score</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Trips</th>
              <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((d, idx) => (
              <tr
                key={d.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                      {d.avatar}
                    </div>
                    <span className="font-semibold text-foreground">{d.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-muted-foreground font-mono text-xs">{d.id}</span>
                </td>
                <td className="px-6 py-4">
                  <ScoreBadge score={d.avgScore} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-muted-foreground">{d.totalTrips}</span>
                </td>
                <td className="px-6 py-4">
                  <Link
                    to={`/drivers/${d.id}`}
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
      {drivers.map((d) => (
        <Link
          key={d.id}
          to={`/drivers/${d.id}`}
          className="block rounded-2xl bg-card border border-border/40 p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary">
                {d.avatar}
              </div>
              <div>
                <p className="font-semibold text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{d.id}</p>
              </div>
            </div>
            <ScoreBadge score={d.avgScore} />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <span className="text-sm text-muted-foreground">{d.totalTrips} trips</span>
            <span className="text-sm font-medium text-primary flex items-center gap-1">
              View details <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  </div>
)

export default DriversPage