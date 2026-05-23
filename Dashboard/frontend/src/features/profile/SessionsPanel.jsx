import { memo, useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Laptop, Loader2, LogOut, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import * as authApi from '../../services/authApi.js'
import { TableSkeleton } from '../../shared/components/Skeleton.jsx'
import EmptyState from '../../shared/components/EmptyState.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'

const SessionRow = memo(({ session, onRevoke, revoking }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        {session.deviceLabel?.toLowerCase().includes('mobile') ||
        session.deviceLabel?.toLowerCase().includes('android') ||
        session.deviceLabel?.toLowerCase().includes('ios') ? (
          <Smartphone className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Laptop className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">
          {session.deviceLabel}
          {session.isCurrent && (
            <span className="ml-2 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              This device
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          IP: {session.ip || '—'} · Last active{' '}
          {format(new Date(session.lastUsedAt || session.createdAt), 'MMM d, yyyy HH:mm')}
        </p>
      </div>
    </div>
    {!session.isCurrent && (
      <button
        type="button"
        disabled={revoking === session.id}
        onClick={() => onRevoke(session.id)}
        className="text-sm text-destructive hover:underline disabled:opacity-50 shrink-0"
      >
        {revoking === session.id ? 'Revoking…' : 'Revoke'}
      </button>
    )}
  </div>
))

SessionRow.displayName = 'SessionRow'

const SessionsPanel = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(null)
  const [confirmOthers, setConfirmOthers] = useState(false)
  const [revokingOthers, setRevokingOthers] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authApi.fetchSessions()
      setSessions(data.sessions || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRevoke = async (sessionId) => {
    setRevoking(sessionId)
    try {
      await authApi.revokeSession(sessionId)
      toast.success('Session revoked')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRevoking(null)
    }
  }

  const handleRevokeOthers = async () => {
    setRevokingOthers(true)
    try {
      const { revokedCount } = await authApi.revokeOtherSessions()
      toast.success(`Revoked ${revokedCount} other session(s)`)
      setConfirmOthers(false)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRevokingOthers(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Active sessions</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Devices where you are currently signed in
          </p>
        </div>
        {sessions.some((s) => !s.isCurrent) && (
          <button
            type="button"
            onClick={() => setConfirmOthers(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Logout other devices
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={2} cols={1} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No active sessions"
          description="You have no other active login sessions."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onRevoke={handleRevoke}
              revoking={revoking}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOthers}
        onClose={() => setConfirmOthers(false)}
        onConfirm={handleRevokeOthers}
        title="Logout other devices"
        description="This will end all sessions except your current browser."
        confirmLabel="Logout others"
        loading={revokingOthers}
      />
    </div>
  )
}

export default memo(SessionsPanel)
