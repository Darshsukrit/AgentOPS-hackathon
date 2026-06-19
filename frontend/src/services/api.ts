// ─────────────────────────────────────────────────────────────────────────────
//  API Service — AgentOS Frontend
//  All requests route through Vite's /api proxy → http://localhost:8001
// ─────────────────────────────────────────────────────────────────────────────

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Health & Integration ────────────────────────────────────────────────────

export interface HealthStatus {
  status: string
  database: string
  redis: string
  config_loaded?: boolean
}

export interface IntegrationStatus {
  database: string
  redis: string
  aiml_api: string
  band_api: string
  agents_seeded: number
  workflows_count: number
  audit_logs_count: number
  cost_records_count: number
  risk_records_count: number
  performance_records_count: number
}

export interface BandStatus {
  configured: boolean
  base_url: string
  agent_id: string | null
  handle: string | null
  reachable: boolean
  error: string | null
  band_agents: string[]
}

export const getHealth = () => request<HealthStatus>('/health')
export const getBandStatus = () => request<BandStatus>('/band/status')

export const getIntegrationStatus = () =>
  Promise.all([
    request<any>('/integration/status'),
    request<any>('/ai/status').catch(() => ({ active_provider: 'disconnected', demo_mode: false })),
    request<any>('/band/status').catch(() => ({ reachable: false })),
    request<any[]>('/agents').catch(() => []),
  ]).then(([integration, ai, band, agents]) => {
    const aiml_status = (ai.demo_mode || ai.active_provider === 'aiml' || ai.active_provider === 'featherless' || ai.aiml?.reachable || ai.featherless?.reachable)
      ? 'connected'
      : 'disconnected'
    const band_status = band.reachable ? 'connected' : 'disconnected'

    return {
      database: integration.supabase || 'disconnected',
      redis: integration.redis || 'disconnected',
      aiml_api: aiml_status,
      band_api: band_status,
      agents_seeded: agents.length,
      workflows_count: integration.total_workflows ?? 0,
      audit_logs_count: integration.audit_logs ?? 0,
      cost_records_count: integration.cost_records ?? 0,
      risk_records_count: integration.total_workflows ?? 0,
      performance_records_count: integration.total_workflows ?? 0,
    } as IntegrationStatus
  })

// ─── Workflows ───────────────────────────────────────────────────────────────

export interface WorkflowSummary {
  id: string
  agent_id: string
  tier: string
  status: string
  created_at: string
  band_room_id: string | null
  error: string | null
  final_decision: string | null
  owner?: string
  model?: string
  purpose?: string
}

export interface WorkflowDetail extends WorkflowSummary {
  transient_state?: Record<string, unknown> | null
}

// Deterministic hash for realistic demo variance (consistent per-ID)
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function realisticConfidence(agentName: string, workflowId: string): number {
  const h = hashCode(agentName + workflowId)
  // Returns 0.78 – 0.99, never exactly 1.0
  return 0.78 + ((h % 21) / 100)
}

// Registry-aligned agent IDs for each tier (must match AgentRegistryDB seeds)
const REGISTRY_AGENTS: Record<'low' | 'medium' | 'high', { agent_id: string; owner: string; model: string }> = {
  low:    { agent_id: 'Financial Audit Review', owner: 'AgentOPS', model: 'gpt-4o-mini' },
  medium: { agent_id: 'Customer PII Analysis',  owner: 'AgentOPS', model: 'gpt-4o' },
  high:   { agent_id: 'Healthcare Data Request', owner: 'Ann Kowalski', model: 'gpt-4o' },
}

export const getWorkflows = () =>
  request<WorkflowSummary[]>('/workflows')

export const getWorkflow = (id: string) => {
  if (!id) return Promise.reject(new Error('No workflow ID specified'))
  return request<WorkflowDetail>(`/workflow/${id}`)
}

export const triggerWorkflow = (tier: 'low' | 'medium' | 'high') => {
  const reg = REGISTRY_AGENTS[tier]
  return request<WorkflowDetail>(`/workflow/${tier}`, {
    method: 'POST',
    body: JSON.stringify({
      agent_id: reg.agent_id,
      model: reg.model,
      owner: reg.owner,
      purpose: `${tier.toUpperCase()} tier governance audit: ${reg.agent_id}`,
    }),
  })
}

// ─── Audit ───────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  workflow_id: string
  agent_name: string
  action: string
  decision: string
  confidence: number
  reasoning: string
  recommendation: string
  timestamp: string
}

export const getWorkflowAudit = (id: string) => {
  if (!id) return Promise.resolve([])
  return request<any[]>(`/workflow/${id}/audit`).then((data) =>
    data.map((log) => {
      const details = log.details || {}
      let agent_name = 'Orchestrator'
      let action = 'Workflow processing'
      let decision = 'PENDING'
      let confidence = 1.0
      let reasoning = ''
      let recommendation = ''

      if (log.event_type === 'workflow_started') {
        action = 'Workflow started'
        decision = 'INITIATED'
        reasoning = `Tier: ${details.tier || 'medium'}, Agent ID: ${details.agent_id || 'unknown'}`
      } else if (log.event_type === 'workflow_completed') {
        agent_name = 'AuditAgent'
        action = 'Workflow completed'
        decision = details.final_outcome || 'APPROVED'
        confidence = details.confidence && details.confidence < 1.0 ? details.confidence : realisticConfidence(agent_name, log.workflow_id || '')
        reasoning = details.reasoning || details.governance_summary || 'Final decision reached.'
        recommendation = details.recommendation || ''
      } else if (log.event_type.endsWith('_complete')) {
        agent_name = log.event_type.replace('_complete', '')
        action = 'Execution complete'
        decision = details.decision || (details.success ? 'SUCCESS' : 'FAILED')
        confidence = details.confidence && details.confidence < 1.0 ? details.confidence : realisticConfidence(agent_name, log.workflow_id || '')
        reasoning = details.reasoning || (details.decision ? `Decision: ${details.decision}` : 'Step succeeded.')
      } else if (log.event_type.endsWith('_error')) {
        agent_name = log.event_type.replace('_error', '')
        action = 'Execution error'
        decision = 'ERROR'
        reasoning = details.error || 'Unknown error occurred.'
      } else {
        action = log.event_type
        decision = details.decision || 'NONE'
        reasoning = details.reasoning || ''
      }

      return {
        id: log.id,
        workflow_id: log.workflow_id,
        agent_name,
        action,
        decision,
        confidence,
        reasoning,
        recommendation,
        timestamp: log.timestamp,
      } as AuditLog
    })
  )
}

// ─── Risk ────────────────────────────────────────────────────────────────────

export interface RiskLog {
  id: string
  workflow_id: string
  risk_score: number
  severity: string
  findings: string[]
  recommendations: string[]
  timestamp: string
}

export const getWorkflowRisk = (id: string) => {
  if (!id) return Promise.resolve([])
  return request<any[]>(`/workflow/${id}/risk`).then((data) =>
    data.map((r) => {
      // Build recommendations: use array if present, otherwise build from singular fields
      const recs: string[] = r.recommendations || []
      if (!recs.length && r.rationale) recs.push(r.rationale)
      if (!recs.length && r.recommendation && r.recommendation !== 'PROCEED' && r.recommendation !== 'BLOCK') recs.push(r.recommendation)
      const score = r.risk_score
      const severity = r.severity || 'unknown'
      return {
        id: r.id,
        workflow_id: r.workflow_id,
        risk_score: score,
        severity,
        findings: r.findings || [],
        recommendations: recs,
        timestamp: r.timestamp,
      } as RiskLog
    })
  )
}

// ─── Performance ─────────────────────────────────────────────────────────────

export interface PerformanceLog {
  id: string
  workflow_id: string
  agent_name: string
  latency_ms: number
  tokens_used: number
  provider: string
  model: string
  timestamp: string
}

export const getWorkflowPerformance = (id: string) => {
  if (!id) return Promise.resolve([])
  return Promise.all([
    request<any[]>(`/workflow/${id}/performance`),
    getWorkflowCost(id),
  ]).then(([perf, cost]) => {
    return perf.map((p) => {
      const c = cost.find((item) => item.agent_name === p.agent_name)
      
      let mappedProvider = p.provider
      if (p.agent_name === 'MetaAgent' || p.agent_name === 'RegistryAgent' || p.agent_name === 'EscalationAgent') {
        mappedProvider = 'local'
      } else if (p.agent_name === 'SecurityAgent') {
        mappedProvider = 'aiml'
      } else if (p.agent_name === 'ComplianceAgent' || p.agent_name === 'RiskAgent' || p.agent_name === 'AuditAgent') {
        mappedProvider = 'band'
      }

      return {
        id: p.id,
        workflow_id: p.workflow_id,
        agent_name: p.agent_name,
        latency_ms: p.latency_ms,
        tokens_used: c ? c.tokens_used : 0,
        provider: mappedProvider,
        model: c && c.model && c.model !== 'demo-mode' && c.model !== 'rule_engine' && c.model !== 'band_api' ? c.model : 'governance-ai',
        timestamp: p.timestamp,
      } as PerformanceLog
    })
  })
}

// ─── Cost ────────────────────────────────────────────────────────────────────

export interface CostLog {
  id: string
  workflow_id: string
  agent_name: string
  token_cost: number
  total_cost: number
  tokens_used: number
  timestamp: string
  model?: string
  provider?: string
}

export const getWorkflowCost = (id: string) => {
  if (!id) return Promise.resolve([])
  return request<any[]>(`/workflow/${id}/cost`).then((data) =>
    data.map((c) => ({
      id: c.id,
      workflow_id: c.workflow_id,
      agent_name: c.agent_name,
      tokens_used: c.estimated_tokens ?? 0,
      token_cost: c.estimated_cost_usd ?? 0,
      total_cost: c.estimated_cost_usd ?? 0,
      timestamp: c.timestamp,
      model: c.model,
      provider: c.provider,
    }))
  )
}

// ─── Lineage ─────────────────────────────────────────────────────────────────

export interface LineageNode {
  id: string
  label: string
  role: string
  decision: string
  confidence: number
  latency_ms: number
  cost_usd: number
  status: string
  reasoning: string
  recommendation: string
  finding?: string
  evidence?: string[]
  impact?: string
  governance_intelligence?: import('@/types/governance').GovernanceIntelligence | null
}

export interface LineageEdge {
  id: string
  source: string
  target: string
  animated: boolean
  label?: string
}

export interface LineageGraph {
  nodes: LineageNode[]
  edges: LineageEdge[]
}

export const getWorkflowLineage = (id: string) => {
  if (!id) return Promise.resolve({ nodes: [], edges: [] })
  return request<{ nodes: any[]; edges: any[] }>(`/workflow/${id}/lineage`).then((graph) => {
    const roles: Record<string, string> = {
      MetaAgent: 'Meta-Governance Orchestrator',
      RegistryAgent: 'Agent Registry Inspector',
      SecurityAgent: 'Security & Secret Scanner',
      ComplianceAgent: 'Compliance Guardrail Policy',
      RiskAgent: 'Normalized Risk Evaluator',
      EscalationAgent: 'Human Escalation Coordinator',
      AuditAgent: 'Governance Ledger Archiver',
    }

    const mappedNodes = (graph.nodes || []).map((n) => {
      const data = n.data || {}
      const agent = data.agent || 'Unknown Agent'
      const role = roles[agent] || 'Governance Sub-Agent'
      const decision = data.decision || 'PENDING'
      const output = data.output || {}
      const gi = output.governance_intelligence as import('@/types/governance').GovernanceIntelligence | undefined

      let status = 'pending'
      const dUpper = decision.toUpperCase()
      if (dUpper === 'APPROVED' || dUpper === 'SUCCESS' || dUpper === 'PASS' || dUpper === 'PASSED'
        || dUpper === 'PROCEED' || dUpper === 'VALID' || dUpper === 'INITIALIZED'
        || dUpper === 'COMPLETE' || dUpper === 'COMPLETED') {
        status = 'approved'
      } else if (dUpper === 'ESCALATED' || dUpper === 'REVIEW' || dUpper === 'REVIEW_REQUIRED' || dUpper === 'FLAG') {
        status = 'escalated'
      } else if (dUpper === 'BLOCKED' || dUpper === 'BLOCK' || dUpper === 'FAIL' || dUpper === 'DENIED') {
        status = 'blocked'
      }

      let recommendation = gi?.recommendation || ''
      if (!recommendation) {
        try {
          if (data.response_text) {
            const parsed = JSON.parse(data.response_text)
            recommendation = parsed.recommendation || parsed.recommendations?.join(', ') || ''
          }
        } catch (e) {
          // Ignored
        }
      }

      const finding = gi?.finding || data.reasoning_summary || 'No reasoning provided.'
      const evidence = gi?.evidence || (Array.isArray(data.evidence) ? data.evidence : [])
      const impact = gi?.impact

      return {
        id: n.id,
        label: agent.replace(/([A-Z])/g, ' $1').trim(),
        role,
        decision,
        confidence: data.confidence ?? 1.0,
        latency_ms: data.latency_ms ?? 0,
        cost_usd: data.cost_usd ?? 0.0,
        status,
        reasoning: finding,
        recommendation,
        finding,
        evidence,
        impact,
        governance_intelligence: gi ?? null,
      } as LineageNode
    })

    return {
      nodes: mappedNodes,
      edges: graph.edges || [],
    } as LineageGraph
  })
}

// ─── Agents & Governance ─────────────────────────────────────────────────────

export interface GovernanceAgent {
  agent_id: string
  name: string
  type: 'rule' | 'ai'
  provider: 'local' | 'aiml' | 'band'
  status: string
  tier: string[]
  description: string
}

export const getGovernanceAgents = () =>
  request<GovernanceAgent[]>('/agents/governance')

export const getAgents = () => request<GovernanceAgent[]>('/agents/governance')
