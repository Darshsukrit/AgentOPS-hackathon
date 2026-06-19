import React from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-white tracking-wider uppercase leading-none">{title}</h2>
        {description && (
          <p className="text-[11px] text-text-muted mt-1.5 leading-normal font-medium">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  )
}
