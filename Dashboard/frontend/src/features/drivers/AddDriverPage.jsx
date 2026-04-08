import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, User, Hash, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createDriver } from '../../api/driversApi.js'

const AddDriverPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [driverId, setDriverId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !driverId.trim()) return
    setIsLoading(true)
    try {
      await createDriver({ id: driverId.trim(), name: name.trim() })
      toast.success(`Driver "${name.trim()}" added successfully`)
      navigate('/drivers')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        to="/drivers"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Drivers
      </Link>

      <div className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-foreground">Add New Driver</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the driver's ID and name to register them.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">Driver Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">Driver ID</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                placeholder="e.g. DRV-009"
                className="w-full h-11 pl-11 pr-4 rounded-xl bg-muted/50 border border-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must be unique. Other fields (score, trips) start at 0 and are managed by the system.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" /> Add Driver
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AddDriverPage
