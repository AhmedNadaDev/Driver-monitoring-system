import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, MapPin, ChevronLeft, ChevronRight, Shield, X } from 'lucide-react'

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Drivers', path: '/drivers', icon: Users },
  { label: 'Trips', path: '/trips', icon: MapPin },
]

const AppSidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation()

  const sidebarContent = (
    <div
      className={`flex h-full flex-col bg-sidebar transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
          <Shield className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-1 items-center justify-between">
            <span className="text-base font-semibold text-white tracking-tight">Driver Monitor</span>
            <button
              type="button"
              onClick={onMobileClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-200 ${active ? 'text-primary-foreground' : 'group-hover:scale-110'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-sm" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={onToggle}
          className="hidden w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-all md:flex"
        >
          {collapsed ? (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>Expand</span>
            </>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden md:block">{sidebarContent}</aside>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onMobileClose}
        />
        <aside
          className={`relative z-10 h-full w-[280px] max-w-full transform transition-transform duration-300 ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}

export default AppSidebar