import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import Modal from '../../shared/components/Modal.jsx'
import { useAuth, ROLES } from '../../contexts/AuthContext.jsx'

const AdminFormModal = ({ isOpen, onClose, onSubmit, initial, mode = 'create' }) => {
  const { isSuperAdmin } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(ROLES.ADMIN)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setUsername(initial?.username || '')
      setEmail(initial?.email || '')
      setPassword('')
      setRole(initial?.role || ROLES.ADMIN)
      setError('')
    }
  }, [isOpen, initial])

  const validatePassword = (pwd) => {
    const errors = []
    if (pwd.length < 10) {
      errors.push('at least 10 characters')
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('an uppercase letter')
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('a lowercase letter')
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('a number')
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      errors.push('a special character')
    }
    if (/(.)\1{2,}/.test(pwd)) {
      errors.push('no repeated characters (3+ in a row)')
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // Frontend validation
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    
    // Password validation for create mode
    if (mode === 'create') {
      if (!password) {
        setError('Password is required')
        return
      }
      const passwordErrors = validatePassword(password)
      if (passwordErrors.length > 0) {
        setError(`Password must contain: ${passwordErrors.join(', ')}`)
        return
      }
    }
    
    setSubmitting(true)
    try {
      const payload = { username, email, role }
      if (mode === 'create') payload.password = password
      await onSubmit(payload)
      onClose()
    } catch (err) {
      // Display specific error message from backend
      let message = err.message || 'Failed to save admin'
      
      // If there are validation details, show them
      if (err.details && Array.isArray(err.details)) {
        const detailMessages = err.details.map(d => d.message || d).join(', ')
        message = `${message}: ${detailMessages}`
      }
      
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'create' ? 'Create Admin' : 'Edit Admin'}
      size="comfortable"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div>
          <label className="text-xs font-medium text-muted-foreground">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            minLength={3}
            maxLength={32}
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        
        {mode === 'create' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              minLength={10}
            />
            <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
              <p>Password must contain:</p>
              <ul className="list-disc list-inside pl-2">
                <li>At least 10 characters</li>
                <li>Uppercase and lowercase letters</li>
                <li>At least one number</li>
                <li>At least one special character</li>
                <li>No repeated characters (3+ in a row)</li>
              </ul>
            </div>
          </div>
        )}
        
        {isSuperAdmin && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value={ROLES.ADMIN}>Admin</option>
              <option value={ROLES.SUPER_ADMIN}>Super Admin</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {role === ROLES.SUPER_ADMIN 
                ? 'Full system access with ability to manage all admins' 
                : 'Standard administrative access'}
            </p>
          </div>
        )}
        
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AdminFormModal
