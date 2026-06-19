import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

interface RiskBadgeProps {
  level: RiskLevel
  label?: string
  showIcon?: boolean
  className?: string
}

const riskConfig: Record<
  RiskLevel,
  {
    label: string
    icon: React.ElementType
    textColor: string
    bgColor: string
    borderColor: string
  }
> = {
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    textColor: 'text-risk-critical',
    bgColor: 'bg-risk-critical/10',
    borderColor: 'border-risk-critical/20',
  },
  high: {
    label: 'High',
    icon: AlertTriangle,
    textColor: 'text-risk-high',
    bgColor: 'bg-risk-high/10',
    borderColor: 'border-risk-high/20',
  },
  medium: {
    label: 'Medium',
    icon: Shield,
    textColor: 'text-risk-medium',
    bgColor: 'bg-risk-medium/10',
    borderColor: 'border-risk-medium/20',
  },
  low: {
    label: 'Low',
    icon: ShieldCheck,
    textColor: 'text-risk-low',
    bgColor: 'bg-risk-low/10',
    borderColor: 'border-risk-low/20',
  },
}

import React from 'react'

export function RiskBadge({ level, label, showIcon = true, className }: RiskBadgeProps) {
  const normalizedLevel = (level?.toLowerCase() || 'low') as RiskLevel
  const cfg = riskConfig[normalizedLevel] || riskConfig['low']
  const Icon = cfg.icon
  const displayLabel = label ?? cfg.label

  return (
    <span
      className={cn(
        'badge border',
        cfg.bgColor,
        cfg.textColor,
        cfg.borderColor,
        className
      )}
      aria-label={`Risk level: ${displayLabel}`}
    >
      {showIcon && <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />}
      {displayLabel}
    </span>
  )
}
