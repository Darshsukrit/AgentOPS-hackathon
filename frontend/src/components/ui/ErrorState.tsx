import { AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="w-12 h-12 rounded-full bg-status-error/10 border border-status-error/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-5 h-5 text-status-error" />
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted max-w-sm text-balance">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'mt-5 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium',
            'bg-bg-surface border border-border text-text-secondary',
            'hover:border-border-strong hover:text-text-primary',
            'transition-all duration-150'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  )
}
