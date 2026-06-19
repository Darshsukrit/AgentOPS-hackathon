import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Activity,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  ChevronRight,
  Database,
  Zap,
  Loader2,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { StatCard } from '@/components/ui/StatCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { GlassCard } from '@/components/ui/GlassCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { CardHeader } from '@/components/ui/Typography'
import { useWorkflows, useIntegration, useAgents, useHealth } from '@/hooks/useApi'
import type { WorkflowSummary, GovernanceAgent } from '@/services/api'
import { triggerWorkflow } from '@/services/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierToRisk(tier: string): 'low' | 'medium' | 'high' | 'critical' {
  if (tier === 'high') return 'high'
  if (tier === 'medium') return 'medium'
  return 'low'
}

function statusToVariant(status: string): 'active' | 'idle' | 'warning' | 'error' | 'info' {
  if (status === 'completed') return 'idle'
  if (status === 'running') return 'active'
  if (status === 'failed') return 'error'
  return 'idle'
}

function decisionColor(decision: string | null): string {
  if (!decision) return 'text-text-muted'
  if (decision === 'APPROVED') return 'text-status-active'
  if (decision === 'BLOCKED') return 'text-status-error'
  if (decision === 'ESCALATED') return 'text-status-warning'
  return 'text-text-secondary'
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
    </div>
  )
}

// ─── Integration Status Panel ─────────────────────────────────────────────────

function IntegrationPanel() {
  const { data, loading } = useIntegration()
  const { data: health } = useHealth()

  if (loading) return <LoadingSpinner />

  const items = [
    { label: 'Database',    value: data?.database ?? health?.database ?? '—',    ok: data?.database === 'connected' || health?.database === 'connected' },
    { label: 'Redis',       value: data?.redis ?? health?.redis ?? '—',          ok: data?.redis === 'connected' || health?.redis === 'connected' },
    { label: 'AI Provider', value: data?.aiml_api ?? '—',                        ok: data?.aiml_api === 'connected' },
    { label: 'Band AI',     value: data?.band_api ?? '—',                        ok: data?.band_api === 'connected' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label} className="p-3 bg-bg-surface/60 border border-border rounded-lg">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-2xs text-text-muted uppercase font-semibold tracking-wide">{item.label}</span>
            <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-status-active animate-pulse-subtle' : 'bg-status-error'}`} />
          </div>
          <p className={`text-xs font-semibold capitalize ${item.ok ? 'text-status-active' : 'text-status-error'}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Agent Activity Snapshot ──────────────────────────────────────────────────

function AgentActivitySnapshot() {
  const { data: agents, loading } = useAgents()

  if (loading) return <LoadingSpinner />
  if (!agents || agents.length === 0) {
    return <p className="text-2xs text-text-muted text-center py-4">No agents registered yet.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Cpu className="w-3.5 h-3.5 text-text-muted" />
          {agents.length} Registered
        </span>
      </div>
      {agents.slice(0, 6).map((agent) => (
        <div key={agent.agent_id} className="flex items-center gap-2 group justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-status-active animate-pulse-subtle" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-text-secondary truncate font-mono font-medium">{agent.name}</span>
                <span className="text-[9px] text-text-muted truncate lowercase">({agent.type})</span>
              </div>
              <p className="text-2xs text-text-muted truncate">{agent.description}</p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-bg-overlay border border-border/30 text-text-muted">
            {agent.provider}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Workflow Creation Buttons ─────────────────────────────────────────────────

function WorkflowCreationPanel({ onCreated }: { onCreated: () => void }) {
  const [creating, setCreating] = React.useState<'low' | 'medium' | 'high' | null>(null)
  const [lastResult, setLastResult] = React.useState<string | null>(null)

  const create = async (tier: 'low' | 'medium' | 'high') => {
    setCreating(tier)
    setLastResult(null)
    try {
      const wf = await triggerWorkflow(tier)
      setLastResult(`✓ Created ${wf.id}`)
      onCreated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setLastResult(`✗ ${msg}`)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-2xs text-text-muted">Trigger a new governance workflow run:</p>
      <div className="flex gap-2 flex-wrap">
        {(['low', 'medium', 'high'] as const).map((tier) => (
          <button
            key={tier}
            onClick={() => create(tier)}
            disabled={creating !== null}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all disabled:opacity-50
              ${tier === 'low'    ? 'border-status-active/40 text-status-active bg-status-active/10 hover:bg-status-active/20'
              : tier === 'medium' ? 'border-status-warning/40 text-status-warning bg-status-warning/10 hover:bg-status-warning/20'
              :                     'border-status-error/40 text-status-error bg-status-error/10 hover:bg-status-error/20'
            }`}
          >
            {creating === tier ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {tier.toUpperCase()}
          </button>
        ))}
      </div>
      {lastResult && (
        <p className={`text-2xs font-mono ${lastResult.startsWith('✓') ? 'text-status-active' : 'text-status-error'}`}>
          {lastResult}
        </p>
      )}
    </div>
  )
}

// ─── Workflow Health Row ──────────────────────────────────────────────────────

function WorkflowHealthRow({ workflows }: { workflows: WorkflowSummary[] }) {
  const approved  = workflows.filter((w) => w.final_decision === 'APPROVED').length
  const escalated = workflows.filter((w) => w.final_decision === 'ESCALATED').length
  const blocked   = workflows.filter((w) => w.final_decision === 'BLOCKED').length

  const metrics = [
    { label: 'Approved',  count: approved,  icon: ShieldCheck,   color: 'text-status-active',  bg: 'bg-status-active/10'  },
    { label: 'Escalated', count: escalated, icon: AlertTriangle,  color: 'text-status-warning', bg: 'bg-status-warning/10' },
    { label: 'Blocked',   count: blocked,   icon: Activity,       color: 'text-status-error',   bg: 'bg-status-error/10'   },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <div
            key={m.label}
            className={`${m.bg} border border-border/60 rounded-lg p-3 flex items-center gap-3 hover:border-border-strong transition-colors`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${m.color}`} />
            <div>
              <p className={`text-lg font-semibold leading-none ${m.color}`}>{m.count}</p>
              <p className="text-2xs text-text-muted mt-0.5">{m.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Risk Distribution ────────────────────────────────────────────────────────

function RiskDistribution({ workflows }: { workflows: WorkflowSummary[] }) {
  const counts = { low: 0, medium: 0, high: 0, critical: 0 }
  for (const w of workflows) {
    const r = tierToRisk(w.tier)
    counts[r]++
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
        <GlassCard key={level} padding="sm" className="flex items-center justify-between border-border/70">
          <div className="flex items-center gap-2">
            <RiskBadge level={level} showIcon />
          </div>
          <div className="text-sm font-semibold text-text-primary tracking-tight">
            {counts[level]} {counts[level] === 1 ? 'task' : 'tasks'}
          </div>
        </GlassCard>
      ))}
    </div>
  )
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate()
  const { data: workflows, loading: wfLoading, refetch } = useWorkflows()
  const { data: integration } = useIntegration()

  const wf = workflows ?? []

  const totalWorkflows  = wf.length
  const approvedCount   = wf.filter((w) => w.final_decision === 'APPROVED').length
  const blockedCount    = wf.filter((w) => w.final_decision === 'BLOCKED').length
  const escalatedCount  = wf.filter((w) => w.final_decision === 'ESCALATED').length
  const complianceRate  = totalWorkflows > 0 ? `${Math.round(((totalWorkflows - blockedCount) / totalWorkflows) * 100)}%` : '—'

  const dbOk = integration?.database === 'connected'
  const redisOk = integration?.redis === 'connected'
  const aiOk = integration?.aiml_api === 'connected'
  const bandOk = integration?.band_api === 'connected'
  const allConnected = dbOk && redisOk && aiOk && bandOk
  const noneConnected = !dbOk && !redisOk && !aiOk && !bandOk

  let overallStatus = 'Degraded'
  let overallColor = 'text-status-warning'
  let overallDot = 'bg-status-warning'
  if (allConnected) {
    overallStatus = 'Operational'
    overallColor = 'text-status-active'
    overallDot = 'bg-status-active'
  } else if (noneConnected) {
    overallStatus = 'Offline'
    overallColor = 'text-status-error'
    overallDot = 'bg-status-error'
  }

  const topStats = [
    { label: 'Total Workflows',   value: integration?.workflows_count ?? totalWorkflows,  trend: 'up'      as const, description: 'Audit traces recorded'           },
    { label: 'Approved',          value: approvedCount,                                   trend: 'up'      as const, description: 'Governance pass rate'             },
    { label: 'Escalated',         value: escalatedCount,                                  trend: 'neutral' as const, description: 'Awaiting human intervention'      },
    { label: 'Blocked',           value: blockedCount,                                    trend: 'down'    as const, description: 'Policy hard blocks'               },
    { label: 'Compliance Rate',   value: complianceRate,                                  trend: 'up'      as const, description: 'Policy pass threshold'            },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Governance Command Center"
        description="Operational overview, active policy guardrails, and risk scoring for the enterprise AI workforce."
        badge={
          <span className="badge bg-status-active/10 text-status-active border border-status-active/20">
            <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse-subtle" />
            Live
          </span>
        }
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
                       border border-border text-text-secondary bg-bg-surface
                       hover:border-border-strong hover:text-text-primary transition-all"
            aria-label="Refresh command center dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <ContentWrapper>
        {/* Dashboard Hero Section */}
        <GlassCard className="border-border/80 bg-gradient-to-r from-bg-surface/80 via-bg-surface/50 to-bg-surface/30 shadow-[0_8px_32px_0_rgba(168,85,247,0.08)] relative overflow-hidden mb-6 rounded-[24px]">
          {/* Absolute backdrop glow lights */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-[200px] h-[200px] bg-blue-500/10 rounded-full blur-[60px] -z-10 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Enterprise Governance
                </span>
                <span className="flex items-center gap-1 text-xs text-status-active font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
                  Live Governance Status: {allConnected ? 'Operational' : 'Degraded'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                AgentOS Governance Pipeline
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Autonomous policy validation ledger orchestrating <strong className="text-text-primary font-semibold">7 Governance Micro-Agents</strong> with cryptographic validation via <strong className="text-purple-400 font-semibold">3 Decentralized Band Agents</strong>.
              </p>
              
              {/* Workflow run panel */}
              <div className="pt-2">
                <WorkflowCreationPanel onCreated={refetch} />
              </div>
            </div>

            {/* Real-time platform metrics dashboard panel inside hero */}
            <div className="grid grid-cols-3 gap-3 w-full lg:w-auto min-w-[280px]">
              {[
                { label: 'Workflow Count', value: integration?.workflows_count ?? totalWorkflows },
                { label: 'Audit Count', value: integration?.audit_logs_count ?? 0 },
                { label: 'Risk Count', value: integration?.risk_records_count ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="p-3 bg-bg-overlay/50 border border-border/80 rounded-xl flex flex-col justify-center min-w-[90px] text-center">
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{stat.label}</span>
                  <span className="text-2xl font-mono font-bold text-text-primary mt-1">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Governance Timeline visual workflow progression */}
          <div className="border-t border-border/40 p-6 bg-bg-surface/20">
            <p className="text-2xs text-text-muted uppercase font-bold tracking-wider mb-4">Pipeline Execution Sequence</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { name: 'MetaAgent',        provider: 'LOCAL', role: 'Orchestrator',         type: 'rule' },
                { name: 'RegistryAgent',    provider: 'LOCAL', role: 'ID Validator',         type: 'rule' },
                { name: 'SecurityAgent',    provider: 'AIML',  role: 'Secret Scanner',        type: 'ai'   },
                { name: 'ComplianceAgent',  provider: 'BAND',  role: 'Policy Guardrail',     type: 'ai',   premium: true },
                { name: 'RiskAgent',        provider: 'BAND',  role: 'Risk Score Evaluator', type: 'ai',   premium: true },
                { name: 'EscalationAgent',  provider: 'LOCAL', role: 'Escalator',            type: 'rule' },
                { name: 'AuditAgent',       provider: 'BAND',  role: 'Ledger Archiver',      type: 'ai',   premium: true },
              ].map((step, idx) => (
                <React.Fragment key={step.name}>
                  {idx > 0 && (
                    <span className="text-text-muted font-mono text-xs select-none">➔</span>
                  )}
                  <div className={`flex items-center gap-2 p-2 rounded-lg border bg-bg-surface/85 transition-all hover:scale-102 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]
                    ${step.premium 
                      ? 'border-purple-500/40 hover:border-purple-500/80 shadow-[0_0_8px_rgba(168,85,247,0.1)]' 
                      : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${step.premium ? 'bg-purple-500 animate-pulse' : 'bg-text-muted'}`} />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-2xs font-semibold font-mono text-text-primary">{step.name}</span>
                        <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded font-mono
                          ${step.provider === 'BAND' ? 'bg-purple-500/20 text-purple-300' 
                            : step.provider === 'AIML' ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-text-muted/20 text-text-secondary'
                          }`}
                        >
                          {step.provider}
                        </span>
                      </div>
                      <p className="text-[9px] text-text-muted leading-none mt-0.5">{step.role}</p>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Governance Pillars Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { emoji: '🛡️', label: 'Security', detail: 'Secret scanning' },
            { emoji: '⚖️', label: 'Compliance', detail: 'Policy guardrails' },
            { emoji: '📉', label: 'Risk', detail: 'Scoring & alerts' },
            { emoji: '🚀', label: 'Escalation', detail: 'Human-in-loop' },
            { emoji: '📝', label: 'Audit', detail: 'Immutable ledger' },
          ].map((pillar) => (
            <div key={pillar.label} className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 bg-bg-surface/40 hover:border-border-strong transition-colors">
              <span className="text-base">{pillar.emoji}</span>
              <div>
                <p className="text-2xs font-bold text-text-primary uppercase tracking-wide">{pillar.label}</p>
                <p className="text-[9px] text-text-muted">{pillar.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* KPI Stats Row */}
        <Grid cols={3} className="lg:grid-cols-5 mb-6">
          {topStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </Grid>

        {/* Workflow Health Overview */}
        <SectionContainer
          title="Workflow Health Overview"
          description="Real-time outcome distribution across all governance runs"
        >
          {wfLoading ? <LoadingSpinner /> : <WorkflowHealthRow workflows={wf} />}
        </SectionContainer>

        {/* Main middle grid */}
        <Grid cols={3}>
          {/* Left/Middle */}
          <div className="lg:col-span-2 space-y-6">

            {/* Recent Activity Table */}
            <SectionContainer
              title="Recent Workflow Activity"
              description="Chronological log of recent execution pipelines and their governance outcome"
            >
              <GlassCard padding="none" className="overflow-hidden">
                {wfLoading ? (
                  <LoadingSpinner />
                ) : wf.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-text-muted">No workflows yet. Run one above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" aria-label="Recent workflows table">
                      <thead>
                        <tr className="border-b border-border bg-bg-elevated/50">
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">Workflow</th>
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">Status</th>
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">Tier</th>
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">Decision</th>
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted">Created</th>
                          <th className="px-4 py-3 text-2xs font-semibold uppercase tracking-wider text-text-muted text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {wf.map((workflow) => (
                          <tr
                            key={workflow.id}
                            onClick={() => navigate(`/investigation?id=${workflow.id}`)}
                            className="hover:bg-bg-overlay/40 transition-colors cursor-pointer group"
                          >
                            <td className="px-4 py-3.5 max-w-[180px]">
                              <p className="text-xs font-semibold text-text-primary truncate">{workflow.agent_id || 'Unnamed Workflow'}</p>
                              <p className="text-[10px] font-mono text-text-muted truncate" title={workflow.id}>{workflow.id.slice(0, 8)}…</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge status={statusToVariant(workflow.status)} />
                            </td>
                            <td className="px-4 py-3.5">
                              <RiskBadge level={tierToRisk(workflow.tier)} showIcon />
                            </td>
                            <td className={`px-4 py-3.5 text-xs font-mono font-semibold ${decisionColor(workflow.final_decision)}`}>
                              {workflow.final_decision ?? '—'}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-text-muted">{timeAgo(workflow.created_at)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                className="inline-flex items-center gap-1 text-2xs font-medium text-text-muted group-hover:text-text-primary transition-colors"
                                aria-label={`View audit trace for ${workflow.id}`}
                              >
                                Inspect
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>
            </SectionContainer>

            {/* Risk Profile Distribution */}
            <SectionContainer
              title="Risk Profile Distribution"
              description="Governance categorization by workflow tier"
            >
              {wfLoading ? <LoadingSpinner /> : <RiskDistribution workflows={wf} />}
            </SectionContainer>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Integration Status */}
            <SectionContainer
              title="System Integration"
              description="Live connectivity status of backend services"
            >
              <GlassCard padding="md" className="border-border/60">
                <IntegrationPanel />
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-2xs text-text-muted">Overall Status</span>
                  <span className={`flex items-center gap-1.5 text-2xs ${overallColor} font-medium`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${overallDot} animate-pulse-subtle`} />
                    {overallStatus}
                  </span>
                </div>
              </GlassCard>
            </SectionContainer>

            {/* Metrics from integration */}
            {integration && (
              <SectionContainer title="Data Overview" description="Records stored across all modules">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Workflows',     value: integration.workflows_count,     icon: Activity  },
                    { label: 'Audit Logs',    value: integration.audit_logs_count,    icon: Database  },
                    { label: 'Cost Records',  value: integration.cost_records_count,  icon: TrendingUp },
                    { label: 'Risk Records',  value: integration.risk_records_count,  icon: AlertTriangle },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <div key={item.label} className="p-3 bg-bg-surface/60 border border-border rounded-lg">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-2xs text-text-muted uppercase font-semibold tracking-wide">{item.label}</span>
                          <Icon className="w-3 h-3 text-text-muted" />
                        </div>
                        <p className="text-lg font-semibold text-text-primary">{item.value}</p>
                      </div>
                    )
                  })}
                </div>
              </SectionContainer>
            )}

            {/* Agent Activity Snapshot */}
            <SectionContainer
              title="Agent Activity"
              description="Registered governance micro-agents"
            >
              <GlassCard padding="md" className="border-border/60">
                <AgentActivitySnapshot />
              </GlassCard>
            </SectionContainer>

            {/* Agent Directory */}
            <SectionContainer title="Agents Registry" description="All governance agents from DB">
              <GlassCard padding="none" className="overflow-hidden">
                <CardHeader
                  title="Registered Agents"
                  className="px-4 pt-4 pb-3"
                  actions={<span className="text-2xs text-text-muted">{integration?.agents_seeded ?? 0} Seeded</span>}
                />
                <AgentList />
              </GlassCard>
            </SectionContainer>
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}

function AgentList() {
  const { data: agents, loading } = useAgents()
  const navigate = useNavigate()

  if (loading) return <LoadingSpinner />
  if (!agents || agents.length === 0) {
    return <p className="text-2xs text-text-muted text-center py-4 px-4">No agents found.</p>
  }

  return (
    <ul className="divide-y divide-border">
      {agents.map((agent: GovernanceAgent) => (
        <li
          key={agent.agent_id}
          className="px-4 py-3 hover:bg-bg-overlay/30 transition-colors flex items-start gap-3 cursor-pointer"
          onClick={() => navigate('/agents')}
        >
          <div className="flex-shrink-0 mt-1">
            <CheckCircle2 className="w-4 h-4 text-status-active" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-text-primary truncate font-mono">{agent.name}</p>
              <span className="text-[9px] font-extrabold uppercase px-1 py-0.5 rounded bg-bg-overlay border border-border/30 text-text-muted">
                {agent.provider}
              </span>
            </div>
            <p className="text-2xs text-text-muted mt-1 leading-normal truncate">
              {agent.description}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
        </li>
      ))}
    </ul>
  )
}
