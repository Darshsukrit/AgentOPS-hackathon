// ─────────────────────────────────────────
//  Shared Types — AgentOS Frontend
// ─────────────────────────────────────────

export type StatusVariant = 'active' | 'idle' | 'warning' | 'error' | 'info'

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: string
  badge?: string | number
  description?: string
}

export interface PageMeta {
  title: string
  description: string
  breadcrumbs?: { label: string; href?: string }[]
}

export interface StatMetric {
  label: string
  value: string | number
  trend?: TrendDirection
  delta?: string
  description?: string
}

export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}
