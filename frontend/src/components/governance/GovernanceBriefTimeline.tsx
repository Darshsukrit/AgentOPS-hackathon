import React from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import type { GovernanceIntelligence } from '@/types/governance'
import { briefSummary, decisionBadgeClass, decisionToneBorder } from '@/types/governance'

export interface TimelineAgentEntry {
  key: string
  name: string
  label: string
  shortLabel: string
  intelligence: GovernanceIntelligence
  icon: React.ReactNode
  band: boolean
}

interface GovernanceBriefTimelineProps {
  entries: TimelineAgentEntry[]
  onSelect: (entry: TimelineAgentEntry) => void
}

export function GovernanceBriefTimeline({ entries, onSelect }: GovernanceBriefTimelineProps) {
  if (entries.length === 0) return null

  return (
    <GlassCard padding="md" className="border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-primary">Governance Timeline</h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Each step below is readable at a glance — click any row for the full investigation.
          </p>
        </div>
        <span className="hidden sm:flex items-center gap-1 text-[9px] text-text-muted uppercase font-semibold">
          <Search className="w-3 h-3" />
          Click to expand
        </span>
      </div>

      <div className="relative pl-3">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60" aria-hidden />

        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => onSelect(entry)}
              className={`relative w-full text-left pl-6 pr-3 py-3 rounded-lg border border-border/50 bg-bg-surface/40 hover:bg-bg-surface/70 hover:border-border-strong transition-all group border-l-2 ${decisionToneBorder(entry.intelligence.decision)}`}
            >
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border flex items-center justify-center text-[9px] font-bold bg-bg-base z-10 ${decisionBadgeClass(entry.intelligence.decision)}`}
              >
                {idx + 1}
              </span>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {entry.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-text-primary">{entry.shortLabel}</span>
                      {entry.band && (
                        <span className="px-1 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[7px] font-bold">
                          Band
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border ${decisionBadgeClass(entry.intelligence.decision)}`}>
                        {entry.intelligence.decision}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed mt-1">
                      {briefSummary(entry.intelligence)}
                    </p>
                    <p className="text-[9px] text-text-muted mt-1.5 group-hover:text-text-secondary transition-colors">
                      View finding, evidence, impact & recommendation →
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-white shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}
