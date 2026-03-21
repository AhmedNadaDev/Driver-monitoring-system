import { Bell, Menu, User, Search } from 'lucide-react'
import { useState } from 'react'

const Topbar = ({ title, onMenuClick }) => {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all md:hidden"
        >
          <Search className="h-5 w-5" />
        </button>
        
        <button className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive shadow-sm" />
        </button>
        
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md shadow-primary/20">
          <User className="h-4 w-4 text-white" />
        </div>
      </div>
    </header>
  )
}

export default Topbar