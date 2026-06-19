import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrendDirection } from '@/types'

interface StatCardProps {
  label: string
  value: string | number
  trend?: TrendDirection
  delta?: string
  description?: string
  className?: string
}

const trendConfig = {
  up: {
    icon: TrendingUp,
    color: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20',
    label: 'Trending up',
  },
  down: {
    icon: TrendingDown,
    color: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20',
    label: 'Trending down',
  },
  neutral: {
    icon: Minus,
    color: 'text-text-muted bg-white/[0.02] border-white/5',
    label: 'No change',
  },
}

export function StatCard({
  label,
  value,
  trend,
  delta,
  description,
  className,
}: StatCardProps) {
  const trendCfg = trend ? trendConfig[trend] : null
  const TrendIcon = trendCfg?.icon

  return (
    <div
      className={cn(
        'card p-6 flex flex-col justify-between min-h-[130px] transition-all duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest leading-none">
          {label}
        </p>
        {trendCfg && TrendIcon && (
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase leading-none', trendCfg.color)}>
            <TrendIcon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {delta && <span>{delta}</span>}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
          {value}
        </span>
      </div>

      {description && (
        <p className="mt-3 text-[10px] text-text-muted font-semibold tracking-wider uppercase leading-relaxed">{description}</p>
      )}
    </div>
  )
}
