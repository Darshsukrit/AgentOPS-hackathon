import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldAlert, ArrowUpRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/data/mockData'

interface AlertFeedProps {
  alerts: Alert[]
  className?: string
}

const severityConfig: Record<
  Alert['severity'],
  { icon: React.ElementType; textColor: string; bgColor: string; borderColor: string }
> = {
  critical: {
    icon: ShieldAlert,
    textColor: 'text-risk-critical',
    bgColor: 'bg-risk-critical/10',
    borderColor: 'border-risk-critical/20',
  },
  high: {
    icon: AlertTriangle,
    textColor: 'text-risk-high',
    bgColor: 'bg-risk-high/10',
    borderColor: 'border-risk-high/20',
  },
  medium: {
    icon: AlertTriangle,
    textColor: 'text-risk-medium',
    bgColor: 'bg-risk-medium/10',
    borderColor: 'border-risk-medium/20',
  },
  low: {
    icon: Info,
    textColor: 'text-status-active',
    bgColor: 'bg-status-active/10',
    borderColor: 'border-status-active/20',
  },
  info: {
    icon: Info,
    textColor: 'text-status-info',
    bgColor: 'bg-status-info/10',
    borderColor: 'border-status-info/20',
  },
}

const typeLabel: Record<Alert['type'], string> = {
  compliance_violation: 'Compliance',
  escalation: 'Escalation',
  security_finding: 'Security',
}

export function AlertFeed({ alerts, className }: AlertFeedProps) {
  return (
    <div className={cn('space-y-3.5', className)}>
      {alerts.map((alert) => {
        const cfg = severityConfig[alert.severity]
        const Icon = cfg.icon

        return (
          <div
            key={alert.id}
            className={cn(
              'flex gap-3 p-4 rounded-lg border transition-all hover:bg-bg-surface/85',
              cfg.bgColor,
              cfg.borderColor
            )}
          >
            <div className={cn('flex-shrink-0 mt-0.5', cfg.textColor)}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-2xs font-semibold uppercase tracking-wider', cfg.textColor)}>
                  {typeLabel[alert.type]}
                </span>
                <span className="text-2xs text-text-muted">•</span>
                <span className="text-2xs text-text-muted">{alert.timestamp}</span>
              </div>
              <p className="text-xs text-text-primary mt-1 leading-relaxed">
                {alert.message}
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center justify-center">
              <Link
                to={`/investigation?id=${alert.workflowId}`}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
                title="Investigate workflow"
                aria-label={`Investigate workflow ${alert.workflowId}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
