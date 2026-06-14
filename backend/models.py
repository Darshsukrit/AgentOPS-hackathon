from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AgentIdentity(BaseModel):
    agent_id: str
    owner: str
    model: str
    purpose: str

class RegistryOutput(BaseModel):
    is_valid: bool
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str

class SecurityOutput(BaseModel):
    pii_detected: bool
    severity: str
    findings: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str

class ComplianceOutput(BaseModel):
    status: str
    violations: List[str]
    frameworks_checked: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str
    policy_refs: List[str]

class RiskOutput(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    severity: str
    findings: List[str]
    reasoning: str
    confidence: float
    evidence: List[str]
    recommendation: str

class EscalationOutput(BaseModel):
    escalated: bool
    case_id: Optional[str] = None
    priority: Optional[str] = None
    reasoning: Optional[str] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = None
    recommendation: Optional[str] = None

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

class WorkflowContext(BaseModel):
    workflow_id: str
    band_room_id: Optional[str] = None
    identity: Optional[AgentIdentity] = None
    registry: Optional[RegistryOutput] = None
    security: Optional[SecurityOutput] = None
    compliance: Optional[ComplianceOutput] = None
    risk: Optional[RiskOutput] = None
    escalation: Optional[EscalationOutput] = None
    audit: Optional[AuditOutput] = None
    
    # Metadata for DB persistence tracking
    execution_metrics: List[AgentExecutionMetrics] = Field(default_factory=list)
    
    # Track overall workflow status
    status: str = "pending"
    error: Optional[str] = None
