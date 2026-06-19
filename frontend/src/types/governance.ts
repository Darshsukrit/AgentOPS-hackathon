// ─────────────────────────────────────────
//  Governance Intelligence Types
// ─────────────────────────────────────────

export interface GovernanceIntelligence {
  finding: string
  evidence: string[]
  impact: string
  recommendation: string
  confidence: number
  decision: string
  policies_triggered?: string[]
  affected_systems?: string[]
  threat_analysis?: string | null
  classification?: string | null
  likelihood?: string | null
  potential_outcome?: string | null
}

export interface GovernanceReportEntry {
  agent: string
  governance_intelligence: GovernanceIntelligence
}

/** Fallback mapper when API response predates governance_intelligence field */
export function fallbackIntelligence(
  agent: string,
  data: {
    reasoning?: string
    evidence?: string[]
    recommendation?: string
    confidence?: number
    decision?: string
    status?: string
    severity?: string
    risk_score?: number
    findings?: string[]
    violations?: string[]
    policy_refs?: string[]
  }
): GovernanceIntelligence {
  const decision =
    data.decision ||
    data.status ||
    data.severity ||
    (data.risk_score !== undefined ? `${data.risk_score}/100` : 'Unknown')

  return {
    finding: data.reasoning || data.findings?.[0] || data.violations?.[0] || `${agent} evaluation complete.`,
    evidence: data.evidence?.length
      ? data.evidence
      : [...(data.findings ?? []), ...(data.violations ?? [])],
    impact: 'See finding and evidence for governance impact assessment.',
    recommendation: data.recommendation || 'Review governance findings.',
    confidence: data.confidence ?? 1.0,
    decision: String(decision),
    policies_triggered: data.policy_refs,
    classification: data.severity || (data as { classification?: string }).classification,
  }
}

export function extractIntelligence(
  agentOutput: Record<string, unknown> | null | undefined,
  agentName: string
): GovernanceIntelligence | null {
  if (!agentOutput) return null
  const gi = agentOutput.governance_intelligence as GovernanceIntelligence | undefined
  if (gi?.finding) return gi
  return fallbackIntelligence(agentName, agentOutput as Parameters<typeof fallbackIntelligence>[1])
}

function decisionTone(decision: string): 'success' | 'warning' | 'error' | 'neutral' {
  const d = decision.toUpperCase()
  if (['APPROVED', 'PASS', 'PASSED', 'CLEAN', 'VERIFIED', 'PROCEED', 'VALID', 'SUCCESS'].some((x) => d.includes(x))) {
    return 'success'
  }
  if (['BLOCKED', 'DENIED', 'FAIL', 'INVALID', 'FLAGGED', 'CRITICAL'].some((x) => d.includes(x))) {
    return 'error'
  }
  if (['ESCALATED', 'REVIEW', 'WARNING', 'FLAG', 'HIGH', 'MEDIUM'].some((x) => d.includes(x))) {
    return 'warning'
  }
  return 'neutral'
}

export function decisionBadgeClass(decision: string): string {
  const tone = decisionTone(decision)
  if (tone === 'success') return 'bg-status-active/10 border-status-active/20 text-status-active'
  if (tone === 'error') return 'bg-status-error/10 border-status-error/20 text-status-error'
  if (tone === 'warning') return 'bg-status-warning/10 border-status-warning/20 text-status-warning'
  return 'bg-white/5 border-white/10 text-text-muted'
}

/** Plain-language one-liner for timeline / executive brief (no click required). */
export function briefSummary(intelligence: GovernanceIntelligence): string {
  if (intelligence.threat_analysis) {
    return intelligence.threat_analysis
  }
  if (intelligence.potential_outcome && intelligence.classification) {
    return `${intelligence.classification} exposure — ${intelligence.potential_outcome}`
  }
  const sentence = intelligence.finding.split(/(?<=[.!?])\s+/)[0] || intelligence.finding
  return sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence
}

/** Short headline pairing decision with outcome for timeline rows. */
export function briefHeadline(intelligence: GovernanceIntelligence, shortLabel: string): string {
  const decision = intelligence.decision.toUpperCase()
  if (['VERIFIED', 'CLEAN', 'PASS', 'APPROVED', 'PROCEED'].some((d) => decision.includes(d))) {
    return `${shortLabel}: cleared — ${briefSummary(intelligence)}`
  }
  if (['DENIED', 'BLOCKED', 'FAIL', 'FLAGGED', 'CRITICAL'].some((d) => decision.includes(d))) {
    return `${shortLabel}: concern — ${briefSummary(intelligence)}`
  }
  return `${shortLabel}: ${briefSummary(intelligence)}`
}

export function decisionToneBorder(decision: string): string {
  const tone = decisionTone(decision)
  if (tone === 'success') return 'border-l-status-active'
  if (tone === 'error') return 'border-l-status-error'
  if (tone === 'warning') return 'border-l-status-warning'
  return 'border-l-text-muted'
}
