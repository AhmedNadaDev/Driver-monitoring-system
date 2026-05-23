import { Bell, Menu, Moon, Sun, Search, ChevronDown, User, LogOut, History, UserCog } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

const Topbar = ({ title, onMenuClick }) => {
  const { admin, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = admin?.username?.slice(0, 2).toUpperCase() || 'AD'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-card/90 backdrop-blur-md px-4 md:px-6 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight leading-none">
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
            Driver Monitoring System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search…"
            className="h-9 w-48 pl-9 pr-4 rounded-xl bg-muted/70 border border-transparent text-sm focus:outline-none focus:bg-muted focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
          />
        </div>

        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <button
          aria-label="Notifications"
          className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" />
        </button>

        <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted transition-all"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow ring-2 ring-primary/20 overflow-hidden">
              {admin?.avatar ? (
                <img src={admin.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-white">{initials}</span>
              )}
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block max-w-[100px] truncate">
              {admin?.username || 'Admin'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-card shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{admin?.username}</p>
                <p className="text-xs text-muted-foreground truncate">{admin?.email}</p>
                <p className="text-[10px] text-primary mt-0.5 font-medium">
                  {admin?.role?.replace('_', ' ')}
                </p>
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              {isSuperAdmin && (
                <>
                  <Link
                    to="/admins"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <UserCog className="h-4 w-4" />
                    Admin Management
                  </Link>
                  <Link
                    to="/history"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                  >
                    <History className="h-4 w-4" />
                    History
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
