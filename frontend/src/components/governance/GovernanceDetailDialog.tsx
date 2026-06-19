import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { GovernanceIntelligenceCard } from '@/components/governance/GovernanceIntelligenceCard'
import type { GovernanceIntelligence } from '@/types/governance'
import { decisionBadgeClass } from '@/types/governance'

export interface GovernanceDetailTarget {
  agentName: string
  agentLabel: string
  shortLabel: string
  intelligence: GovernanceIntelligence
  poweredByBand?: boolean
  icon?: React.ReactNode
}

interface GovernanceDetailDialogProps {
  target: GovernanceDetailTarget | null
  onClose: () => void
}

export function GovernanceDetailDialog({ target, onClose }: GovernanceDetailDialogProps) {
  return (
    <Dialog.Root open={!!target} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100vw-2rem))] max-h-[min(85vh,720px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border/80 bg-[#0A0A0A] shadow-2xl focus:outline-none"
          aria-describedby={target ? 'governance-detail-desc' : undefined}
        >
          {target && (
            <>
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-[#0A0A0A]/95 px-5 py-4 backdrop-blur-md">
                <div>
                  <Dialog.Title className="text-sm font-bold text-text-primary">
                    {target.agentLabel}
                  </Dialog.Title>
                  <p id="governance-detail-desc" className="text-[10px] text-text-muted mt-0.5 font-mono">
                    Full governance investigation — {target.agentName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${decisionBadgeClass(target.intelligence.decision)}`}>
                    {target.intelligence.decision}
                  </span>
                  <Dialog.Close
                    className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close investigation detail"
                  >
                    <X className="w-4 h-4" />
                  </Dialog.Close>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs text-text-secondary leading-relaxed mb-4 p-3 rounded-lg bg-bg-surface/50 border border-border/40">
                  This report explains what {target.shortLabel} observed, why it matters, and what action AgentOS recommends before execution proceeds.
                </p>
                <GovernanceIntelligenceCard
                  agentName={target.agentName}
                  agentLabel={target.agentLabel}
                  intelligence={target.intelligence}
                  icon={target.icon}
                  poweredByBand={target.poweredByBand}
                  className="!border-none !bg-transparent !p-0 !shadow-none !rounded-none"
                />
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
