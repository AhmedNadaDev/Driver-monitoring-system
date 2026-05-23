import { useEffect, useState } from 'react'
import { Calendar, Key, LogOut, Save, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext.jsx'
import * as adminsApi from '../../services/adminsApi.js'
import * as authApi from '../../services/authApi.js'
import SessionsPanel from './SessionsPanel.jsx'

const ProfilePage = () => {
  const { admin, refreshAdmin, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    if (admin) {
      setUsername(admin.username)
      setEmail(admin.email)
      setAvatar(admin.avatar || '')
    }
  }, [admin])

  if (!admin) return null

  const initials = admin.username.slice(0, 2).toUpperCase()

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminsApi.updateProfile({ username, email, avatar: avatar || null })
      await refreshAdmin()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPw(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast.success('Password changed. Please sign in again.')
      await logout()
      window.location.href = '/login'
    } catch (err) {
      toast.error(err.message)
    } finally {
      setChangingPw(false)
    }
  }

  const handleLogoutAll = async () => {
    try {
      await authApi.logoutAll()
      await logout()
      window.location.href = '/login'
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden">
            {admin.avatar ? (
              <img src={admin.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-semibold">{admin.username}</h2>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                {admin.role.replace('_', ' ')}
              </span>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  admin.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                }`}
              >
                {admin.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Joined {format(new Date(admin.createdAt), 'MMM d, yyyy')}
              </span>
              {admin.lastLogin && (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Last login {format(new Date(admin.lastLogin), 'MMM d, yyyy HH:mm')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleProfileSave} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-semibold">Profile Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Avatar URL</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={handlePasswordChange} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Key className="h-4 w-4" />
          Change Password
        </h3>
        <p className="text-xs text-muted-foreground">
          Min 10 characters with uppercase, lowercase, number, and special character.
        </p>
        <div className="grid gap-4 max-w-md">
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={changingPw}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          {changingPw ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <SessionsPanel />

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h3 className="font-semibold">Emergency session reset</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Revoke every session including this device. You will need to sign in again.
        </p>
        <button
          type="button"
          onClick={handleLogoutAll}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout all sessions
        </button>
      </div>
    </div>
  )
}

export default ProfilePage


