import { getDecisionBadgeStyles } from '@/lib/format'
import { cn } from '@/lib/utils'

interface DecisionBadgeProps {
  decision?: string | null
  className?: string
}

export function DecisionBadge({ decision, className }: DecisionBadgeProps) {
  if (!decision) {
    return (
      <span className={cn('badge border font-mono tracking-wider text-text-muted bg-bg-overlay/50 border-border', className)}>
        PENDING
      </span>
    )
  }

  const styles = getDecisionBadgeStyles(decision)
  const label = decision.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'badge border font-mono tracking-wider',
        styles.bgColor,
        styles.textColor,
        styles.borderColor,
        className
      )}
      aria-label={`Governance Decision: ${label}`}
    >
      {label}
    </span>
  )
}
