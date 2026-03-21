import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AppSidebar from './AppSidebar.jsx'
import Topbar from './Topbar.jsx'

const pageTitles = {
  '/': 'Overview',
  '/drivers': 'Drivers',
  '/trips': 'Trips',
}

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const title =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith('/drivers/')
      ? 'Driver Details'
      : location.pathname.startsWith('/trips/')
      ? 'Trip Details'
      : location.pathname === '/drivers/new'
      ? 'Add Driver'
      : 'Dashboard')

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout