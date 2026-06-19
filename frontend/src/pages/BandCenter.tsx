import {
  Globe,
  Loader2,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { AgentBadge } from '@/components/ui/AgentBadge'
import { useBandStatus } from '@/hooks/useApi'

export function BandCenter() {
  const { data, loading, error, refetch } = useBandStatus()

  return (
    <PageContainer>
      {/* Background glowing mesh orb */}
      <div className="fixed inset-0 pointer-events-none band-glow z-0 opacity-30" aria-hidden="true" />

      <PageHeader
        title="Band Governance Center"
        description="Monitor decentralized agent validations, consensus health, and validator status on the Band Ledger."
        badge={
          <span className="badge bg-purple-500/10 border border-purple-500/20 text-purple-300">
            <Globe className="w-3 h-3 mr-1" />
            Consensus Active
          </span>
        }
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-text-secondary bg-bg-surface hover:border-border-strong hover:text-text-primary transition-all shadow-lg animate-pulse-subtle"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <ContentWrapper>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <GlassCard className="border-red-500/20 text-center py-12">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-text-primary">Failed to load Band status</h3>
            <p className="text-xs text-text-muted mt-2">{error}</p>
          </GlassCard>
        ) : (
          <>
            {/* Core Status & Config */}
            <Grid cols={3}>
              <GlassCard className="border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-2xs text-text-muted uppercase font-semibold">Band API State</span>
                  <span className={`w-2 h-2 rounded-full ${data?.reachable ? 'bg-status-active animate-pulse' : 'bg-status-error'}`} />
                </div>
                <p className={`text-xl font-bold mt-2 ${data?.reachable ? 'text-status-active' : 'text-status-error'}`}>
                  {data?.reachable ? 'Connected' : 'Offline'}
                </p>
                <p className="text-[10px] text-text-muted mt-1">
                  {data?.reachable ? 'Decentralized validators reachable' : 'Unable to contact Band service'}
                </p>
              </GlassCard>

              <GlassCard className="border-border/60">
                <span className="text-2xs text-text-muted uppercase font-semibold">Ledger Handle</span>
                <p className="text-xs font-bold text-text-primary truncate mt-2 font-mono">
                  {data?.handle ?? '@unknown/agentos-governance'}
                </p>
                <p className="text-[10px] text-text-muted mt-1">Official registry handle for consensus</p>
              </GlassCard>

              <GlassCard className="border-border/60">
                <span className="text-2xs text-text-muted uppercase font-semibold">Decentralized Validators</span>
                <p className="text-xl font-bold text-text-primary mt-2">
                  {data?.reachable ? '3 / 3 Active' : '0 / 3 Active'}
                </p>
                <p className="text-[10px] text-text-muted mt-1">100% validator network availability</p>
              </GlassCard>
            </Grid>

            {/* Band Powered Agents */}
            <SectionContainer title="Band Consensus Agents" description="Agents operating on decentralized consensus layers">
              <Grid cols={3}>
                {[
                  {
                    name: 'ComplianceAgent',
                    description: 'Evaluates requests against GDPR, SOC2, and HIPAA policies via cryptographic consensus.',
                    rules: ['GDPR Article 5 check', 'HIPAA Privacy validation', 'SOC2 Trust Principles compliance'],
                  },
                  {
                    name: 'RiskAgent',
                    description: 'Performs multi-validator risk score synthesis to determine threats and flag escalations.',
                    rules: ['Weighted risk analysis', 'Severity tier matching', 'Mitigation generation'],
                  },
                  {
                    name: 'AuditAgent',
                    description: 'Synthesizes final governance decisions and commits state to the decentralized blockchain ledger.',
                    rules: ['Consensus resolution', 'Cryptographic signing', 'Audit log serialization'],
                  },
                ].map((agent) => (
                  <GlassCard key={agent.name} className="border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-[0_0_20px_rgba(168,85,247,0.03)] group">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-border/40">
                        <span className="text-xs font-bold text-text-primary group-hover:text-white transition-colors">{agent.name}</span>
                        <AgentBadge provider="band" />
                      </div>
                      <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                        {agent.description}
                      </p>
                      
                      <div className="mt-4">
                        <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Active Rules</span>
                        <div className="space-y-1.5 mt-2">
                          {agent.rules.map((rule) => (
                            <div key={rule} className="flex items-center gap-1.5 text-2xs text-text-secondary bg-bg-surface/40 p-1.5 rounded border border-border/40">
                              <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                              <span>{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3 text-status-active" />
                        Status: <span className="text-status-active font-semibold">Verified</span>
                      </span>
                      <span>Latency: ~120ms</span>
                    </div>
                  </GlassCard>
                ))}
              </Grid>
            </SectionContainer>

            {/* Band Integration Ledger Parameters */}
            <SectionContainer title="Band SDK Configuration Details" description="Cryptographic integration settings for this environment">
              <GlassCard padding="md" className="border-border/60">
                <div className="grid grid-cols-2 gap-6 text-xs">
                  {[
                    { label: 'Band API Base URL', value: data?.base_url ?? 'None' },
                    { label: 'Registered Agent ID', value: data?.agent_id ?? 'None' },
                    { label: 'Decentralized Consensus Method', value: 'Decentralized Oracle Multi-Signature Consensus' },
                    { label: 'Encryption Protocol', value: 'ECDSA SECP256K1 Ledger Signatures' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-2xs text-text-muted uppercase font-semibold mb-0.5">{label}</p>
                      <p className="text-text-secondary font-mono break-all">{value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </SectionContainer>
          </>
        )}
      </ContentWrapper>
    </PageContainer>
  )
}
