import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, History, Loader2, Search, ShieldAlert } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import * as historyApi from '../../services/historyApi.js'
import { TableSkeleton } from '../../shared/components/Skeleton.jsx'
import EmptyState from '../../shared/components/EmptyState.jsx'

const ACTION_LABELS = {
  LOGIN: 'Login',
  LOGIN_FAILED: 'Failed login',
  LOGOUT: 'Logout',
  LOGOUT_ALL: 'Logout all sessions',
  TOKEN_REFRESH: 'Token refresh',
  PASSWORD_CHANGE: 'Password change',
  PASSWORD_RESET: 'Password reset',
  PROFILE_UPDATE: 'Profile update',
  ADMIN_CREATE: 'Admin created',
  ADMIN_UPDATE: 'Admin updated',
  ADMIN_DELETE: 'Admin deleted',
  ADMIN_STATUS_TOGGLE: 'Status toggled',
  SESSION_REVOKED: 'Session revoked',
  ACCOUNT_LOCKED: 'Account locked',
  TOKEN_REUSE_DETECTED: 'Token reuse detected',
}

const SEVERITY_STYLES = {
  INFO: 'bg-blue-500/10 text-blue-600',
  WARNING: 'bg-amber-500/10 text-amber-600',
  CRITICAL: 'bg-red-500/10 text-red-600',
}

const HistoryRow = memo(({ log }) => (
  <tr className="border-b border-border/50 hover:bg-muted/30">
    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
    </td>
    <td className="px-4 py-3">
      <p className="font-medium text-sm">{log.actorUsername}</p>
      {log.isSecurityEvent && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500 mt-0.5">
          <ShieldAlert className="h-3 w-3" /> Security
        </span>
      )}
    </td>
    <td className="px-4 py-3">
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
        {ACTION_LABELS[log.action] || log.action}
      </span>
    </td>
    <td className="px-4 py-3">
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
          SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.INFO
        }`}
      >
        {log.severity}
      </span>
    </td>
    <td className="px-4 py-3 hidden lg:table-cell">
      {log.entityLink ? (
        <Link to={log.entityLink} className="text-xs text-primary hover:underline">
          {log.targetType}
        </Link>
      ) : (
        <span className="text-xs text-muted-foreground">{log.targetType}</span>
      )}
    </td>
    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
      {log.ip || '—'}
    </td>
  </tr>
))

HistoryRow.displayName = 'HistoryRow'

const HistoryPage = () => {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [securityOnly, setSecurityOnly] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const data = await historyApi.fetchHistory({
          page,
          limit: 20,
          search: search || undefined,
          action: actionFilter || undefined,
          severity: severityFilter || undefined,
          securityOnly: securityOnly || undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
        })
        setItems(data.items)
        setPagination(data.pagination)
      } catch (err) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    },
    [search, actionFilter, severityFilter, securityOnly, dateFrom, dateTo]
  )

  useEffect(() => {
    const t = setTimeout(() => load(1), 300)
    return () => clearTimeout(t)
  }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await historyApi.exportHistoryCsv({
        search: search || undefined,
        action: actionFilter || undefined,
        severity: severityFilter || undefined,
        securityOnly: securityOnly || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Audit log exported')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Audit History
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Security events and administrative actions
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor or target…"
            className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          aria-label="To date"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
          <input
            type="checkbox"
            checked={securityOnly}
            onChange={(e) => setSecurityOnly(e.target.checked)}
            className="rounded border-input"
          />
          Security events only
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={History}
            title="No audit records"
            description="Try adjusting your filters or date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Entity</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <HistoryRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => load(pagination.page - 1)}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => load(pagination.page + 1)}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(HistoryPage)

