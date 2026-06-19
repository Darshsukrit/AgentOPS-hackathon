import { useSearchParams } from 'react-router-dom'
import { Activity, Loader2, Clock, Zap, Cpu } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflowPerf } from '@/hooks/useApi'
import { formatDuration } from '@/lib/utils'

function Spinner() {
  return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
}

function PerfPanel({ id }: { id: string }) {
  const { data: perf, loading } = useWorkflowPerf(id)

  if (loading) return <Spinner />
  if (!perf || perf.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="w-5 h-5" />}
        title="No token usage recorded"
        description="No performance metrics or LLM token usage recorded for this workflow."
      />
    )
  }

  const totalLatency = perf.reduce((s, p) => s + (p.latency_ms ?? 0), 0)
  const totalTokens  = perf.reduce((s, p) => s + (p.tokens_used ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Latency', value: formatDuration(totalLatency), icon: Clock },
          { label: 'Total Tokens',  value: totalTokens.toLocaleString(), icon: Zap },
          { label: 'Agent Calls',   value: perf.length.toString(), icon: Cpu },
          { label: 'Provider',      value: perf[0]?.provider ?? '—', icon: Activity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 bg-bg-surface/60 border border-border rounded-lg">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-2xs text-text-muted uppercase font-semibold">{label}</span>
              <Icon className="w-3 h-3 text-text-muted" />
            </div>
            <p className="text-lg font-semibold text-text-primary font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-agent table */}
      <GlassCard padding="none" className="overflow-hidden">
        <table className="w-full text-left border-collapse" aria-label="Performance metrics table">
          <thead>
            <tr className="border-b border-border bg-bg-elevated/40">
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Agent</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Latency</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Tokens</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Provider</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Model</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {perf.map((p) => (
              <tr key={p.id} className="hover:bg-bg-overlay/20 transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-text-secondary">{p.agent_name}</td>
                <td className="px-4 py-3 text-xs font-mono text-text-primary">{formatDuration(p.latency_ms)}</td>
                <td className="px-4 py-3 text-2xs text-text-muted">{(p.tokens_used ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-2xs text-text-muted">{p.provider ?? '—'}</td>
                <td className="px-4 py-3 text-2xs text-text-muted">{p.model ?? '—'}</td>
                <td className="px-4 py-3 text-2xs font-mono text-text-muted text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(p.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

export function Performance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: wfLoading } = useWorkflows()
  const wf = workflows ?? []
  const firstId = wf[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  return (
    <PageContainer>
      <PageHeader
        title="Performance Metrics"
        description="Latency, token utilization, provider, and model metrics per agent in the governance pipeline."
      />
      <ContentWrapper>
        <Grid cols={3}>
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

          <div className="lg:col-span-2 space-y-6">
            <SectionContainer
              title="Performance Data"
              description={selectedId ? `Metrics for ${selectedId.slice(0, 10)}…` : 'Select a workflow'}
            >
              {selectedId ? (
                <PerfPanel id={selectedId} />
              ) : (
                <GlassCard>
                  <EmptyState icon={<Activity className="w-5 h-5" />} title="No Workflow Selected" description="Select a workflow from the left." />
                </GlassCard>
              )}
            </SectionContainer>
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
