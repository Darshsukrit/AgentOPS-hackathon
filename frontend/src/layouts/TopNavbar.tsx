import React from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Menu, Command, Search, Globe, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './MainLayout'

const routeMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Governance Command Center',
    description: 'Enterprise AI observability at a glance',
  },
  '/investigation': {
    title: 'Workflow Investigation',
    description: 'Forensic analysis of agent execution traces',
  },
  '/explainability': {
    title: 'AI Decision Lineage',
    description: 'Every governance decision is traceable',
  },
  '/demo': {
    title: 'Enterprise Agent Governance Center',
    description: 'The operational control plane for enterprise AI agents',
  },
  '/audit': {
    title: 'Audit Trail',
    description: 'Governance ledger and archives',
  },
  '/risk': {
    title: 'Risk Profile',
    description: 'Enterprise risk categorization',
  },
  '/performance': {
    title: 'Performance analytics',
    description: 'Latency and token metrics',
  },
  '/cost': {
    title: 'Cost Tracking',
    description: 'Financial token audit',
  },
  '/agents': {
    title: 'Agents Registry',
    description: 'Micro-agents catalog',
  },
}

function getISTTimeString() {
  const options = {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  } as const;

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(new Date());

  const partMap = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {} as Record<string, string>);

  return `IST • ${partMap.day} ${partMap.month} ${partMap.year} • ${partMap.hour}:${partMap.minute}:${partMap.second}`;
}

export function TopNavbar() {
  const location = useLocation()
  const { toggle } = useSidebar()
  const meta = routeMeta[location.pathname] ?? { title: 'AgentOS', description: '' }

  const [timeStr, setTimeStr] = React.useState(getISTTimeString())

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getISTTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header
      className={cn(
        'flex items-center justify-between h-16 px-6 bg-black/10 backdrop-blur-sm border-b border-white/5 sticky top-0 z-10'
      )}
      role="banner"
    >
      {/* Left section: mobile hamburger & page info & Environment badge */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Page Context */}
        <div className="min-w-0 hidden md:block">
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[11px] font-bold uppercase tracking-wider">AgentOS</span>
            <span className="text-text-muted text-xs">/</span>
            <span className="text-white text-[11px] font-bold uppercase tracking-wider truncate">
              {meta.title}
            </span>
          </div>
        </div>

        {/* Weather/Time/Status widget from reference image */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-white tracking-wider uppercase">23° Active</span>
        </div>
      </div>

      {/* Center: Global Search Pill (Reference Layout) */}
      <div className="flex items-center flex-1 justify-center max-w-md px-4">
        <div className="relative w-full flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Type searching..."
            className="w-full bg-white/[0.04] border border-white/5 hover:border-white/10 focus:border-white/20 focus:bg-white/[0.06] rounded-full pl-9 pr-12 py-1.5 text-xs text-white placeholder:text-text-muted outline-none transition-all"
            aria-label="Global search input"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-white/5 border border-white/5 text-text-muted pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section: System Status, Palette, Notifications, Profile bubble */}
      <div className="flex items-center gap-3">
        {/* Environment Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
          <Globe className="w-3 h-3 text-[#10B981]" />
          <span className="text-[10px] font-bold tracking-wider text-text-secondary uppercase">Staging</span>
        </div>

        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 font-mono text-[10px] font-bold text-text-secondary tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>{timeStr}</span>
        </div>

        {/* Command palette toggle */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 text-text-muted hover:text-white hover:bg-white/5 transition-all"
          aria-label="Open command palette"
        >
          <Command className="w-3.5 h-3.5" />
        </button>

        {/* Notifications circle with indicator badge */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.03] border border-white/5 text-text-muted hover:text-white hover:bg-white/5 transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </button>

        {/* Small User profile circle */}
        <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer hover:border-white/20 transition-all">
          <span className="text-[10px] font-bold text-white uppercase font-mono">AK</span>
        </div>
      </div>
    </header>
  )
}
