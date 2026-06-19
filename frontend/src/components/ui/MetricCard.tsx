import React from 'react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  dark?: boolean
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  footer,
  className,
  dark = false,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        dark ? 'card-dark p-6' : 'card p-6',
        'flex flex-col gap-5 justify-between transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold text-text-secondary uppercase tracking-widest leading-none">{title}</p>
          {description && (
            <p className="text-[11px] text-text-muted mt-1 leading-normal font-medium">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-text-muted hover:text-white transition-colors">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-2">
        <span className="text-3xl font-extrabold text-white tracking-tight tabular-nums leading-none">
          {value}
        </span>
      </div>

      {/* Footer */}
      {footer && (
        <div className="pt-3.5 border-t border-white/5 text-[10px] text-text-muted tracking-wider uppercase font-semibold leading-none">{footer}</div>
      )}
    </div>
  )
}
