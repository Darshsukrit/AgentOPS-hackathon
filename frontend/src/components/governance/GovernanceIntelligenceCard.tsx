import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import type { GovernanceIntelligence } from '@/types/governance'
import { decisionBadgeClass } from '@/types/governance'

interface GovernanceIntelligenceCardProps {
  agentName: string
  agentLabel: string
  intelligence: GovernanceIntelligence
  icon?: React.ReactNode
  poweredByBand?: boolean
  className?: string
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
      <div className="text-[11px] text-text-secondary leading-relaxed">{children}</div>
    </div>
  )
}

export function GovernanceIntelligenceCard({
  agentName,
  agentLabel,
  intelligence,
  icon,
  poweredByBand,
  className = '',
}: GovernanceIntelligenceCardProps) {
  const confidencePct = Math.round((intelligence.confidence ?? 0) * 100)

  return (
    <GlassCard padding="md" className={`border-border/60 ${className}`}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide">{agentLabel}</h4>
              <span className="text-[9px] text-text-muted font-mono">{agentName}</span>
              {poweredByBand && (
                <span className="px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[8px] font-bold">
                  Powered by Band
                </span>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${decisionBadgeClass(intelligence.decision)}`}>
              {intelligence.decision}
            </span>
          </div>

          <Section label="Finding">{intelligence.finding}</Section>

          {intelligence.evidence.length > 0 && (
            <Section label="Evidence">
              <ul className="space-y-1">
                {intelligence.evidence.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-text-muted mt-0.5">•</span>
                    <span className="font-mono text-[10px]">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {intelligence.policies_triggered && intelligence.policies_triggered.length > 0 && (
            <Section label="Policies Triggered">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {intelligence.policies_triggered.map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {intelligence.threat_analysis && (
            <Section label="Threat Analysis">{intelligence.threat_analysis}</Section>
          )}

          {(intelligence.likelihood || intelligence.classification) && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-bg-surface/50 border border-border/40">
              {intelligence.likelihood && (
                <div>
                  <p className="text-[9px] text-text-muted uppercase font-bold">Likelihood</p>
                  <p className="text-xs font-semibold text-text-primary mt-0.5">{intelligence.likelihood}</p>
                </div>
              )}
              {intelligence.classification && (
                <div>
                  <p className="text-[9px] text-text-muted uppercase font-bold">Classification</p>
                  <p className="text-xs font-semibold text-text-primary mt-0.5">{intelligence.classification}</p>
                </div>
              )}
              {intelligence.affected_systems && intelligence.affected_systems.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[9px] text-text-muted uppercase font-bold">Affected Systems</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">{intelligence.affected_systems.join(', ')}</p>
                </div>
              )}
              {intelligence.potential_outcome && (
                <div className="col-span-2">
                  <p className="text-[9px] text-text-muted uppercase font-bold">Potential Outcome</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">{intelligence.potential_outcome}</p>
                </div>
              )}
            </div>
          )}

          <Section label="Impact">{intelligence.impact}</Section>

          <Section label="Recommendation">
            <p className="p-2.5 rounded-lg bg-bg-surface/65 border border-border/40 text-text-primary font-medium">
              {intelligence.recommendation}
            </p>
          </Section>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
            <span className="text-text-muted">
              Confidence: <span className="font-mono font-bold text-text-secondary">{confidencePct}%</span>
            </span>
            <span className="text-text-muted">
              Decision: <span className="font-mono font-bold text-text-primary">{intelligence.decision}</span>
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
