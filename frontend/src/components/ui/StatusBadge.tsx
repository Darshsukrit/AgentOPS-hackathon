import { cn } from '@/lib/utils'
import type { StatusVariant } from '@/types'

interface StatusBadgeProps {
  status: StatusVariant
  label?: string
  showDot?: boolean
  className?: string
}

const statusConfig: Record<
  StatusVariant,
  { label: string; dotColor: string; textColor: string; bgColor: string; borderColor: string }
> = {
  active: {
    label: 'Active',
    dotColor: 'bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    textColor: 'text-[#10B981]',
    bgColor: 'bg-[#10B981]/10',
    borderColor: 'border-[#10B981]/20',
  },
  idle: {
    label: 'Idle',
    dotColor: 'bg-[#6B7280]',
    textColor: 'text-[#9CA3AF]',
    bgColor: 'bg-white/[0.03]',
    borderColor: 'border-white/5',
  },
  warning: {
    label: 'Warning',
    dotColor: 'bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    textColor: 'text-[#F59E0B]',
    bgColor: 'bg-[#F59E0B]/10',
    borderColor: 'border-[#F59E0B]/20',
  },
  error: {
    label: 'Error',
    dotColor: 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    textColor: 'text-[#EF4444]',
    bgColor: 'bg-[#EF4444]/10',
    borderColor: 'border-[#EF4444]/20',
  },
  info: {
    label: 'Info',
    dotColor: 'bg-[#3B82F6] shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    textColor: 'text-[#3B82F6]',
    bgColor: 'bg-[#3B82F6]/10',
    borderColor: 'border-[#3B82F6]/20',
  },
}

export function StatusBadge({
  status,
  label,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const cfg = statusConfig[status]
  const displayLabel = label ?? cfg.label

  return (
    <span
      className={cn(
        'badge border backdrop-blur-md transition-all duration-300 px-3 py-1 text-[9px] font-bold tracking-wider',
        cfg.bgColor,
        cfg.textColor,
        cfg.borderColor,
        className
      )}
      aria-label={`Status: ${displayLabel}`}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-subtle', cfg.dotColor)}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  )
}
