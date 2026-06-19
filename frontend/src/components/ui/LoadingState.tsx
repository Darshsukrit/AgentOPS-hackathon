import { cn } from '@/lib/utils'

interface LoadingStateProps {
  /** Number of skeleton rows to show */
  rows?: number
  className?: string
  variant?: 'card' | 'list' | 'table'
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 rounded', className)} />
}

function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3 animate-pulse">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-1/2 h-7" />
      <SkeletonLine className="w-2/3 h-3" />
    </div>
  )
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-bg-surface animate-pulse">
          <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3 h-3" />
          </div>
          <SkeletonLine className="w-16 h-5 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function LoadingState({ rows = 3, className, variant = 'card' }: LoadingStateProps) {
  return (
    <div className={cn('w-full', className)} role="status" aria-label="Loading content">
      {variant === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: rows }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
      {variant === 'list' && <ListSkeleton rows={rows} />}
      {variant === 'table' && (
        <div className="card overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <SkeletonLine className="flex-1" />
                <SkeletonLine className="w-24" />
                <SkeletonLine className="w-20" />
              </div>
            ))}
          </div>
        </div>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  )
}
