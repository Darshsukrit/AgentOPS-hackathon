import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ShieldCheck, Loader2, Clock } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { RiskBadge } from '@/components/ui/RiskBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useWorkflows, useWorkflowRisk } from '@/hooks/useApi'

function Spinner() {
  return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
}

function RiskPanel({ id }: { id: string }) {
  const { data: risks, loading } = useWorkflowRisk(id)

  if (loading) return <Spinner />
  if (!risks || risks.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheck className="w-5 h-5 text-status-active" />}
        title="No Risk Findings"
        description="Risk evaluation completed with no anomalies."
      />
    )
  }

  return (
    <div className="space-y-4">
      {risks.map((risk) => (
        <GlassCard key={risk.id} padding="md" className="border-border/60">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  Classification: {risk.severity ? risk.severity.toUpperCase() : '—'}
                </p>
                <p className="text-2xs text-text-muted mt-0.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(risk.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            {risk.severity && <RiskBadge level={risk.severity as 'low' | 'medium' | 'high' | 'critical'} showIcon />}
          </div>

          {(risk.findings ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-2xs text-text-muted uppercase font-semibold mb-2">Exposure Signals</p>
              <ul className="space-y-1.5">
                {(risk.findings ?? []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                    <AlertTriangle className="w-3 h-3 text-status-warning flex-shrink-0 mt-0.5" />
                    {f.replace(/\(\+\d+\)/g, '').trim()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(risk.recommendations ?? []).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-2xs text-text-muted uppercase font-semibold mb-2">Recommendations</p>
              <ul className="space-y-1.5">
                {(risk.recommendations ?? []).map((r, i) => (
                  <li key={i} className="text-2xs text-text-muted bg-bg-surface/50 border border-border p-2 rounded">
                    <span className="font-semibold text-text-primary uppercase tracking-wide">Action: </span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {risk.risk_score !== null && risk.risk_score !== undefined && (
            <details className="mt-3 text-[10px] text-text-muted">
              <summary className="cursor-pointer font-mono uppercase tracking-wide">Internal score detail</summary>
              <p className="mt-1 font-mono">{Math.round(risk.risk_score)}/100</p>
            </details>
          )}
        </GlassCard>
      ))}
    </div>
  )
}

export function Risk() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: workflows, loading: wfLoading } = useWorkflows()
  const wf = workflows ?? []
  const firstId = wf[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  return (
    <PageContainer>
      <PageHeader
        title="Risk Assessment"
        description="Business impact classifications, exposure findings, and recommendations from the Risk Agent."
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
                        className={`w-full text-left p-3 transition-colors text-xs border-l-2 ${w.id === selectedId ? 'bg-bg-overlay/60 border-text-primary' : 'hover:bg-bg-overlay/20 border-transparent'
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
              title="Risk Findings"
              description={selectedId ? `Risk assessment for ${selectedId.slice(0, 10)}…` : 'Select a workflow'}
            >
              {selectedId ? (
                <RiskPanel id={selectedId} />
              ) : (
                <GlassCard>
                  <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="No Workflow Selected" description="Select a workflow from the left." />
                </GlassCard>
              )}
            </SectionContainer>
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
