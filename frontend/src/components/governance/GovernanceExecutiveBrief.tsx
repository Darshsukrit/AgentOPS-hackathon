import { ArrowRight, Scale } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { DecisionBadge } from '@/components/ui/DecisionBadge'

interface GovernanceExecutiveBriefProps {
  workflowId: string
  agentName: string
  requestedAction: string
  requestedTools: string[]
  finalDecision: string
  decisionChain: string[]
  governanceFindings: string[]
  riskClassification?: string
  onReset: () => void
}

export function GovernanceExecutiveBrief({
  workflowId,
  agentName,
  requestedAction,
  requestedTools,
  finalDecision,
  decisionChain,
  governanceFindings,
  riskClassification,
  onReset,
}: GovernanceExecutiveBriefProps) {
  const isBlocked = ['DENIED', 'BLOCKED'].includes(finalDecision.toUpperCase())

  return (
    <GlassCard className="border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isBlocked ? 'bg-status-error/10 border-status-error/30' : 'bg-status-active/10 border-status-active/30'}`}>
            <Scale className={`w-5 h-5 ${isBlocked ? 'text-status-error' : 'text-status-active'}`} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase text-white">Executive Brief</h4>
            <p className="text-[10px] text-text-muted mt-0.5 font-mono">Trace {workflowId}</p>
          </div>
        </div>
        <DecisionBadge decision={finalDecision as never} className="scale-100" />
      </div>

      {/* Request vs Governance */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-bg-surface/40 border border-border/50">
          <p className="text-[9px] text-text-muted uppercase font-bold mb-2">What the agent requested</p>
          <p className="text-xs text-text-primary font-medium">{agentName}</p>
          <p className="text-[11px] text-text-secondary mt-1 italic">"{requestedAction}"</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {requestedTools.map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono text-text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className={`p-3 rounded-lg border ${isBlocked ? 'bg-status-error/5 border-status-error/25' : 'bg-status-active/5 border-status-active/25'}`}>
          <p className="text-[9px] text-text-muted uppercase font-bold mb-2">What governance concluded</p>
          <p className="text-xs font-bold text-text-primary">
            Verdict: <span className={isBlocked ? 'text-status-error' : 'text-status-active'}>{finalDecision}</span>
          </p>
          {riskClassification && (
            <p className="text-[11px] text-text-secondary mt-1">
              Risk classification: <span className="font-semibold text-text-primary">{riskClassification}</span>
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {governanceFindings.slice(0, 3).map((line, i) => (
              <li key={i} className="text-[10px] text-text-secondary flex gap-1.5 leading-snug">
                <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-text-muted" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why this decision */}
      {decisionChain.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] text-text-muted uppercase font-bold mb-2">Why AgentOS reached this decision</p>
          <ul className="text-text-secondary leading-relaxed text-[11px] p-3 rounded-lg bg-bg-surface/50 border border-border/40 space-y-1.5">
            {decisionChain.map((line, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-text-muted font-bold">{i + 1}.</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={onReset}
          className="py-1.5 px-4 rounded text-[11px] font-semibold border border-border text-text-secondary bg-bg-surface hover:text-white transition-all"
        >
          Reset Governance Center
        </button>
      </div>
    </GlassCard>
  )
}
