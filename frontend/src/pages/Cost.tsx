import { useSearchParams } from 'react-router-dom'
import { DollarSign, Loader2, Clock } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflowCost } from '@/hooks/useApi'
import { formatCost } from '@/lib/utils'

function Spinner() {
  return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
}

function CostPanel({ id }: { id: string }) {
  const { data: costs, loading } = useWorkflowCost(id)

  if (loading) return <Spinner />
  const totalCost   = costs ? costs.reduce((s, c) => s + (c.total_cost ?? 0), 0) : 0
  const totalTokens = costs ? costs.reduce((s, c) => s + (c.tokens_used ?? 0), 0) : 0

  if (!costs || costs.length === 0 || (totalCost === 0 && totalTokens === 0)) {
    return (
      <EmptyState
        icon={<DollarSign className="w-5 h-5" />}
        title="Cost tracking not yet available"
        description="No token consumption or financial cost records have been registered for this workflow trace yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Cost',    value: formatCost(totalCost) },
          { label: 'Total Tokens',  value: totalTokens.toLocaleString() },
          { label: 'Agent Calls',   value: costs.length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="p-3 bg-bg-surface/60 border border-border rounded-lg">
            <span className="text-2xs text-text-muted uppercase font-semibold">{label}</span>
            <p className="text-lg font-semibold text-text-primary mt-1 font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Per-agent cost breakdown */}
      <GlassCard padding="none" className="overflow-hidden">
        <table className="w-full text-left border-collapse" aria-label="Cost breakdown table">
          <thead>
            <tr className="border-b border-border bg-bg-elevated/40">
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Agent</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Tokens</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Token Cost</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Total Cost</th>
              <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {costs.map((c) => (
              <tr key={c.id} className="hover:bg-bg-overlay/20 transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-text-secondary">{c.agent_name}</td>
                <td className="px-4 py-3 text-xs font-mono text-text-primary">{(c.tokens_used ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-mono text-text-muted">{formatCost(c.token_cost)}</td>
                <td className="px-4 py-3 text-xs font-mono font-semibold text-status-active">{formatCost(c.total_cost)}</td>
                <td className="px-4 py-3 text-2xs font-mono text-text-muted text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(c.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  )
}

export function Cost() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: wfLoading } = useWorkflows()
  const wf = workflows ?? []
  const firstId = wf[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  return (
    <PageContainer>
      <PageHeader
        title="Cost Tracking"
        description="Per-agent token consumption, token cost, and total financial cost per governance workflow."
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
              title="Cost Breakdown"
              description={selectedId ? `Cost analysis for ${selectedId.slice(0, 10)}…` : 'Select a workflow'}
            >
              {selectedId ? (
                <CostPanel id={selectedId} />
              ) : (
                <GlassCard>
                  <EmptyState icon={<DollarSign className="w-5 h-5" />} title="No Workflow Selected" description="Select a workflow from the left." />
                </GlassCard>
              )}
            </SectionContainer>
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
