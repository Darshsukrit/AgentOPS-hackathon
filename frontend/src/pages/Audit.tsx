import { useSearchParams } from 'react-router-dom'
import { FileText, Loader2, Clock, RefreshCw } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflowAudit } from '@/hooks/useApi'

function Spinner() {
  return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
}

function timeAgo(s: string) {
  const d = Date.now() - new Date(s).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function AuditTable({ id }: { id: string }) {
  const { data: audit, loading, refetch } = useWorkflowAudit(id)

  if (loading) return <Spinner />
  if (!audit || audit.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-5 h-5" />}
        title="No Audit Logs"
        description="No audit entries recorded for this workflow."
      />
    )
  }

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-elevated/50">
        <span className="text-xs font-semibold text-text-primary">{audit.length} entries</span>
        <button onClick={refetch} className="text-2xs text-text-muted hover:text-text-secondary flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Audit log table">
          <thead>
            <tr className="border-b border-border bg-bg-elevated/40">
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Agent</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Action</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Decision</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Confidence</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Reasoning</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {audit.map((entry) => (
              <tr key={entry.id} className="hover:bg-bg-overlay/20 transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-text-secondary">{entry.agent_name}</td>
                <td className="px-4 py-3 text-xs text-text-primary">{entry.action}</td>
                <td className={`px-4 py-3 text-2xs font-mono font-bold ${
                  entry.decision === 'APPROVED' ? 'text-status-active'
                  : entry.decision === 'BLOCKED' ? 'text-status-error'
                  : 'text-status-warning'
                }`}>{entry.decision}</td>
                <td className="px-4 py-3 text-2xs text-text-muted">{Math.round((entry.confidence ?? 0) * 100)}%</td>
                <td className="px-4 py-3 text-2xs text-text-muted max-w-xs truncate" title={entry.reasoning}>{entry.reasoning}</td>
                <td className="px-4 py-3 text-2xs font-mono text-text-muted text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {timeAgo(entry.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  )
}

export function Audit() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: wfLoading } = useWorkflows()
  const wf = workflows ?? []
  const firstId = wf[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  return (
    <PageContainer>
      <PageHeader
        title="Audit Log Center"
        description="Complete audit history of all agent decisions, confidence scores, and governance reasoning chains."
      />
      <ContentWrapper>
        <Grid cols={3}>
          {/* Left: Workflow selector */}
          <div>
            <SectionContainer title="Select Workflow" description="Choose a trace to inspect">
              <GlassCard padding="none" className="overflow-hidden">
                {wfLoading ? <Spinner /> : wf.length === 0 ? (
                  <EmptyState title="No Workflows" description="Run a workflow first." />
                ) : (
                  <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                    {wf.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSearchParams({ id: w.id })}
                        className={`w-full text-left p-3 transition-colors text-xs border-l-2 ${
                          w.id === selectedId ? 'bg-bg-overlay/60 border-text-primary' : 'hover:bg-bg-overlay/20 border-transparent'
                        }`}
                      >
                        <p className="font-semibold text-text-primary truncate">{w.agent_id || 'Unnamed Workflow'}</p>
                        <p className="text-2xs text-text-muted mt-0.5"><span className="font-mono">{w.id.slice(0, 8)}…</span> · <span className="capitalize">{w.status} · {w.tier}</span></p>
                      </button>
                    ))}
                  </div>
                )}
              </GlassCard>
            </SectionContainer>
          </div>

          {/* Right: Audit table */}
          <div className="lg:col-span-2 space-y-6">
            <SectionContainer
              title="Audit Entries"
              description={selectedId ? `Audit log for workflow ${selectedId.slice(0, 10)}…` : 'Select a workflow'}
            >
              {selectedId ? (
                <AuditTable id={selectedId} />
              ) : (
                <GlassCard>
                  <EmptyState icon={<FileText className="w-5 h-5" />} title="No Workflow Selected" description="Select a workflow from the left." />
                </GlassCard>
              )}
            </SectionContainer>
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
