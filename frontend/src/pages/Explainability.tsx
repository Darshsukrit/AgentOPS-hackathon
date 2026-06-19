import React, { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Brain,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Activity,
  DollarSign,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldOff,
  Clock,
  Zap,
  BarChart2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { PageHeader } from '@/layouts/PageHeader'
import { ContentWrapper, Grid } from '@/layouts/ContentWrapper'
import { EmptyState } from '@/components/ui/EmptyState'
import { GlassCard } from '@/components/ui/GlassCard'
import { MetricCard } from '@/components/ui/MetricCard'
import { SectionContainer } from '@/components/ui/SectionContainer'
import { DecisionBadge } from '@/components/ui/DecisionBadge'
import { GovernanceIntelligenceCard } from '@/components/governance/GovernanceIntelligenceCard'
import { fallbackIntelligence } from '@/types/governance'
import { useWorkflows, useWorkflowLineage } from '@/hooks/useApi'
import type { LineageNode } from '@/services/api'
import { formatDuration, formatPercent, formatCost } from '@/lib/utils'

// ─── Node status helpers ──────────────────────────────────────────────────────

function nodeStatusStyle(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'approved' || s === 'success' || s === 'valid') {
    return { border: '#10B981', bg: 'rgba(6, 78, 59, 0.7)', accent: '#10B981', text: '#F5F5F5',
             badge: 'bg-green-500/10 border-green-500/20 text-green-400', icon: CheckCircle2 }
  }
  if (s === 'blocked' || s === 'denied' || s === 'fail') {
    return { border: '#EF4444', bg: 'rgba(127, 29, 29, 0.7)', accent: '#EF4444', text: '#F5F5F5',
             badge: 'bg-red-500/10 border-red-500/20 text-red-400', icon: ShieldOff }
  }
  if (s === 'escalated') {
    return { border: '#F97316', bg: 'rgba(124, 45, 18, 0.7)', accent: '#F97316', text: '#F5F5F5',
             badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400', icon: AlertTriangle }
  }
  if (s === 'review' || s === 'flagged' || s === 'warning') {
    return { border: '#F59E0B', bg: 'rgba(120, 53, 15, 0.7)', accent: '#F59E0B', text: '#F5F5F5',
             badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400', icon: AlertTriangle }
  }
  return { border: '#4B5563', bg: 'rgba(31, 41, 55, 0.7)', accent: '#9CA3AF', text: '#D1D5DB',
           badge: 'bg-gray-500/10 border-gray-500/20 text-gray-400', icon: Clock }
}

// ─── Custom React Flow Node ───────────────────────────────────────────────────

interface AgentNodeData extends LineageNode {
  selected?: boolean
  onSelect?: (node: LineageNode) => void
}

function AgentNode({ data, selected }: NodeProps & { data: AgentNodeData }) {
  const style = nodeStatusStyle(data.status)
  const Icon  = style.icon
  const isBandPowered = ['Compliance Enforcement', 'Risk Assessment', 'Audit Decision'].includes(data.label)

  return (
    <div
      onClick={() => data.onSelect?.(data)}
      style={{
        background: 'rgba(9, 9, 11, 0.9)',
        border: `1.5px solid ${selected ? '#FFFFFF' : `${style.accent}30`}`,
        borderRadius: 12,
        minWidth: 260,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: selected
          ? `0 0 0 2px rgba(255, 255, 255, 0.2), 0 8px 32px rgba(0,0,0,0.8), 0 0 20px ${style.accent}25`
          : '0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
      className={`p-0 hover:scale-[1.02] duration-300`}
    >
      <div style={{ background: style.accent, height: 3, borderRadius: '9px 9px 0 0', opacity: 0.8 }} />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: `${style.accent}15`, border: `1.5px solid ${style.accent}30` }}>
            <Icon size={16} color={style.accent} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white leading-snug tracking-tight m-0">{data.label}</p>
            <p className="text-[10px] text-text-muted m-0 mt-0.5 uppercase tracking-wide font-medium">{data.role}</p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap mb-4 items-center">
          <div className="inline-flex items-center px-2 py-0.5 rounded border"
                style={{ background: `${style.accent}10`, borderColor: `${style.accent}30` }}>
            <span className="text-[9px] font-extrabold font-mono tracking-wider" style={{ color: style.accent }}>
              {data.decision}
            </span>
          </div>
          {isBandPowered && (
            <div className="relative group inline-flex items-center px-2 py-0.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 text-amber-300 font-mono text-[9px] font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.25)] tracking-wider">
              ⚡ Powered by Band
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-[#0F111A] border border-amber-500/30 text-[9px] text-white font-medium rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap leading-none">
                Powered by Band Multi-Agent Infrastructure
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'CONF.', value: formatPercent(data.confidence) },
            { label: 'LATENCY', value: formatDuration(data.latency_ms) },
            { label: 'COST', value: formatCost(data.cost_usd) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-1.5 bg-white/[0.02] border border-white/5 rounded-md">
              <p className="text-[8px] text-text-muted font-bold tracking-wider mb-0.5 leading-none">{label}</p>
              <p className="text-[10px] font-bold text-white font-mono leading-none mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <Handle type="target" position={Position.Top}    style={{ background: '#52525B', border: '1px solid #27272A', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#52525B', border: '1px solid #27272A', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = { agentNode: AgentNode }

// ─── Agent Inspection Panel ────────────────────────────────────────────────────

function InspectionPanel({ node, onClose }: { node: LineageNode; onClose: () => void }) {
  const style = nodeStatusStyle(node.status)
  const Icon  = style.icon
  const intelligence = node.governance_intelligence ?? fallbackIntelligence(node.label, {
    reasoning: node.reasoning,
    evidence: node.evidence,
    recommendation: node.recommendation,
    confidence: node.confidence,
    decision: node.decision,
  })

  return (
    <div className="animate-fade-up">
      <GlassCard padding="none" className="overflow-hidden border-border/80">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/50 bg-bg-surface/60">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${style.badge}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">{node.label}</h3>
              <p className="text-2xs text-text-muted">{node.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-overlay transition-all" aria-label="Close inspection panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-border/40 bg-bg-base/40 flex items-center gap-4">
          {[
            { label: 'Decision',   value: node.decision },
            { label: 'Confidence', value: formatPercent(node.confidence) },
            { label: 'Latency',    value: formatDuration(node.latency_ms) },
            { label: 'Cost',       value: formatCost(node.cost_usd) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xs text-text-muted uppercase">{label}</p>
              <p className="text-sm font-semibold text-text-primary font-mono">{value}</p>
            </div>
          ))}
        </div>
        <div className="p-4">
          <GovernanceIntelligenceCard
            agentName={node.label}
            agentLabel={node.role}
            intelligence={intelligence}
          />
        </div>
      </GlassCard>
    </div>
  )
}

// ─── Confidence Distribution ─────────────────────────────────────────────────

function ConfidenceDistribution({ nodes }: { nodes: LineageNode[] }) {
  const avg = nodes.reduce((s, n) => s + (n.confidence ?? 0), 0) / (nodes.length || 1)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">Avg confidence</span>
        <span className="font-semibold text-text-primary">{formatPercent(avg)}</span>
      </div>
      <div className="space-y-2">
        {nodes.map((n) => {
          const style = nodeStatusStyle(n.status)
          return (
            <div key={n.id} className="flex items-center gap-2">
              <span className="text-2xs text-text-muted w-20 truncate shrink-0">{n.label.replace(' Agent', '')}</span>
              <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: formatPercent(n.confidence), background: style.accent }} />
              </div>
              <span className="text-2xs font-mono text-text-muted w-8 text-right">{formatPercent(n.confidence)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Build RF graph from lineage data ────────────────────────────────────────

function buildFlowGraph(
  nodes: LineageNode[],
  edges: { id: string; source: string; target: string; animated: boolean }[],
  selectedId: string | null,
  onSelect: (node: LineageNode) => void
): { nodes: Node[]; edges: Edge[] } {
  const VERTICAL_GAP = 180
  const NODE_WIDTH   = 280

  const rfNodes: Node[] = nodes.map((n, idx) => ({
    id:       n.id,
    type:     'agentNode',
    position: { x: 0, y: idx * VERTICAL_GAP },
    data:     { ...n, onSelect, selected: n.id === selectedId } as unknown as Record<string, unknown>,
    style:    { width: NODE_WIDTH },
  }))

  const rfEdges: Edge[] = edges.map((e) => {
    const sourceNode = nodes.find((n) => n.id === e.source)
    const status = sourceNode?.status ?? 'pending'
    const styleInfo = nodeStatusStyle(status)
    const strokeColor = styleInfo.accent

    return {
      id:        e.id,
      source:    e.source,
      target:    e.target,
      animated:  true,
      style:     { stroke: strokeColor, strokeWidth: 2, transition: 'stroke 0.3s' },
      markerEnd: { type: 'arrowclosed' as const, color: strokeColor, width: 14, height: 14 },
    }
  })

  return { nodes: rfNodes, edges: rfEdges }
}

// ─── Category cards ──────────────────────────────────────────────────────────

const explainCategories = [
  { id: 'decisions', icon: Brain,         title: 'Decision Rationale',  description: 'Deconstruct internal agent decision chains.' },
  { id: 'context',   icon: Layers,        title: 'Context Window',      description: 'Inspect precise prompts and tokens fed to models.' },
  { id: 'audit',     icon: FileText,      title: 'Audit Trail',         description: 'Verify cryptographic ledger logs and registry state.' },
  { id: 'natural',   icon: MessageSquare, title: 'Natural Language',    description: 'Review plain-text summaries explaining trace outcome.' },
]

// ─── Main Explainability Component ────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
    </div>
  )
}

export function Explainability() {
  const [searchParams] = useSearchParams()
  const { data: workflows } = useWorkflows()
  const firstId = workflows?.[0]?.id ?? ''
  const selectedId = searchParams.get('id') || firstId

  const { data: lineage, loading, refetch } = useWorkflowLineage(selectedId)
  const workflow = workflows?.find((w) => w.id === selectedId) ?? workflows?.[0]

  const [expandedChainSteps, setExpandedChainSteps] = React.useState<Record<number, boolean>>({ 0: true })
  const toggleStep = (idx: number) =>
    setExpandedChainSteps((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)
  const selectedNode = selectedNodeId
    ? lineage?.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null

  const handleNodeSelect = useCallback((node: LineageNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
  }, [])

  const rawNodes = lineage?.nodes ?? []
  const nodes = React.useMemo(() => {
    return rawNodes.map((n) => {
      let label = n.label
      let role = n.role
      const agentClean = (n.label || '').replace(/\s+Agent$/, 'Agent').replace(/\s+/g, '')

      if (n.id === 'node_request' || n.label.toLowerCase() === 'request') {
        label = 'Agent Request'
        role = 'Request Interceptor'
      } else if (agentClean.includes('MetaAgent')) {
        label = 'Meta-Governance'
        role = 'Pipeline Orchestration'
      } else if (agentClean.includes('RegistryAgent')) {
        label = 'Registry Validation'
        role = 'Agent Registry Inspector'
      } else if (agentClean.includes('SecurityAgent')) {
        label = 'Security Inspection'
        role = 'Security & Secret Scanner'
      } else if (agentClean.includes('ComplianceAgent')) {
        label = 'Compliance Enforcement'
        role = 'Compliance Guardrail Policy'
      } else if (agentClean.includes('RiskAgent')) {
        label = 'Risk Assessment'
        role = 'Normalized Risk Evaluator'
      } else if (agentClean.includes('EscalationAgent')) {
        label = 'Escalation Review'
        role = 'Human Escalation Coordinator'
      } else if (agentClean.includes('AuditAgent')) {
        label = 'Audit Decision'
        role = 'Governance Ledger Archiver'
      } else if (n.id === 'node_audit_record' || n.label.toLowerCase().includes('audit record') || n.label.toLowerCase().includes('final outcome')) {
        label = 'Final Outcome'
        role = 'Immutable Cryptographic Ledger'
      }

      return {
        ...n,
        label,
        role
      }
    })
  }, [rawNodes])
  const edges = lineage?.edges ?? []

  const { nodes: initNodes, edges: initEdges } = React.useMemo(() => {
    return buildFlowGraph(nodes, edges, selectedNodeId, handleNodeSelect)
  }, [nodes, edges, selectedNodeId, handleNodeSelect])

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initEdges)

  React.useEffect(() => {
    setRfNodes(initNodes)
  }, [initNodes, setRfNodes])

  React.useEffect(() => {
    setRfEdges(initEdges)
  }, [initEdges, setRfEdges])

  // Keep graph nodes in sync
  const syncedNodes = rfNodes.map((n) => ({
    ...n,
    data: { ...n.data, selected: n.id === selectedNodeId, onSelect: handleNodeSelect },
  }))

  const totalLatency = nodes.reduce((s, n) => s + (n.latency_ms ?? 0), 0)
  const totalCost    = nodes.reduce((s, n) => s + (n.cost_usd ?? 0), 0)

  return (
    <PageContainer>
      <PageHeader
        title="AI Decision Lineage"
        description="Every governance decision is traceable."
        badge={
          <span className="badge bg-bg-surface border border-border text-text-muted">
            <Sparkles className="w-3 h-3" />
            Beta
          </span>
        }
        actions={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-text-secondary bg-bg-surface hover:border-border-strong hover:text-text-primary transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      <ContentWrapper>
        {/* Context Bar */}
        {workflow && (
          <GlassCard padding="sm" className="flex items-center justify-between gap-4 flex-wrap border-border/70">
            <div className="flex items-center gap-3">
              <span className="text-2xs font-mono text-text-muted uppercase">Active Target:</span>
              <span className="text-xs font-mono font-semibold text-text-primary bg-bg-overlay border border-border px-2 py-0.5 rounded">
                {workflow.id.slice(0, 12)}…
              </span>
            </div>
            {workflow.final_decision && (
              <div className="flex items-center gap-2">
                <span className="text-2xs text-text-muted">Target Outcome:</span>
                <DecisionBadge decision={workflow.final_decision as never} className="scale-90" />
              </div>
            )}
          </GlassCard>
        )}

        {/* Feature Category Row */}
        <Grid cols={4}>
          {explainCategories.map((cat) => {
            const Icon = cat.icon
            return (
              <GlassCard key={cat.id} interactive padding="md" className="border-border/60">
                <div className="flex flex-col gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bg-overlay border border-border flex items-center justify-center">
                    <Icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{cat.title}</p>
                    <p className="text-2xs text-text-muted mt-0.5 leading-normal">{cat.description}</p>
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </Grid>

        {loading ? (
          <Spinner />
        ) : !lineage || nodes.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={<Brain className="w-5 h-5" />}
              title="No Lineage Data"
              description={selectedId ? "No lineage graph available for this workflow." : "Select a workflow to inspect lineage."}
            />
          </GlassCard>
        ) : (
          <>
            {/* Agent Graph */}
            <SectionContainer
              title="Dynamic Agent Graph"
              description="Interactive visualization of the multi-agent governance pipeline — click any node to inspect its decision"
            >
              <div className="rounded-xl overflow-hidden border border-border/60 bg-bg-base" style={{ height: 700 }}>
                <ReactFlow
                  nodes={syncedNodes}
                  edges={rfEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.3, maxZoom: 1.4 }}
                  minZoom={0.4}
                  maxZoom={2}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1F1F1F" />
                  <Controls position="bottom-right" />
                  <MiniMap position="bottom-left" nodeColor="#1F1F1F" maskColor="rgba(0,0,0,0.4)" />
                </ReactFlow>
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                {[
                  { label: 'Approved', color: 'bg-status-active' },
                  { label: 'Flagged',  color: 'bg-status-warning' },
                  { label: 'Blocked',  color: 'bg-status-error' },
                  { label: 'Pending',  color: 'bg-text-muted' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-2xs text-text-muted">{item.label}</span>
                  </div>
                ))}
                <span className="text-2xs text-text-muted ml-auto">Animated edges show live data flow direction</span>
              </div>
            </SectionContainer>

            {/* Agent Inspection Panel */}
            {selectedNode && (
              <SectionContainer
                title="Agent Inspection Panel"
                description={`Detailed reasoning and recommendation for ${selectedNode.label}`}
              >
                <InspectionPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
              </SectionContainer>
            )}

            {/* Adaptive Governance Route */}
            <SectionContainer
              title="Adaptive Governance Route"
              description="Visualizes the actual path taken through the 7-agent governance pipeline with per-agent outcome coloring"
            >
              <GlassCard padding="md" className="border-border/60">
                {/* Route strip */}
                <div className="flex items-center gap-0 overflow-x-auto pb-3">
                  {[
                    'MetaAgent', 'RegistryAgent', 'SecurityAgent',
                    'ComplianceAgent', 'RiskAgent', 'EscalationAgent', 'AuditAgent'
                  ].map((agentName, idx, arr) => {
                    const matchNode = nodes.find(
                      (n) => n.label.replace(/\s+Agent$/, 'Agent').replace(/\s+/g, '') === agentName
                              || n.label === agentName
                              || n.label.includes(agentName.replace('Agent', ''))
                    )
                    const status = matchNode?.status ?? 'pending'
                    const style = nodeStatusStyle(status)
                    const decision = matchNode?.decision ?? '—'
                    const conf = matchNode ? Math.round((matchNode.confidence ?? 0) * 100) : 0

                    return (
                      <React.Fragment key={agentName}>
                        <div
                          className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-all hover:scale-105 cursor-default"
                          style={{
                            borderColor: `${style.accent}40`,
                            background: `${style.accent}08`,
                            minWidth: 100,
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: `${style.accent}20`, color: style.accent, border: `1.5px solid ${style.accent}50` }}
                          >
                            {idx + 1}
                          </div>
                          <span className="text-[10px] font-semibold text-text-primary text-center leading-tight">{agentName.replace('Agent', '')}</span>
                          <span className="text-[9px] font-mono font-bold" style={{ color: style.accent }}>{decision}</span>
                          {matchNode && (
                            <span className="text-[9px] text-text-muted">{conf}% conf</span>
                          )}
                        </div>
                        {idx < arr.length - 1 && (
                          <div className="flex-shrink-0 w-6 flex items-center justify-center">
                            <ChevronRight className="w-3.5 h-3.5 text-text-muted/40" />
                          </div>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
                {/* Route summary */}
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-text-muted">
                  <span>
                    {nodes.filter(n => n.status === 'approved').length}/{nodes.length} agents approved ·{' '}
                    {nodes.filter(n => n.status === 'flagged' || n.status === 'escalated').length} flagged ·{' '}
                    {nodes.filter(n => n.status === 'blocked').length} blocked
                  </span>
                  <span className="font-mono text-text-secondary">
                    Route: {nodes.length > 0 ? 'Standard 7-Agent Pipeline' : 'No data'}
                  </span>
                </div>
              </GlassCard>
            </SectionContainer>

            {/* Performance + Details grid */}
            <Grid cols={3}>
              <div className="lg:col-span-2 space-y-6">
                {/* Summary */}
                <SectionContainer title="Explainability Summary" description="High-level audit parameters for this trace">
                  <GlassCard className="p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Participating Agents', value: nodes.length.toString() },
                        { label: 'Avg Confidence', value: formatPercent(nodes.reduce((s,n) => s + (n.confidence ?? 0), 0) / (nodes.length || 1)) },
                        { label: 'Total Latency',   value: formatDuration(totalLatency) },
                        { label: 'Total Cost',      value: formatCost(totalCost) },
                      ].map((item) => (
                        <div key={item.label} className="p-3 bg-bg-surface/60 border border-border rounded-lg">
                          <span className="text-2xs text-text-muted uppercase font-semibold">{item.label}</span>
                          <p className="text-lg font-semibold text-text-primary mt-1">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </SectionContainer>

                {/* Agent Decision Table */}
                <SectionContainer title="Agent Decision Ledger" description="Per-agent decisions from the lineage graph">
                  <GlassCard padding="none" className="overflow-hidden">
                    <table className="w-full text-left border-collapse" aria-label="Agent decision ledger">
                      <thead>
                        <tr className="border-b border-border bg-bg-elevated/40">
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Agent</th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Role</th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Decision</th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Confidence</th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Latency</th>
                          <th className="px-4 py-2.5 text-2xs font-semibold uppercase text-text-muted">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {nodes.map((node) => {
                          const style = nodeStatusStyle(node.status)
                          return (
                            <tr key={node.id} className="hover:bg-bg-overlay/20 transition-colors cursor-pointer" onClick={() => handleNodeSelect(node)}>
                              <td className="px-4 py-3 text-xs font-semibold text-text-primary">{node.label}</td>
                              <td className="px-4 py-3 text-2xs text-text-muted">{node.role}</td>
                              <td className="px-4 py-3">
                                <span className="text-2xs font-mono font-bold" style={{ color: style.accent }}>{node.decision}</span>
                              </td>
                              <td className="px-4 py-3 text-2xs text-text-secondary">{formatPercent(node.confidence)}</td>
                              <td className="px-4 py-3 text-2xs font-mono text-text-muted">{formatDuration(node.latency_ms)}</td>
                              <td className="px-4 py-3 text-2xs font-mono text-text-muted">{formatCost(node.cost_usd)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </GlassCard>
                </SectionContainer>

                {/* Reasoning Explorer */}
                <SectionContainer title="Reasoning Explorer" description="Per-agent reasoning and recommendations">
                  <div className="space-y-3">
                    {nodes.map((node, idx) => {
                      const isOpen = !!expandedChainSteps[idx]
                      return (
                        <GlassCard key={node.id} padding="none" className="overflow-hidden border-border/70">
                          <button
                            onClick={() => toggleStep(idx)}
                            className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-bg-overlay/10 transition-colors"
                            aria-expanded={isOpen}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded bg-bg-overlay border border-border flex items-center justify-center font-mono text-xs text-text-secondary">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-xs font-semibold text-text-primary">{node.label}</span>
                                <span className="text-2xs text-text-muted ml-2">({node.role})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="badge border border-border bg-bg-surface/50 text-text-secondary scale-90">{node.decision}</span>
                              {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4 pt-1 border-t border-border/40 bg-bg-surface/30 pl-14">
                              {node.reasoning && <p className="text-xs text-text-secondary leading-relaxed mb-2">{node.reasoning}</p>}
                              {node.recommendation && (
                                <p className="text-xs text-text-muted leading-relaxed">
                                  <span className="font-semibold text-text-secondary uppercase text-2xs">Rec: </span>
                                  {node.recommendation}
                                </p>
                              )}
                            </div>
                          )}
                        </GlassCard>
                      )
                    })}
                  </div>
                </SectionContainer>
              </div>

              {/* Right: Metrics + Confidence */}
              <div className="space-y-6">
                <SectionContainer title="Performance Metrics" description="Core system indicators for compliance runs">
                  <div className="space-y-3">
                    <MetricCard
                      title="Pipeline Latency"
                      value={formatDuration(totalLatency)}
                      description="Sum of all execution turns"
                      icon={<Activity className="w-4 h-4" />}
                    />
                    <MetricCard
                      title="Agent Count"
                      value={nodes.length.toString()}
                      description="Agents in pipeline"
                      icon={<Zap className="w-4 h-4" />}
                    />
                    <MetricCard
                      title="Financial Cost"
                      value={formatCost(totalCost)}
                      description="Estimated model execution cost"
                      icon={<DollarSign className="w-4 h-4" />}
                    />
                  </div>
                </SectionContainer>

                <SectionContainer title="Confidence Distribution" description="Per-agent confidence across the pipeline">
                  <GlassCard padding="md" className="border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="w-3.5 h-3.5 text-text-muted" />
                      <span className="text-2xs text-text-muted uppercase font-semibold">Agent Score Breakdown</span>
                    </div>
                    <ConfidenceDistribution nodes={nodes} />
                  </GlassCard>
                </SectionContainer>
              </div>
            </Grid>
          </>
        )}
      </ContentWrapper>
    </PageContainer>
  )
}
