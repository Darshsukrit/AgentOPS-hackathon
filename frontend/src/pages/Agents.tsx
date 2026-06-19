import React from 'react'
import { Cpu, Loader2, Search } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgentBadge } from '@/components/ui/AgentBadge'
import { useGovernanceAgents } from '@/hooks/useApi'
import type { GovernanceAgent } from '@/services/api'

function Spinner() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>
}

export function Agents() {
  const { data: agents, loading, refetch } = useGovernanceAgents()
  const [search, setSearch] = React.useState('')

  const filtered = (agents ?? []).filter((a: GovernanceAgent) =>
    a.agent_id.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageContainer>
      <PageHeader
        title="AI Agent Directory"
        description="Registry of all registered governance micro-agents, their models, owners, and operational tiers."
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-text-secondary bg-bg-surface hover:border-border-strong hover:text-text-primary transition-all"
          >
            Refresh
          </button>
        }
      />
      <ContentWrapper>
        {/* Search */}
        <GlassCard padding="sm">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
            <input
              type="text"
              placeholder="Search agents by ID, name, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
          </div>
        </GlassCard>

        {loading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={<Cpu className="w-5 h-5" />}
              title={agents && agents.length > 0 ? 'No Matches' : 'No Agents Found'}
              description={agents && agents.length > 0 ? 'Adjust search terms.' : 'Live governance agents could not be loaded.'}
            />
          </GlassCard>
        ) : (
          <>
            <SectionContainer
              title="Agent Registry"
              description={`${filtered.length} agent${filtered.length === 1 ? '' : 's'} active in governance pipeline`}
            >
              <Grid cols={3} className="lg:grid-cols-3">
                {filtered.map((agent: GovernanceAgent) => (
                  <GlassCard key={agent.agent_id} padding="md" className="border-border/60 flex flex-col gap-3 min-h-[160px]">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-bg-overlay border border-border flex items-center justify-center flex-shrink-0">
                          <Cpu className="w-4 h-4 text-text-secondary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate font-mono">{agent.name}</p>
                          <p className="text-2xs text-text-muted capitalize">{agent.type} Agent</p>
                        </div>
                      </div>
                      <AgentBadge provider={agent.provider} />
                    </div>

                    {/* Purpose / Description */}
                    <div className="pt-2 border-t border-border/40 flex-1">
                      <p className="text-2xs text-text-secondary leading-relaxed">{agent.description}</p>
                    </div>

                    {/* Footer: Supported Tiers */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                      <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Active Tiers</span>
                      <div className="flex gap-1.5">
                        {agent.tier.map((t) => (
                          <span
                            key={t}
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-bg-overlay border border-border/40 ${
                              t === 'high' ? 'text-status-error border-status-error/20'
                              : t === 'medium' ? 'text-status-warning border-status-warning/20'
                              : 'text-status-active border-status-active/20'
                            }`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </Grid>
            </SectionContainer>
          </>
        )}
      </ContentWrapper>
    </PageContainer>
  )
}
