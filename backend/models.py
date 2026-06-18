from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, Literal

WorkflowTier = Literal["low", "medium", "high"]


class AgentIdentity(BaseModel):
    agent_id: str
    owner: str
    model: str
    purpose: str


# ---------------------------------------------------------------------------
# Structured governance findings (source of truth)
# ---------------------------------------------------------------------------

class SecurityFindingItem(BaseModel):
    category: str  # PII | SECRET
    type: str
    severity: str
    evidence: str
    masked_value: str


class SecurityFindings(BaseModel):
    findings: List[SecurityFindingItem] = Field(default_factory=list)
    pii_detected: bool = False
    secrets_detected: bool = False
    severity: str = "LOW"
    scanned_fields: List[str] = Field(default_factory=list)


class ComplianceViolationItem(BaseModel):
    policy: str
    violation: str
    evidence: str
    severity: str


class ComplianceFindings(BaseModel):
    status: str  # PASS | FAIL | WARNING
    violations: List[ComplianceViolationItem] = Field(default_factory=list)
    frameworks_checked: List[str] = Field(default_factory=list)
    policy_refs: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    recommendation: str = "Proceed"


class GovernanceIntelligence(BaseModel):
    finding: str
    evidence: List[str] = Field(default_factory=list)
    impact: str
    recommendation: str
    confidence: float = Field(ge=0.0, le=1.0)
    decision: str
    policies_triggered: List[str] = Field(default_factory=list)
    affected_systems: List[str] = Field(default_factory=list)
    threat_analysis: Optional[str] = None
    classification: Optional[str] = None
    likelihood: Optional[str] = None
    potential_outcome: Optional[str] = None


class RiskScoreResult(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    severity: str
    score_breakdown: Dict[str, int] = Field(default_factory=dict)
    findings: List[str] = Field(default_factory=list)
    recommendation: str = "PROCEED"
    likelihood: Optional[str] = None
    impact_level: Optional[str] = None
    affected_systems: List[str] = Field(default_factory=list)
    potential_outcome: Optional[str] = None
    classification: Optional[str] = None


class EscalationState(BaseModel):
    escalated: bool = False
    blocked: bool = False
    case_id: Optional[str] = None
    priority: Optional[str] = None
    recommended_action: str = "PROCEED"  # PROCEED | REVIEW | BLOCK
    reasoning: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)


class AuditRecord(BaseModel):
    record_id: str
    workflow_id: str
    timestamp: str
    security_findings: List[Dict[str, Any]] = Field(default_factory=list)
    compliance_findings: List[Dict[str, Any]] = Field(default_factory=list)
    risk_score: int = 0
    decision: str
    escalation_status: str
    decision_chain: List[str] = Field(default_factory=list)
    participating_agents: List[str] = Field(default_factory=list)


class ToolGovernanceResult(BaseModel):
    action: str = "ALLOW"  # ALLOW | REVIEW | ESCALATE | BLOCK
    matched_tools: List[str] = Field(default_factory=list)
    blocked_tools: List[str] = Field(default_factory=list)
    escalation_tools: List[str] = Field(default_factory=list)
    review_tools: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    recommendation: str = "Proceed"


# ---------------------------------------------------------------------------
# Agent output models (backward-compatible API contracts)
# ---------------------------------------------------------------------------

class RegistryOutput(BaseModel):
    is_valid: bool
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    registry_status: Optional[str] = None
    risk_level: Optional[str] = None
    model_allowed: Optional[bool] = None
    allowed_tools: List[str] = Field(default_factory=list)
    blocked_tools: List[str] = Field(default_factory=list)
    escalation_tools: List[str] = Field(default_factory=list)
    governance_intelligence: Optional[GovernanceIntelligence] = None


class SecurityOutput(BaseModel):
    pii_detected: bool
    severity: str
    findings: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    secrets_detected: bool = False
    structured_findings: List[SecurityFindingItem] = Field(default_factory=list)
    governance_intelligence: Optional[GovernanceIntelligence] = None


class ComplianceOutput(BaseModel):
    status: str
    violations: List[str]
    frameworks_checked: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    policy_refs: List[str]
    structured_violations: List[ComplianceViolationItem] = Field(default_factory=list)
    governance_intelligence: Optional[GovernanceIntelligence] = None


class RiskOutput(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    severity: str
    findings: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    score_breakdown: Dict[str, int] = Field(default_factory=dict)
    governance_intelligence: Optional[GovernanceIntelligence] = None


class EscalationOutput(BaseModel):
    escalated: bool
    case_id: Optional[str] = None
    priority: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = None
    recommendation: Optional[str] = None
    recommended_action: Optional[str] = None
    blocked: bool = False
    governance_intelligence: Optional[GovernanceIntelligence] = None


class AuditOutput(BaseModel):
    governance_summary: str
    decision_chain: List[str]
    participating_agents: List[str]
    final_outcome: str
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    risk_visualization: Optional[str] = None
    audit_record_id: Optional[str] = None
    governance_intelligence: Optional[GovernanceIntelligence] = None


class AgentExecutionMetrics(BaseModel):
    agent_name: str
    provider: str
    model: str
    latency_ms: float
    tokens: int
    cost_usd: float
    decision: str
    reasoning: str
    confidence: float
    success: bool
    prompt_summary: Optional[str] = None
    response_text: Optional[str] = None
    error: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    evidence: Optional[List[str]] = None
    output_data: Optional[Dict[str, Any]] = None


class WorkflowRequest(BaseModel):
    identity: AgentIdentity
    tier: WorkflowTier = "medium"


class WorkflowContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    workflow_id: str
    tier: WorkflowTier = "medium"
    band_room_id: Optional[str] = None
    identity: Optional[AgentIdentity] = None

    # Structured governance truth (deterministic)
    security_findings: Optional[SecurityFindings] = None
    compliance_findings: Optional[ComplianceFindings] = None
    risk_score: Optional[RiskScoreResult] = None
    escalation_state: Optional[EscalationState] = None
    audit_record: Optional[AuditRecord] = None
    tool_governance: Optional[ToolGovernanceResult] = None

    # Backward-compatible agent outputs (derived from structured findings)
    registry: Optional[RegistryOutput] = None
    security: Optional[SecurityOutput] = None
    compliance: Optional[ComplianceOutput] = None
    risk: Optional[RiskOutput] = None
    escalation: Optional[EscalationOutput] = None
    audit: Optional[AuditOutput] = None

    execution_metrics: List[AgentExecutionMetrics] = Field(default_factory=list)
    governance_report: List[Dict[str, Any]] = Field(default_factory=list)
    status: str = "pending"
    error: Optional[str] = None

    # Injected at runtime — excluded from API serialization
    db: Optional[Any] = Field(default=None, exclude=True)
