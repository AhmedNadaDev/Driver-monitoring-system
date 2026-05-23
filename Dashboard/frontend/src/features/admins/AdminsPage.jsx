import { memo, useCallback, useEffect, useState } from 'react'
import {
  Plus, Search, Pencil, Trash2, Loader2, UserCog, ToggleLeft, ToggleRight, Key,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import * as adminsApi from '../../services/adminsApi.js'
import AdminFormModal from './AdminFormModal.jsx'
import Modal from '../../shared/components/Modal.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import { TableSkeleton } from '../../shared/components/Skeleton.jsx'
import EmptyState from '../../shared/components/EmptyState.jsx'

const AdminsPage = () => {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const data = await adminsApi.fetchAdmins({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setItems(data.items)
      setPagination(data.pagination)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => load(1), 300)
    return () => clearTimeout(t)
  }, [load])

  const handleCreate = async (payload) => {
    try {
      await adminsApi.createAdmin(payload)
      toast.success('Admin created')
      load(pagination.page)
    } catch (err) {
      const message = err.message || 'Failed to create admin'
      toast.error(message)
      throw err // Re-throw to let modal handle it
    }
  }

  const handleUpdate = async (payload) => {
    try {
      await adminsApi.updateAdmin(editTarget.id, payload)
      toast.success('Admin updated')
      setEditTarget(null)
      load(pagination.page)
    } catch (err) {
      const message = err.message || 'Failed to update admin'
      toast.error(message)
      throw err // Re-throw to let modal handle it
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await adminsApi.deleteAdmin(deleteTarget.id)
      toast.success('Admin deleted')
      setDeleteTarget(null)
      load(pagination.page)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (admin) => {
    try {
      await adminsApi.toggleAdminStatus(admin.id)
      toast.success(`Admin ${admin.isActive ? 'deactivated' : 'activated'}`)
      load(pagination.page)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await adminsApi.resetAdminPassword(resetTarget.id, newPassword)
      toast.success('Password reset')
      setResetTarget(null)
      setNewPassword('')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Admin Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage dashboard administrator accounts
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Admin
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email…"
            className="w-full rounded-xl border border-input bg-background py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Last login</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={UserCog}
                        title="No admins found"
                        description="Create a new admin or adjust your search filters."
                      />
                    </td>
                  </tr>
                ) : (
                  items.map((admin) => (
                    <tr key={admin.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{admin.username}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {admin.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {admin.lastLogin
                          ? format(new Date(admin.lastLogin), 'MMM d, yyyy HH:mm')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(admin)}
                          className="inline-flex items-center gap-1 text-xs"
                          title="Toggle status"
                        >
                          {admin.isActive ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          )}
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(admin)}
                            className="rounded-lg p-2 hover:bg-muted"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetTarget(admin)}
                            className="rounded-lg p-2 hover:bg-muted"
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          {admin.role !== 'SUPER_ADMIN' && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(admin)}
                              className="rounded-lg p-2 hover:bg-destructive/10 text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
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

      <AdminFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        mode="create"
      />

      <AdminFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        initial={editTarget}
        mode="edit"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete admin"
        description={`Permanently delete "${deleteTarget?.username}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      <Modal
        isOpen={!!resetTarget}
        onClose={() => { setResetTarget(null); setNewPassword('') }}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set a new password for <strong>{resetTarget?.username}</strong>
          </p>
          <input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2 text-sm text-primary-foreground"
          >
            Reset password
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default memo(AdminsPage)
