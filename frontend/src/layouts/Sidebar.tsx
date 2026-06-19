import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Brain,
  ChevronLeft,
  ChevronRight,
  Zap,
  Settings,
  HelpCircle,
  FileText,
  AlertTriangle,
  Activity,
  DollarSign,
  Cpu,
  MessageSquare,
  Globe,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './MainLayout'

// Define the 5 main layout sections mapping all existing pages
const sections = [
  {
    title: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Command Center',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Governance overview',
      }
    ]
  },
  {
    title: 'Insights',
    items: [
      {
        id: 'investigation',
        label: 'Investigation',
        href: '/investigation',
        icon: Search,
        description: 'Workflow forensics',
      },
      {
        id: 'explainability',
        label: 'Explainability',
        href: '/explainability',
        icon: Brain,
        description: 'AI decision insight',
      }
    ]
  },
  {
    title: 'Analytics',
    items: [
      {
        id: 'performance',
        label: 'Performance',
        href: '/performance',
        icon: Activity,
        description: 'Latency & token metrics',
      },
      {
        id: 'cost',
        label: 'Cost Tracking',
        href: '/cost',
        icon: DollarSign,
        description: 'Financial cost analysis',
      }
    ]
  },
  {
    title: 'Activity',
    items: [
      {
        id: 'audit',
        label: 'Audit Logs',
        href: '/audit',
        icon: FileText,
        description: 'Agent audit trail',
      },
      {
        id: 'collaboration',
        label: 'Collaboration',
        href: '/collaboration',
        icon: MessageSquare,
        description: 'Live agent war-room',
      }
    ]
  },
  {
    title: 'Governance',
    items: [
      {
        id: 'risk',
        label: 'Risk Assessment',
        href: '/risk',
        icon: AlertTriangle,
        description: 'Risk scores & findings',
      },
      {
        id: 'agents',
        label: 'Agents Registry',
        href: '/agents',
        icon: Cpu,
        description: 'Registered agents',
      },
      {
        id: 'band',
        label: 'Band Center',
        href: '/band',
        icon: Globe,
        description: 'Band consensus hub',
      }
    ]
  },
  {
    title: 'Demo',
    items: [
      {
        id: 'demo',
        label: 'Governance Center',
        href: '/demo',
        icon: Sparkles,
        description: 'Enterprise agent governance',
      }
    ]
  }
]

const bottomItems = [
  { id: 'settings', label: 'Settings', icon: Settings, href: '#' },
  { id: 'help', label: 'Help', icon: HelpCircle, href: '#' },
]

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-black/30 border-r border-white/5 z-20 transition-all duration-300 ease-in-out',
        collapsed ? 'w-[76px]' : 'w-[250px]'
      )}
      aria-label="Main navigation"
    >
      {/* Brand logo section */}
      <div
        className={cn(
          'flex items-center h-16 px-5 border-b border-white/5 gap-3.5',
          collapsed && 'justify-center px-0'
        )}
      >
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white text-black shadow-lg shadow-white/10">
          <Zap className="w-4.5 h-4.5 text-black" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fade-in">
            <p className="text-xs font-bold text-white tracking-widest leading-none uppercase">
              AgentOS
            </p>
            <p className="text-[9px] text-text-muted mt-1 font-semibold tracking-wider uppercase">
              AI Governance
            </p>
          </div>
        )}
      </div>

      {/* Main navigation list */}
      <nav className="flex-1 py-5 px-3 space-y-4 overflow-y-auto" aria-label="Primary navigation">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 mb-1 text-[9px] font-extrabold text-text-muted uppercase tracking-widest">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href

              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  className={cn(
                    'nav-item group relative',
                    isActive && 'active text-white',
                    collapsed && 'justify-center px-0 py-2.5 rounded-xl'
                  )}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'flex-shrink-0 w-4 h-4 transition-colors',
                      isActive ? 'text-white' : 'text-text-muted group-hover:text-text-secondary'
                    )}
                  />

                  {!collapsed && (
                    <span className="text-[11px] font-bold tracking-wider truncate">{item.label}</span>
                  )}

                  {/* Tooltip for collapsed view */}
                  {collapsed && (
                    <div
                      className="absolute left-full ml-3 px-3 py-2 rounded-xl bg-[#0F111A]/95 border border-white/10 text-white text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-2xl pointer-events-none"
                      role="tooltip"
                    >
                      <p className="font-bold">{item.label}</p>
                      <p className="text-text-muted text-[10px] mt-0.5 font-medium">{item.description}</p>
                    </div>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer / User section */}
      <div className="py-4 px-3 border-t border-white/5 space-y-2">
        {bottomItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3.5 px-4 py-2 text-text-muted hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors',
                collapsed && 'justify-center px-0 py-2.5'
              )}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="flex-shrink-0 w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
              {!collapsed && (
                <span className="text-[11px] font-bold tracking-wider uppercase">{item.label}</span>
              )}
            </a>
          )
        })}

        {/* User profile with Ann Kowalski style */}
        <div
          className={cn(
            'mt-2 pt-3 border-t border-white/5 flex items-center gap-3',
            collapsed ? 'justify-center' : 'px-3'
          )}
        >
          {/* Avatar element */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {/* Default avatar initials */}
              <span className="text-xs font-bold text-white tracking-wider">AK</span>
            </div>
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-[#08090C]" />
          </div>
          
          {!collapsed && (
            <div className="min-w-0 flex-1 animate-fade-in">
              <p className="text-xs font-bold text-white truncate leading-none">Ann Kowalski</p>
              <p className="text-[9px] text-text-muted truncate mt-1 uppercase tracking-wider font-semibold">Governance Admin</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={toggle}
        className={cn(
          'absolute -right-3 top-16 z-30',
          'w-6 h-6 rounded-full bg-[#1A1D2B] border border-white/10',
          'flex items-center justify-center',
          'text-text-muted hover:text-white hover:bg-white/5',
          'transition-all duration-150 shadow-xl',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  )
}
