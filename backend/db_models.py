from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone
import uuid

Base = declarative_base()


def get_utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def generate_uuid():
    return str(uuid.uuid4())


class AgentRegistryDB(Base):
    __tablename__ = "agent_registry"

    agent_id = Column(String, primary_key=True)
    owner = Column(String, nullable=False)
    status = Column(String, default="active")  # active | suspended | blocked
    risk_level = Column(String, default="low")
    allowed_models = Column(JSON, default=list)
    allowed_tools = Column(JSON, default=list)
    blocked_tools = Column(JSON, default=list)
    escalation_tools = Column(JSON, default=list)
    last_audit = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)


class WorkflowDB(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    model = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    status = Column(String, default="running")
    tier = Column(String, default="medium")
    band_room_id = Column(String, nullable=True)
    band_execution_id = Column(String, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_utc_now)
    completed_at = Column(DateTime, nullable=True)
    final_decision = Column(String, nullable=True)


class AuditRecordDB(Base):
    __tablename__ = "audit_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    timestamp = Column(DateTime, default=get_utc_now)
    security_findings = Column(JSON, nullable=True)
    compliance_findings = Column(JSON, nullable=True)
    risk_score = Column(Integer, nullable=False, default=0)
    decision = Column(String, nullable=False)
    escalation_status = Column(String, nullable=False, default="none")
    decision_chain = Column(JSON, nullable=True)
    participating_agents = Column(JSON, nullable=True)
    executive_summary = Column(Text, nullable=True)


class AuditLogDB(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    event_type = Column(String, nullable=False)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)


class RiskLogDB(Base):
    __tablename__ = "risk_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    risk_score = Column(Integer, nullable=False)
    severity = Column(String, nullable=False)
    findings = Column(JSON, nullable=True)
    recommendation = Column(String, nullable=False)
    rationale = Column(String, nullable=False)
    score_breakdown = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)


class PerformanceLogDB(Base):
    __tablename__ = "performance_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    latency_ms = Column(Float, nullable=False)
    success = Column(Boolean, default=True)
    error_message = Column(String, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)


class CostLogDB(Base):
    __tablename__ = "cost_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    estimated_tokens = Column(Integer, nullable=False)
    estimated_cost_usd = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=get_utc_now)


class DecisionLineageDB(Base):
    __tablename__ = "decision_lineage"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    decision = Column(String, nullable=False)
    reasoning_summary = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    latency_ms = Column(Float, nullable=False)
    tokens = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    prompt_summary = Column(String, nullable=True)
    response_text = Column(String, nullable=True)
    input_data = Column(JSON, nullable=True)
    evidence = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)
