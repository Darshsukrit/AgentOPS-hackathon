import React from 'react'
import { cn } from '@/lib/utils'

interface ContentWrapperProps {
  children: React.ReactNode
  className?: string
}

/** Wraps page content sections with consistent spacing */
export function ContentWrapper({ children, className }: ContentWrapperProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {children}
    </div>
  )
}

interface GridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  className?: string
}

/** Responsive grid with sensible column defaults */
export function Grid({ children, cols = 3, className }: GridProps) {
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-12',
  }

  return (
    <div className={cn('grid gap-4', colMap[cols], className)}>
      {children}
    </div>
  )
}
