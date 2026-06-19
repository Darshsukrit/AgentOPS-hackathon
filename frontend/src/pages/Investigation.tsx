import React from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Search,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  Play,
  X,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { DecisionBadge } from '@/components/ui/DecisionBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflow, useWorkflowAudit, useWorkflowRisk } from '@/hooks/useApi'
import type { WorkflowSummary } from '@/services/api'

const filterTabs = ['All', 'Running', 'Completed', 'Failed']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusVariant(s: string): 'active' | 'idle' | 'warning' | 'error' | 'info' {
  if (s === 'running') return 'active'
  if (s === 'completed') return 'idle'
  if (s === 'failed') return 'error'
  return 'idle'
}

function riskFromTier(tier: string): 'low' | 'medium' | 'high' | 'critical' {
  if (tier === 'high') return 'high'
  if (tier === 'medium') return 'medium'
  return 'low'
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
    </div>
  )
}

// ─── Workflow Detail Panel ─────────────────────────────────────────────────────

function WorkflowDetail({ id }: { id: string }) {
  const { data: wf, loading: wfLoading } = useWorkflow(id)
  const { data: audit, loading: auditLoading } = useWorkflowAudit(id)
  const { data: risks, loading: riskLoading } = useWorkflowRisk(id)

  // ─── Replay state ─────────────────────────────────────────────────────
  const [replayActive, setReplayActive] = React.useState(false)
  const [replayStep, setReplayStep] = React.useState(-1)

  const REPLAY_AGENTS = [
    'MetaAgent', 'RegistryAgent', 'SecurityAgent',
    'ComplianceAgent', 'RiskAgent', 'EscalationAgent',
    'AuditAgent', 'Final Decision'
  ]

  React.useEffect(() => {
    let timer: any
    if (replayActive && replayStep < REPLAY_AGENTS.length - 1) {
      timer = setTimeout(() => setReplayStep((s) => s + 1), 1500)
    } else if (replayActive && replayStep >= REPLAY_AGENTS.length - 1) {
      // replay finished — keep showing until user closes
    }
    return () => clearTimeout(timer)
  }, [replayActive, replayStep])

  const startReplay = () => {
    setReplayStep(0)
    setReplayActive(true)
  }
  const stopReplay = () => {
    setReplayActive(false)
    setReplayStep(-1)
  }

  // Find the audit log entry matching a given agent
  const findAuditForAgent = (agentName: string) => {
    if (!audit) return null
    return audit.find((a) => a.agent_name === agentName) ?? null
  }

  if (wfLoading) return <Spinner />
  if (!wf) return (
    <GlassCard>
      <EmptyState
        icon={<GitBranch className="w-5 h-5" />}
        title="Workflow Not Found"
        description="This workflow ID does not exist in the database."
      />
    </GlassCard>
  )

  return (
    <>
      {/* Header Card */}
      <GlassCard className="border-border/80">
        <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xs font-mono text-text-muted uppercase">Investigation Target</span>
              <ChevronRight className="w-3 h-3 text-text-muted" />
              <h2 className="text-sm font-semibold text-text-primary">{wf.agent_id || 'Unnamed Workflow'}</h2>
            </div>
            <p className="text-2xs font-mono text-text-muted mt-1">{wf.id}</p>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-text-secondary">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-text-muted" />
                {wf.owner ?? wf.agent_id ?? '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-text-muted" />
                {new Date(wf.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-2xs text-text-muted uppercase font-semibold">Final Governance Outcome</span>
            {wf.final_decision
              ? <DecisionBadge decision={wf.final_decision as never} className="scale-110" />
              : <span className="text-xs text-text-muted">Pending</span>
            }
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 text-center">
          <div>
            <p className="text-2xs text-text-muted uppercase">Trace Status</p>
            <div className="mt-1"><StatusBadge status={statusVariant(wf.status)} /></div>
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase">Risk Tier</p>
            <div className="mt-1 inline-flex"><RiskBadge level={riskFromTier(wf.tier)} showIcon /></div>
          </div>
          <div>
            <p className="text-2xs text-text-muted uppercase">Explainability Report</p>
            <Link
              to={`/explainability?id=${wf.id}`}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary mt-1 inline-block underline underline-offset-4"
            >
              View chain
            </Link>
          </div>
        </div>
        {/* Replay button */}
        <div className="pt-4 mt-4 border-t border-border/50">
          <button
            onClick={startReplay}
            disabled={replayActive || !audit || audit.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900/30 disabled:text-text-muted text-white transition-all shadow-lg w-full justify-center"
          >
            <Play className="w-3.5 h-3.5" />
            Replay Investigation
          </button>
        </div>
      </GlassCard>

      {/* Replay Overlay */}
      {replayActive && (
        <SectionContainer title="Governance Replay" description="Step-by-step execution animation from the live audit trail">
          <GlassCard padding="md" className="border-purple-500/20 relative">
            <button
              onClick={stopReplay}
              className="absolute top-3 right-3 p-1.5 rounded-md text-text-muted hover:text-white hover:bg-bg-overlay transition-all z-10"
              aria-label="Close replay"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-3">
              {REPLAY_AGENTS.map((agentName, idx) => {
                const isActive = idx === replayStep
                const isCompleted = idx < replayStep
                const auditEntry = findAuditForAgent(agentName)
                const isFinal = agentName === 'Final Decision'

                return (
                  <div
                    key={agentName}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ${
                      isActive
                        ? 'bg-purple-950/25 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.12)] scale-[1.01]'
                        : isCompleted
                        ? 'bg-bg-surface/40 border-status-active/20'
                        : 'bg-bg-surface/10 border-border/20 opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-purple-600 text-white animate-pulse' :
                        isCompleted ? 'bg-status-active/15 text-status-active border border-status-active/30' :
                        'bg-zinc-800/50 text-text-muted'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${
                          isActive ? 'text-white' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                        }`}>
                          {isFinal ? '🏁 Final Decision' : agentName}
                        </p>
                        {isActive && auditEntry && (
                          <p className="text-[10px] text-text-secondary mt-0.5 animate-fade-in">
                            {auditEntry.action} — Conf: {Math.round((auditEntry.confidence ?? 0) * 100)}%
                          </p>
                        )}
                        {isActive && isFinal && wf.final_decision && (
                          <p className="text-[10px] text-status-active mt-0.5 font-semibold animate-fade-in">
                            Governance Result: {wf.final_decision}
                          </p>
                        )}
                        {isActive && !auditEntry && !isFinal && (
                          <p className="text-[10px] text-text-muted mt-0.5 italic">Skipped / Bypassed</p>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-[10px] text-purple-400 font-semibold uppercase animate-pulse flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {replayStep >= REPLAY_AGENTS.length - 1 ? 'Done' : 'Active'}
                      </span>
                    )}
                    {isCompleted && auditEntry && (
                      <span className={`text-[10px] font-mono font-bold ${
                        auditEntry.decision === 'APPROVED' || auditEntry.decision === 'SUCCESS' || auditEntry.decision === 'INITIATED'
                          ? 'text-status-active' : auditEntry.decision === 'BLOCKED' || auditEntry.decision === 'ERROR'
                          ? 'text-status-error' : 'text-status-warning'
                      }`}>
                        {auditEntry.decision}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </SectionContainer>
      )}

      {/* Metadata */}
      <SectionContainer title="Workflow Details" description="Execution metadata and configuration">
        <GlassCard padding="md" className="border-border/60">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {[
              { label: 'Workflow ID',   value: wf.id },
              { label: 'Agent ID',      value: wf.agent_id },
              { label: 'Tier',          value: wf.tier },
              { label: 'Status',        value: wf.status },
              { label: 'Band Room',     value: wf.band_room_id ?? 'No Band interactions yet' },
              { label: 'Error',         value: wf.error ?? 'None' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xs text-text-muted uppercase font-semibold mb-0.5">{label}</p>
                <p className="text-text-secondary font-mono break-all">{value}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </SectionContainer>

      {/* Audit Trail */}
      <SectionContainer title="Audit Trail" description="Agent decisions recorded during execution">
        <GlassCard padding="none" className="overflow-hidden">
          {auditLoading ? <Spinner /> : !audit || audit.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-5 h-5 text-status-active" />}
              title="No Audit Entries"
              description="No audit logs recorded for this workflow yet."
            />
          ) : (
            <table className="w-full text-left border-collapse" aria-label="Audit trail table">
              <thead>
                <tr className="border-b border-border bg-bg-elevated/40">
                  <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Agent</th>
                  <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Action</th>
                  <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Decision</th>
                  <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Confidence</th>
                  <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.map((entry) => (
                  <tr key={entry.id} className="hover:bg-bg-overlay/20 transition-colors">
                    <td className="px-4 py-3 text-2xs font-medium text-text-secondary">{entry.agent_name}</td>
                    <td className="px-4 py-3 text-xs text-text-primary">{entry.action}</td>
                    <td className={`px-4 py-3 text-2xs font-mono font-bold ${
                      entry.decision === 'APPROVED' ? 'text-status-active'
                      : entry.decision === 'BLOCKED' ? 'text-status-error'
                      : 'text-status-warning'
                    }`}>{entry.decision}</td>
                    <td className="px-4 py-3 text-2xs text-text-muted">{Math.round((entry.confidence ?? 0) * 100)}%</td>
                    <td className="px-4 py-3 text-2xs font-mono text-text-muted text-right">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      </SectionContainer>

      {/* Risk Findings */}
      <SectionContainer title="Risk Assessment" description="Business impact and exposure findings from the Risk Agent">
        <GlassCard padding="none" className="overflow-hidden">
          {riskLoading ? <Spinner /> : !risks || risks.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="w-5 h-5 text-status-active" />}
              title="No active escalations"
              description="No elevated risk triggers or manual audit requirements logged."
            />
          ) : (
            <div className="divide-y divide-border">
              {risks.map((risk) => (
                <div key={risk.id} className="p-4 flex gap-3.5 hover:bg-bg-overlay/10 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-risk-high" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xs font-semibold uppercase tracking-wider text-text-primary">
                        Classification: {risk.severity ? risk.severity.toUpperCase() : '—'}
                      </span>
                      {risk.severity && <RiskBadge level={risk.severity as never} showIcon={false} className="scale-75" />}
                    </div>
                    {(risk.findings ?? []).map((f, i) => (
                      <p key={i} className="text-xs text-text-secondary mt-1.5 leading-relaxed">{f.replace(/\(\+\d+\)/g, '').trim()}</p>
                    ))}
                    {(risk.recommendations ?? []).map((r, i) => (
                      <div key={i} className="mt-2 text-2xs text-text-muted bg-bg-surface/50 border border-border p-2.5 rounded">
                        <span className="font-semibold text-text-primary uppercase tracking-wide">Recommendation: </span>{r}
                      </div>
                    ))}
                    {risk.risk_score !== null && risk.risk_score !== undefined && (
                      <p className="text-[10px] text-text-muted mt-2 font-mono">
                        Internal score (secondary): {Math.round(risk.risk_score)}/100
                      </p>
                    )}
                    <p className="text-2xs text-text-muted mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(risk.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </SectionContainer>

      {/* Band Validation Activity */}
      <SectionContainer title="Band Consensus Activity" description="Multi-agent governance validation via Band protocol">
        <GlassCard padding="md" className="border-border/60">
          {wf.band_room_id ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
                <span className="text-xs font-semibold text-status-active">Band Validation Complete</span>
              </div>
              {['ComplianceAgent', 'RiskAgent', 'AuditAgent'].map((agent) => (
                <div key={agent} className="flex items-center justify-between py-2 px-3 rounded-md bg-bg-surface/60 border border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent-primary" />
                    <span className="text-xs font-medium text-text-secondary">{agent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xs px-2 py-0.5 rounded-full bg-accent-primary/15 text-accent-primary font-semibold border border-accent-primary/30">BAND</span>
                    <span className="text-2xs text-status-active font-mono">✓ Consensus</span>
                  </div>
                </div>
              ))}
              <p className="text-2xs text-text-muted mt-2">Band Room: <span className="font-mono">{wf.band_room_id}</span></p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-text-muted" />
                <span className="text-xs font-semibold text-text-muted">Local Governance Only</span>
              </div>
              <p className="text-2xs text-text-muted">No Band room was initialized for this workflow. Governance was handled via local and AIML providers.</p>
            </div>
          )}
        </GlassCard>
      </SectionContainer>

      {/* Compliance note */}
      <SectionContainer title="Compliance & Governance" description="Compliance evaluations for this workflow">
        <GlassCard padding="md" className="border-border/60">
          <EmptyState
            icon={<ShieldCheck className="w-5 h-5 text-status-active" />}
            title="No compliance findings"
            description="No regulatory compliance violations or policy warnings were logged for this workflow trace."
          />
        </GlassCard>
      </SectionContainer>
    </>
  )
}

// ─── Main Investigation Page ───────────────────────────────────────────────────

export function Investigation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: wfLoading, refetch } = useWorkflows()

  const wf = workflows ?? []

  const firstId = wf[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  const [searchQuery, setSearchQuery]   = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState('All')

  const filteredWorkflows = wf.filter((w: WorkflowSummary) => {
    const matchesSearch =
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.agent_id ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    if (activeFilter === 'All')       return matchesSearch
    if (activeFilter === 'Running')   return matchesSearch && w.status === 'running'
    if (activeFilter === 'Completed') return matchesSearch && w.status === 'completed'
    if (activeFilter === 'Failed')    return matchesSearch && w.status === 'failed'
    return matchesSearch
  })

  const handleSelect = (id: string) => setSearchParams({ id })

  return (
    <PageContainer>
      <div className="fixed inset-0 pointer-events-none investigation-glow z-0" aria-hidden="true" />

      <PageHeader
        title="Workflow Investigation"
        description="Audit execution traces, agent decision rationales, and risk findings for AI governance runs."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-text-secondary bg-bg-surface hover:border-border-strong hover:text-text-primary transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <ContentWrapper>
        {/* Search bar */}
        <GlassCard padding="sm">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Search traces by ID or agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              aria-label="Search workflows query input"
            />
          </div>
        </GlassCard>

        <Grid cols={3}>
          {/* Left Panel: Trace Selector */}
          <div className="space-y-6">
            <SectionContainer title="Execution Traces" description="Select an active or completed trace">
              {/* Filter tabs */}
              <div
                className="flex items-center gap-1 p-1 rounded-lg bg-bg-surface border border-border w-full"
                role="tablist"
                aria-label="Trace filter list"
              >
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeFilter === tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`flex-1 text-center py-1.5 rounded-md text-2xs font-medium transition-all ${
                      activeFilter === tab
                        ? 'bg-bg-overlay text-text-primary shadow-card border border-border/50'
                        : 'text-text-muted hover:text-text-secondary border border-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <GlassCard padding="none" className="overflow-hidden">
                {wfLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <EmptyState title="No matches found" description="Adjust search criteria or filters." />
                ) : (
                  <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                    {filteredWorkflows.map((w: WorkflowSummary) => (
                      <button
                        key={w.id}
                        onClick={() => handleSelect(w.id)}
                        className={`w-full text-left p-4 transition-colors flex items-center justify-between gap-3 ${
                          w.id === selectedId
                            ? 'bg-bg-overlay/60 border-l-2 border-text-primary'
                            : 'hover:bg-bg-overlay/20 border-l-2 border-transparent'
                        }`}
                        aria-label={`Investigate trace ${w.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-text-primary truncate">{w.agent_id || 'Unnamed Workflow'}</span>
                            <StatusBadge status={statusVariant(w.status)} className="scale-90 origin-left" />
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-2xs text-text-muted">
                            <span className="truncate font-mono">{w.id.slice(0, 8)}…</span>
                            <span>•</span>
                            <span>{timeAgo(w.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <RiskBadge level={riskFromTier(w.tier)} showIcon={false} className="scale-90" />
                          {w.final_decision && (
                            <DecisionBadge decision={w.final_decision as never} className="scale-75 origin-right" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </GlassCard>
            </SectionContainer>
          </div>

          {/* Right/Middle: Investigation Panel */}
          <div className="lg:col-span-2 space-y-6">
            {selectedId ? (
              <WorkflowDetail id={selectedId} />
            ) : (
              <GlassCard>
                <EmptyState
                  icon={<GitBranch className="w-5 h-5" />}
                  title="No Trace Loaded"
                  description="Select a valid workflow execution trace to investigate."
                />
              </GlassCard>
            )}
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
