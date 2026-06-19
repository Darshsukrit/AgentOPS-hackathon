import React from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MessageSquare,
  Users,
  RefreshCw,
  Loader2,
  User,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { AgentBadge } from '@/components/ui/AgentBadge'
import { DecisionBadge } from '@/components/ui/DecisionBadge'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflow, useWorkflowAudit } from '@/hooks/useApi'

// Helper to resolve provider based on locked governance mapping
function getAgentProvider(agentName: string): 'local' | 'aiml' | 'band' {
  if (['MetaAgent', 'RegistryAgent', 'EscalationAgent', 'Orchestrator'].includes(agentName)) {
    return 'local'
  }
  if (agentName === 'SecurityAgent') {
    return 'aiml'
  }
  if (['ComplianceAgent', 'RiskAgent', 'AuditAgent'].includes(agentName)) {
    return 'band'
  }
  return 'local'
}

// Helper to get initials for avatar
function getAgentInitials(name: string): string {
  if (name === 'MetaAgent') return 'MA'
  if (name === 'RegistryAgent') return 'RA'
  if (name === 'SecurityAgent') return 'SA'
  if (name === 'ComplianceAgent') return 'CA'
  if (name === 'RiskAgent') return 'Ri'
  if (name === 'EscalationAgent') return 'EA'
  if (name === 'AuditAgent') return 'AA'
  return 'SYS'
}

// Helper to resolve risk tier to level
function riskFromTier(tier: string): 'low' | 'medium' | 'high' | 'critical' {
  if (tier === 'high') return 'high'
  if (tier === 'medium') return 'medium'
  return 'low'
}

export function Collaboration() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows()

  const list = workflows ?? []
  const firstId = list[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  const { data: workflow, loading: workflowLoading } = useWorkflow(selectedId)
  const { data: auditLogs, loading: auditLoading, refetch: refetchAudit } = useWorkflowAudit(selectedId)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever selected workflow or logs change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedId, auditLogs])

  const handleSelect = (id: string) => {
    setSearchParams({ id })
  }

  const handleRefresh = () => {
    refetchWorkflows()
    if (selectedId) {
      refetchAudit()
    }
  }

  return (
    <PageContainer>
      {/* Background glowing mesh orb */}
      <div className="fixed inset-0 pointer-events-none collaboration-glow z-0 opacity-40" aria-hidden="true" />

      <PageHeader
        title="Governance Collaboration Room"
        description="Multi-agent secure war-room workspace. Track consensus debates, cryptographic ledger entries, and final syntheses."
        badge={
          <span className="badge bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <Users className="w-3 h-3 mr-1" />
            Live Session
          </span>
        }
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-text-secondary bg-bg-surface hover:border-border-strong hover:text-text-primary transition-all shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Room
          </button>
        }
      />

      <ContentWrapper>
        <Grid cols={3} className="h-[calc(100vh-230px)] gap-6 min-h-[500px]">
          {/* Left Panel: Active Workrooms (Workflows) */}
          <div className="h-full flex flex-col space-y-4">
            <div className="flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-text-muted tracking-wider">Active Workrooms</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Select a governance channel</p>
              </div>
            </div>

            <GlassCard padding="none" className="flex-1 overflow-hidden flex flex-col border-border/60">
              {workflowsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                </div>
              ) : list.length === 0 ? (
                <div className="h-full flex items-center justify-center p-4">
                  <EmptyState title="No active channels" description="Trigger a workflow to begin." />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                  {list.map((w) => {
                    const isActive = w.id === selectedId
                    return (
                      <button
                        key={w.id}
                        onClick={() => handleSelect(w.id)}
                        className={`w-full text-left p-4 transition-all duration-200 border-l-2 flex flex-col gap-2 ${
                          isActive
                            ? 'bg-purple-950/20 border-purple-500/80 shadow-[inset_0_0_12px_rgba(168,85,247,0.08)]'
                            : 'hover:bg-white/[0.02] border-transparent'
                        }`}
                        aria-label={`Join channel ${w.agent_id}`}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                            #{w.agent_id || 'Governance Flow'}
                          </span>
                          <span className="text-[9px] font-mono text-text-muted flex-shrink-0">
                            {w.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between w-full text-[10px] text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <RiskBadge level={riskFromTier(w.tier)} showIcon={false} className="scale-75 origin-left" />
                            {w.band_room_id && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 text-[8px] font-bold border border-purple-500/20">
                                BAND
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-active mr-1 animate-pulse" />
                            {w.status}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Panel: Collaboration feed */}
          <div className="lg:col-span-2 h-full flex flex-col space-y-4">
            {selectedId ? (
              <GlassCard padding="none" className="flex-1 overflow-hidden flex flex-col border-border/80 relative bg-bg-surface/30">
                {/* Workroom Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-border/50 bg-bg-overlay/20 flex items-center justify-between flex-wrap gap-4">
                  {workflowLoading ? (
                    <div className="h-10 flex items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                    </div>
                  ) : workflow ? (
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-text-primary truncate">
                          # {workflow.agent_id || 'Unnamed Workflow'}
                        </h2>
                        <span className="text-[10px] text-text-muted font-mono bg-bg-overlay/50 border border-border px-2 py-0.5 rounded flex-shrink-0">
                          ID: {workflow.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-2xs text-text-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Owner: {workflow.owner || 'System'}
                        </span>
                        {workflow.band_room_id && (
                          <span className="text-purple-300 font-medium flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-ping" />
                            Band Room: {workflow.band_room_id}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    {workflow && (
                      <>
                        <div className="flex flex-col items-end mr-2 text-right">
                          <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">Outcome</span>
                          {workflow.final_decision ? (
                            <DecisionBadge decision={workflow.final_decision as any} className="mt-0.5 scale-90 origin-right" />
                          ) : (
                            <span className="text-2xs font-semibold text-text-muted mt-0.5">PENDING</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Chat Message Stream */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {auditLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : !auditLogs || auditLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <EmptyState
                        icon={<MessageSquare className="w-6 h-6 text-purple-400" />}
                        title="No entries in this workroom"
                        description="Audit logs have not been recorded yet."
                      />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {auditLogs.map((log) => {
                        const provider = getAgentProvider(log.agent_name)
                        const initials = getAgentInitials(log.agent_name)
                        
                        return (
                          <div
                            key={log.id}
                            className={`flex gap-4 animate-fade-in group ${
                              log.agent_name === 'AuditAgent' ? 'items-start' : 'items-start'
                            }`}
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-extrabold shadow-lg relative ${
                                provider === 'band' ? 'bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border-purple-500/40 text-purple-200' :
                                provider === 'aiml' ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300' :
                                'bg-zinc-900/60 border-zinc-700/40 text-zinc-300'
                              }`}>
                                {initials}
                                {/* Pulsing activity indicator */}
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-bg-surface ${
                                  provider === 'band' ? 'bg-purple-400' :
                                  provider === 'aiml' ? 'bg-cyan-400' :
                                  'bg-zinc-400'
                                }`} />
                              </div>
                            </div>

                            {/* Message Bubble container */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-text-primary hover:text-white transition-colors cursor-default">
                                  {log.agent_name}
                                </span>
                                <AgentBadge provider={provider} />
                                <span className="text-[9px] text-text-muted font-mono ml-auto">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>

                              {/* Message bubble */}
                              <div className={`mt-2 p-3.5 rounded-xl border leading-relaxed text-xs max-w-full ${
                                provider === 'band' ? 'bg-purple-950/10 border-purple-500/15 text-text-secondary hover:border-purple-500/25 transition-colors' :
                                provider === 'aiml' ? 'bg-cyan-950/10 border-cyan-500/15 text-text-secondary hover:border-cyan-500/25 transition-colors' :
                                'bg-bg-surface/40 border-border text-text-secondary'
                              }`}>
                                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                                  <span className="font-semibold text-text-primary uppercase text-[10px] tracking-wide">
                                    {log.action}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-[10px] text-text-muted font-semibold">
                                      Confidence: {Math.round((log.confidence ?? 0) * 100)}%
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold border ${
                                      log.decision === 'APPROVED' || log.decision === 'INITIATED' || log.decision === 'SUCCESS' ? 'bg-status-active/10 border-status-active/20 text-status-active' :
                                      log.decision === 'BLOCKED' || log.decision === 'FAILED' || log.decision === 'ERROR' ? 'bg-status-error/10 border-status-error/20 text-status-error' :
                                      'bg-status-warning/10 border-status-warning/20 text-status-warning'
                                    }`}>
                                      {log.decision}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">
                                  {log.reasoning}
                                </p>
                                {log.recommendation && (
                                  <div className="mt-3 p-2 bg-black/20 border border-white/5 rounded text-[11px] text-text-muted leading-relaxed">
                                    <span className="font-bold text-text-secondary text-2xs uppercase">Recommendation: </span>
                                    {log.recommendation}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Footer status input simulation */}
                <div className="flex-shrink-0 p-4 border-t border-border/50 bg-bg-overlay/10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-status-active animate-ping flex-shrink-0 ml-2" />
                  <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider flex-1">
                    Secure Ledger Channel: Streaming live validation logs...
                  </span>
                  <div className="text-[10px] font-mono text-text-muted mr-2">
                    TLS 1.3 SECURE
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<MessageSquare className="w-8 h-8" />}
                  title="No channel active"
                  description="Select a workroom from the left pane to view dynamic agent collaboration logs."
                />
              </GlassCard>
            )}
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
