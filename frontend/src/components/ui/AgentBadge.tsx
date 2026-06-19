import { cn } from '@/lib/utils'

interface AgentBadgeProps {
  provider: 'local' | 'aiml' | 'band' | 'system' | string
  className?: string
}

const providerConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  band: {
    label: 'BAND',
    bg: 'bg-gradient-to-r from-indigo-600/25 via-purple-600/25 to-pink-600/25',
    text: 'text-indigo-300 font-extrabold tracking-wider',
    border: 'border-indigo-500/40',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.6)] border-indigo-400/40',
  },
  aiml: {
    label: 'AIML',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400 font-bold',
    border: 'border-cyan-500/20',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.3)]',
  },
  local: {
    label: 'LOCAL',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400 font-medium',
    border: 'border-zinc-500/20',
    glow: '',
  },
  system: {
    label: 'LOCAL',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400 font-medium',
    border: 'border-zinc-500/20',
    glow: '',
  },
}

export function AgentBadge({ provider, className }: AgentBadgeProps) {
  const p = provider.toLowerCase()
  const cfg = providerConfig[p] || {
    label: provider.toUpperCase(),
    bg: 'bg-white/[0.03]',
    text: 'text-text-secondary',
    border: 'border-white/5',
    glow: '',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] uppercase border transition-all duration-300',
        cfg.bg,
        cfg.text,
        cfg.border,
        cfg.glow,
        className
      )}
    >
      <span className={cn(
        "w-1 h-1 rounded-full mr-1.5 animate-pulse-subtle",
        p === 'band' ? 'bg-indigo-300' : 'bg-current'
      )} />
      {cfg.label}
    </span>
  )
}
