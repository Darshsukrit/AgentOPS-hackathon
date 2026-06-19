import React from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  /** Set to true for full-width pages (no max-width) */
  fluid?: boolean
}

export function PageContainer({ children, className, fluid = false }: PageContainerProps) {
  return (
    <div
      className={cn(
        'px-6 py-6',
        !fluid && 'max-w-screen-2xl',
        className
      )}
    >
      {children}
    </div>
  )
}
