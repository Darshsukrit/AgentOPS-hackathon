import React from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  ShieldAlert,
  Cpu,
  Activity,
  ShieldCheck,
  Lock,
  Layers,
  FileText,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { extractIntelligence, briefSummary } from '@/types/governance'
import { GovernanceExecutiveBrief } from '@/components/governance/GovernanceExecutiveBrief'
import { GovernanceBriefTimeline, type TimelineAgentEntry } from '@/components/governance/GovernanceBriefTimeline'
import { GovernanceDetailDialog, type GovernanceDetailTarget } from '@/components/governance/GovernanceDetailDialog'

// Predefined agent profiles for the fleet view
interface AgentProfile {
  id: string
  name: string
  registryId: string       // Must match AgentRegistryDB.agent_id exactly
  registryOwner: string    // Must match AgentRegistryDB.owner exactly
  status: string
  model: string
  riskTier: 'Low' | 'Medium' | 'High'
  capabilities: string[]
  governanceStatus: string
  action: string
  requestedTools: string[]
  tier: 'low' | 'medium' | 'high'
  simulatedPurpose: string
}

const ENTERPRISE_AGENTS: AgentProfile[] = [
  {
    id: 'healthcare',
    name: 'Healthcare Data Agent',
    registryId: 'Healthcare Data Request',
    registryOwner: 'Ann Kowalski',
    status: 'Active',
    model: 'gpt-4o',
    riskTier: 'High',
    capabilities: ['read_records', 'query_database', 'generate_report'],
    governanceStatus: 'Awaiting Review',
    action: 'Export patient medical records for external audit',
    requestedTools: ['read_records', 'query_database', 'read_sensitive_records'],
    tier: 'high',
    simulatedPurpose: 'Healthcare Data Agent request: Export patient medical records. System needs database query for SSN 411-992-0012 and MRN-881902-X. Secure transmission protocol required. HIPAA review mandatory.'
  },
  {
    id: 'pii-analyst',
    name: 'Customer PII Analyst',
    registryId: 'Customer PII Analysis',
    registryOwner: 'AgentOPS',
    status: 'Active',
    model: 'gpt-4o',
    riskTier: 'Medium',
    capabilities: ['query_database', 'generate_report', 'internet_access'],
    governanceStatus: 'Awaiting Review',
    action: 'Analyze customer data for GDPR compliance assessment',
    requestedTools: ['query_database', 'internet_access'],
    tier: 'medium',
    simulatedPurpose: 'Customer PII Analyst request: Analyze customer records for GDPR compliance. Consent form required, patient email research@agentos.ai or phone +1-332-998-1120 for verification. Cross-border EU data transfer flagged.'
  },
  {
    id: 'financial-audit',
    name: 'Financial Audit Agent',
    registryId: 'Financial Audit Review',
    registryOwner: 'AgentOPS',
    status: 'Active',
    model: 'gpt-4o-mini',
    riskTier: 'Low',
    capabilities: ['query_database', 'generate_report'],
    governanceStatus: 'Awaiting Review',
    action: 'Generate quarterly financial compliance report',
    requestedTools: ['query_database', 'generate_report'],
    tier: 'low',
    simulatedPurpose: 'Financial Audit Agent request: Generate quarterly financial compliance report. Clean query, no PII or sensitive keys requested. Standard report generation.'
  }
]

// 7-stage Governance Pipeline steps (kept identical to backend names/roles)
const GOVERNANCE_STEPS = [
  { name: 'MetaAgent', role: 'Heuristics', label: 'Meta-Governance Orchestrator' },
  { name: 'RegistryAgent', role: 'Heuristics', label: 'Agent Registry Inspector' },
  { name: 'SecurityAgent', role: 'Cognitive AI Model', label: 'Security & Secret Scanner' },
  { name: 'ComplianceAgent', role: 'Cognitive AI Model', label: 'Compliance Guardrail Policy', poweredByBand: true },
  { name: 'RiskAgent', role: 'Cognitive AI Model', label: 'Normalized Risk Evaluator', poweredByBand: true },
  { name: 'EscalationAgent', role: 'Heuristics', label: 'Human Escalation Coordinator' },
  { name: 'AuditAgent', role: 'Cognitive AI Model', label: 'Governance Ledger Archiver', poweredByBand: true },
]

const INVESTIGATION_AGENTS = [
  { key: 'registry', name: 'RegistryAgent', label: 'Agent Registry Inspector', shortLabel: 'Registry', icon: Cpu, band: false },
  { key: 'security', name: 'SecurityAgent', label: 'Security & Secret Scanner', shortLabel: 'Security', icon: Lock, band: false },
  { key: 'compliance', name: 'ComplianceAgent', label: 'Compliance Guardrail Policy', shortLabel: 'Compliance', icon: ShieldCheck, band: true },
  { key: 'risk', name: 'RiskAgent', label: 'Business Risk Evaluator', shortLabel: 'Risk', icon: Activity, band: true },
  { key: 'escalation', name: 'EscalationAgent', label: 'Human Escalation Coordinator', shortLabel: 'Escalation', icon: ShieldAlert, band: false },
  { key: 'audit', name: 'AuditAgent', label: 'Governance Ledger Archiver', shortLabel: 'Audit', icon: FileText, band: true },
] as const

function getDynamicRiskTier(finalOutcome: string, classification?: string): 'Low' | 'Medium' | 'High' | 'Critical' {
  const outcome = finalOutcome.toUpperCase()
  const cls = (classification || '').toUpperCase()
  if (outcome === 'BLOCKED' || outcome === 'DENIED' || cls === 'CRITICAL') return 'Critical'
  if (outcome === 'ESCALATED' || outcome === 'REVIEW_REQUIRED' || cls === 'HIGH') return 'High'
  if (cls === 'MEDIUM') return 'Medium'
  return 'Low'
}

function stepFindingPreview(result: Record<string, unknown> | null, stepName: string): string | null {
  if (!result) return null
  const keyMap: Record<string, string> = {
    RegistryAgent: 'registry',
    SecurityAgent: 'security',
    ComplianceAgent: 'compliance',
    RiskAgent: 'risk',
    EscalationAgent: 'escalation',
    AuditAgent: 'audit',
  }
  const key = keyMap[stepName]
  if (!key) return null
  const output = result[key] as Record<string, unknown> | undefined
  const gi = extractIntelligence(output, stepName)
  return gi?.finding?.slice(0, 80) ?? null
}

export function DemoWorkflow() {
  const [selectedAgent, setSelectedAgent] = React.useState<AgentProfile>(ENTERPRISE_AGENTS[0])
  const [loading, setLoading] = React.useState(false)
  const [simStep, setSimStep] = React.useState<number>(-1)
  const [result, setResult] = React.useState<any | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [detailTarget, setDetailTarget] = React.useState<GovernanceDetailTarget | null>(null)

  const timelineEntries = React.useMemo((): TimelineAgentEntry[] => {
    if (!result) return []
    return INVESTIGATION_AGENTS.map((agent) => {
      const output = result[agent.key] as Record<string, unknown> | undefined
      const intelligence = extractIntelligence(output, agent.name)
      if (!intelligence) return null
      const Icon = agent.icon
      return {
        key: agent.key,
        name: agent.name,
        label: agent.label,
        shortLabel: agent.shortLabel,
        intelligence,
        icon: <Icon className="w-3.5 h-3.5 text-text-secondary" />,
        band: agent.band,
      }
    }).filter(Boolean) as TimelineAgentEntry[]
  }, [result])

  const governanceFindingLines = React.useMemo(() => {
    return timelineEntries
      .filter((e) => !['VERIFIED', 'CLEAN', 'PASS', 'PROCEED', 'APPROVED'].some((d) => e.intelligence.decision.toUpperCase().includes(d)))
      .map((e) => `${e.shortLabel}: ${briefSummary(e.intelligence)}`)
      .slice(0, 4)
  }, [timelineEntries])

  // Track completed audits map
  const [completedAudits, setCompletedAudits] = React.useState<Record<string, { riskTier: 'Low' | 'Medium' | 'High' | 'Critical'; governanceStatus: string }>>({})

  // Handle free switching of agents (Option B - resets state on select)
  const handleAgentClick = (agent: AgentProfile) => {
    if (selectedAgent.id === agent.id) return
    setLoading(false)
    setResult(null)
    setSimStep(-1)
    setStoryStage(-1)
    setError(null)
    setDetailTarget(null)
    setSelectedAgent(agent)
  }

  // timed narrative states for story animation
  const [storyStage, setStoryStage] = React.useState<number>(-1)

  // Auto-simulate stepper progress + story stages while POST request is executing
  React.useEffect(() => {
    let interval: any
    if (loading && simStep < GOVERNANCE_STEPS.length - 1) {
      interval = setInterval(() => {
        setSimStep((s) => {
          const nextStep = s + 1
          // Map simulation step to visual narrative story stages
          if (nextStep === 0) setStoryStage(0) // Agent Request Received
          else if (nextStep === 1) setStoryStage(1) // AgentOS Intercepts Request
          else if (nextStep === 3) setStoryStage(2) // Governance Pipeline Activated
          return nextStep
        })
      }, 700)
    }
    return () => clearInterval(interval)
  }, [loading, simStep])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSimStep(0)
    setStoryStage(0)
    setResult(null)
    setError(null)

    try {
      const response = await fetch(`/api/workflow/${selectedAgent.tier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgent.registryId,
          owner: selectedAgent.registryOwner,
          model: selectedAgent.model,
          purpose: selectedAgent.simulatedPurpose,
        }),
      })

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`)
      }

      const workflowContext = await response.json()

      if (workflowContext.status === 'failed') {
        throw new Error(workflowContext.error ?? 'Governance pipeline failed at final audit step')
      }

      // Mark all pipeline steps complete and transition story to final decision
      setSimStep(GOVERNANCE_STEPS.length)
      setStoryStage(3) // Decision Generated
      setResult(workflowContext)

      // Save the audited outcome
      const finalOutcome = workflowContext.audit?.final_outcome ?? workflowContext.final_decision ?? 'APPROVED'
      const classification =
        workflowContext.risk?.governance_intelligence?.classification ??
        workflowContext.audit?.governance_intelligence?.classification
      const computedTier = getDynamicRiskTier(finalOutcome, classification)
      setCompletedAudits(prev => ({
        ...prev,
        [selectedAgent.id]: {
          riskTier: computedTier,
          governanceStatus: finalOutcome
        }
      }))
    } catch (err: any) {
      setError(err.message ?? 'Workflow execution failed')
      setStoryStage(-1)
      setSimStep(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setSimStep(-1)
    setStoryStage(-1)
    setError(null)
    setDetailTarget(null)
    setCompletedAudits({})
  }

  return (
    <PageContainer>
      {/* Background glowing mesh orb */}
      <div className="fixed inset-0 pointer-events-none demo-glow z-0 opacity-40" aria-hidden="true" />

      <PageHeader
        title="Enterprise Agent Governance Center"
        description="The operational control plane for enterprise AI agents. Monitor, govern, audit, and explain autonomous AI activity before execution."
        badge={
          <span className="badge bg-white/5 border border-white/10 text-white font-bold tracking-wider">
            <Sparkles className="w-3 h-3 mr-1 text-amber-400 animate-pulse" />
            OPERATIONAL
          </span>
        }
      />

      <ContentWrapper>
        <Grid cols={3} className="gap-6 items-start">
          
          {/* ==================== LEFT COLUMN: ENTERPRISE AGENT FLEET ==================== */}
          <div className="space-y-6">
            {/* Fleet Summary Card */}
            <GlassCard padding="md" className="border-border/60 bg-bg-surface/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-text-secondary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Enterprise Agent Fleet</h3>
                </div>
                <span className="text-[10px] text-text-muted font-mono font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                  3 Registered
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <p className="text-xl font-bold font-mono text-white">3</p>
                  <p className="text-[9px] text-text-muted uppercase font-bold mt-0.5">Active Fleet</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <p className="text-xl font-bold font-mono text-status-error">1</p>
                  <p className="text-[9px] text-text-muted uppercase font-bold mt-0.5">High Risk</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <p className="text-xl font-bold font-mono text-status-warning">1</p>
                  <p className="text-[9px] text-text-muted uppercase font-bold mt-0.5">Medium Risk</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <p className="text-xl font-bold font-mono text-status-active">1</p>
                  <p className="text-[9px] text-text-muted uppercase font-bold mt-0.5">Low Risk</p>
                </div>
              </div>
            </GlassCard>

            {/* Active Agents List */}
            <SectionContainer title="Agent Directory" description="Fleet configurations awaiting review">
              <div className="space-y-3">
                {ENTERPRISE_AGENTS.map((agent) => {
                  const isSelected = selectedAgent.id === agent.id
                  const audit = completedAudits[agent.id]
                  const hasBeenAudited = !!audit
                  const riskTierText = hasBeenAudited ? audit.riskTier : 'Unknown'
                  const govStatusText = hasBeenAudited ? audit.governanceStatus : 'Awaiting Review'

                  const getBadgeStyles = (hasAudited: boolean, tierText: string) => {
                    if (!hasAudited) {
                      return {
                        label: 'PENDING GOVERNANCE',
                        className: 'bg-white/5 border border-white/10 text-text-muted font-bold tracking-wide'
                      }
                    }
                    const t = tierText.toUpperCase()
                    if (t === 'CRITICAL') {
                      return {
                        label: 'CRITICAL RISK',
                        className: 'bg-status-error/10 border border-status-error text-status-error shadow-[0_0_10px_rgba(239,68,68,0.3)] animate-pulse font-extrabold'
                      }
                    }
                    if (t === 'HIGH') {
                      return {
                        label: 'HIGH RISK',
                        className: 'bg-orange-500/10 border border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] font-extrabold'
                      }
                    }
                    if (t === 'MEDIUM') {
                      return {
                        label: 'MEDIUM RISK',
                        className: 'bg-status-warning/10 border border-status-warning text-status-warning shadow-[0_0_10px_rgba(245,158,11,0.3)] font-extrabold'
                      }
                    }
                    return {
                      label: 'LOW RISK',
                      className: 'bg-status-active/10 border border-status-active text-status-active shadow-[0_0_10px_rgba(16,185,129,0.3)] font-extrabold'
                    }
                  }

                  const badgeStyles = getBadgeStyles(hasBeenAudited, riskTierText)

                  const getGovStatusColor = (status: string) => {
                    const s = status.toUpperCase()
                    if (s === 'APPROVED') return 'text-status-active'
                    if (s === 'BLOCKED') return 'text-status-error'
                    if (s === 'ESCALATED') return 'text-status-warning'
                    return 'text-status-warning'
                  }
                  
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleAgentClick(agent)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-white/40 bg-white/[0.06] shadow-lg translate-x-1'
                          : 'border-border/60 bg-bg-surface/20 hover:border-border-strong hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-status-active animate-pulse' : 'bg-status-idle'}`} />
                          <h4 className="text-xs font-bold text-white">{agent.name}</h4>
                        </div>
                        <span className={`px-2 py-0.5 text-[8px] uppercase font-mono rounded border ${badgeStyles.className}`}>
                          {badgeStyles.label}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2 text-[10px] border-t border-white/5 pt-2.5">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Model:</span>
                          <span className="font-mono text-text-secondary">{agent.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Status:</span>
                          <span className="text-status-active font-semibold">{agent.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Governance:</span>
                          <span className={`font-semibold font-mono uppercase text-[9px] ${getGovStatusColor(govStatusText)}`}>
                            {govStatusText}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Risk:</span>
                          <span className={`font-semibold text-[9px] uppercase ${
                            !hasBeenAudited ? 'text-text-muted' :
                            riskTierText === 'Critical' ? 'text-status-error font-extrabold animate-pulse' :
                            riskTierText === 'High' ? 'text-status-error font-extrabold' :
                            riskTierText === 'Medium' ? 'text-status-warning' :
                            'text-status-active'
                          }`}>
                            {riskTierText}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted block mb-1">Requested Capabilities:</span>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {agent.capabilities.map((cap) => (
                              <span key={cap} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-muted text-[8px] font-mono">
                                {cap}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionContainer>
          </div>

          {/* ==================== CENTER COLUMN: LIVE GOVERNANCE EXECUTION ==================== */}
          <div className="lg:col-span-2 space-y-6">
            <SectionContainer title="Live Governance Execution" description="AgentOS is evaluating an autonomous agent request.">
              <GlassCard padding="md" className="border-border/80 relative overflow-hidden bg-bg-surface/30">
                {/* Visual Intercept Story Animation */}
                {loading || result ? (
                  <div className="mb-6 border-b border-border/40 pb-5">
                    <p className="text-[9px] uppercase font-extrabold tracking-widest text-text-muted mb-3">Governance Flow Progression</p>
                    <div className="grid grid-cols-4 gap-1.5 text-center relative">
                      {[
                        { label: 'Agent Request Received', desc: 'Agent attempts execution' },
                        { label: 'AgentOS Intercepts Request', desc: 'Guardrails triggered' },
                        { label: 'Governance Pipeline Activated', desc: 'Consensus analysis' },
                        { label: 'Decision Generated', desc: 'Secure evaluation logs' }
                      ].map((stage, idx) => {
                        const isCurrent = storyStage === idx
                        const isDone = storyStage > idx
                        return (
                          <div key={idx} className="relative z-10">
                            <div className={`mx-auto w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold transition-all duration-300 ${
                              isCurrent ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse' :
                              isDone ? 'bg-status-active/15 border-status-active text-status-active' :
                              'bg-[#121212] border-white/5 text-text-muted'
                            }`}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <p className={`text-[9px] font-bold mt-2 leading-tight ${isCurrent ? 'text-white' : isDone ? 'text-text-secondary' : 'text-text-muted'}`}>
                              {stage.label}
                            </p>
                          </div>
                        )
                      })}
                      {/* Connecting Line */}
                      <div className="absolute top-3.5 left-[10%] right-[10%] h-[1px] bg-white/5 -z-10" />
                    </div>
                  </div>
                ) : null}

                {/* Pre-audit Narrative / Selected Agent Request details */}
                <div className="bg-[#0A0A0A]/40 border border-white/5 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-text-secondary" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Agent Request payload</span>
                    </div>
                    <span className="text-[9px] text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                      Intercepted
                    </span>
                  </div>

                  {error && (
                    <div className="p-3 mb-4 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <span className="text-[9px] text-text-muted uppercase font-bold block">Selected Agent</span>
                      <span className="text-text-primary font-medium">{selectedAgent.name}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted uppercase font-bold block">Governance Tier</span>
                      <span className={`font-mono font-bold uppercase text-[10px] ${
                        selectedAgent.tier === 'high' ? 'text-status-error' :
                        selectedAgent.tier === 'medium' ? 'text-status-warning' :
                        'text-status-active'
                      }`}>{selectedAgent.tier} Risk</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] text-text-muted uppercase font-bold block">Requested Action</span>
                      <p className="text-text-secondary italic">"{selectedAgent.action}"</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] text-text-muted uppercase font-bold block">Requested Tools / Access</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedAgent.requestedTools.map((tool) => (
                          <span key={tool} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white font-mono text-[9px]">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-text-muted uppercase font-bold block">Audit Intercept Status</span>
                      <span className="text-status-warning font-semibold animate-pulse-subtle">Awaiting Review</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-5 pt-3 border-t border-white/5">
                    <button
                      type="submit"
                      disabled={loading || !!result}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded text-xs font-semibold bg-white hover:bg-neutral-200 text-black disabled:bg-white/10 disabled:text-text-muted transition-all shadow-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Executing Multi-Agent Governance Consensus...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Initiate Governance Audit for {selectedAgent.name}
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Stepper Pipeline */}
                {simStep >= 0 && (
                  <div className="mt-5 border-t border-border/40 pt-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3">Multi-Agent Consensus Stepper</h4>
                    <div className="space-y-2">
                      {GOVERNANCE_STEPS.map((step, idx) => {
                        const isActive = loading && idx === simStep
                        const isCompleted = idx < simStep || (!loading && simStep >= GOVERNANCE_STEPS.length)

                        return (
                          <div
                            key={step.name}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                              isActive
                                ? 'bg-white/[0.04] border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.08)] scale-[1.01]'
                                : isCompleted
                                ? 'bg-bg-surface/40 border-border/80 text-text-secondary'
                                : 'bg-bg-surface/10 border-border/30 text-text-muted'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${
                                isActive ? 'bg-white text-black animate-pulse' :
                                isCompleted ? 'bg-status-active/15 text-status-active border border-status-active/30' :
                                'bg-zinc-800 text-text-muted'
                              }`}>
                                {isCompleted ? '✓' : idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className={`text-xs font-bold ${isActive ? 'text-white' : isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>
                                    {step.label}
                                  </p>
                                  {step.poweredByBand && (
                                    <span className="relative group inline-flex items-center gap-1.5 px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono text-[8px] font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                                      Powered by Band
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[#0F111A] border border-amber-500/30 text-white rounded text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 shadow-xl leading-none font-medium">
                                        Powered by Band Multi-Agent Infrastructure
                                      </span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] text-text-muted mt-0.5">{step.role}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isActive && (
                                <span className="flex items-center gap-1 text-[10px] text-white font-semibold uppercase animate-pulse">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Evaluating
                                </span>
                              )}
                              {isCompleted && (
                                <div className="text-right max-w-[200px]">
                                  <span className="text-[10px] text-status-active font-semibold block">
                                    Complete
                                  </span>
                                  {result && stepFindingPreview(result, step.name) && (
                                    <span className="text-[9px] text-text-muted leading-tight block mt-0.5 line-clamp-2">
                                      {stepFindingPreview(result, step.name)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </GlassCard>
            </SectionContainer>

            {/* ==================== RIGHT COLUMN: GOVERNANCE OUTCOME ==================== */}
            {result && (
              <SectionContainer title="Governance Investigation Report" description="Executive brief at a glance — click any agent step for the full investigation dossier">
                <div className="space-y-4">
                  <GovernanceExecutiveBrief
                    workflowId={result.workflow_id || result.id}
                    agentName={selectedAgent.name}
                    requestedAction={selectedAgent.action}
                    requestedTools={selectedAgent.requestedTools}
                    finalDecision={result.audit?.final_outcome ?? result.final_decision ?? 'PENDING'}
                    decisionChain={result.audit?.decision_chain ?? []}
                    governanceFindings={
                      governanceFindingLines.length > 0
                        ? governanceFindingLines
                        : timelineEntries.map((e) => `${e.shortLabel}: ${briefSummary(e.intelligence)}`)
                    }
                    riskClassification={
                      result.risk?.governance_intelligence?.classification ?? result.risk?.severity
                    }
                    onReset={handleReset}
                  />

                  <GovernanceBriefTimeline
                    entries={timelineEntries}
                    onSelect={(entry) =>
                      setDetailTarget({
                        agentName: entry.name,
                        agentLabel: entry.label,
                        shortLabel: entry.shortLabel,
                        intelligence: entry.intelligence,
                        poweredByBand: entry.band,
                        icon: entry.icon,
                      })
                    }
                  />
                </div>
              </SectionContainer>
            )}

            <GovernanceDetailDialog target={detailTarget} onClose={() => setDetailTarget(null)} />

            {/* Empty Sandbox Screen */}
            {simStep === -1 && (
              <GlassCard className="flex flex-col items-center justify-center py-20 text-center border-border/60">
                <ShieldAlert className="w-10 h-10 text-text-muted mb-4 animate-pulse-subtle" />
                <h3 className="text-sm font-semibold text-text-primary">Governance Pipeline Offline</h3>
                <p className="text-xs text-text-muted mt-2 max-w-sm">
                  Select an enterprise agent from the active fleet and click "Initiate Governance Audit" to execute the 7-stage consensus pipeline.
                </p>
              </GlassCard>
            )}
          </div>
        </Grid>
      </ContentWrapper>
    </PageContainer>
  )
}
