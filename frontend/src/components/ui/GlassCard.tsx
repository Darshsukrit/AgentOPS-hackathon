import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  /** Enable hover interaction styles */
  interactive?: boolean
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: React.ElementType
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export function GlassCard({
  children,
  className,
  interactive = false,
  padding = 'md',
  as: Tag = 'div',
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        'glass rounded-[20px]',
        paddingMap[padding],
        interactive && [
          'cursor-pointer',
          'hover:bg-white/[0.05] hover:border-white/15',
          'transition-all duration-300',
          'hover:-translate-y-0.5',
          'active:scale-[0.99]',
        ],
        className
      )}
    >
      {children}
    </Tag>
  )
}
