from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class WorkflowDB(Base):
    __tablename__ = "workflows"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_id = Column(String, nullable=False)
    owner = Column(String, nullable=False)
    model = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    status = Column(String, default="running")
    band_room_id = Column(String, nullable=True)
    band_execution_id = Column(String, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    final_decision = Column(String, nullable=True)

class AuditLogDB(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    event_type = Column(String, nullable=False) # e.g., "workflow_started", "registry_complete"
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class RiskLogDB(Base):
    __tablename__ = "risk_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    risk_score = Column(Integer, nullable=False)
    severity = Column(String, nullable=False)
    findings = Column(JSON, nullable=True) # list of findings
    recommendation = Column(String, nullable=False)
    rationale = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

class PerformanceLogDB(Base):
    __tablename__ = "performance_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    latency_ms = Column(Float, nullable=False)
    success = Column(Boolean, default=True)
    error_message = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class CostLogDB(Base):
    __tablename__ = "cost_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    estimated_tokens = Column(Integer, nullable=False)
    estimated_cost_usd = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

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
    timestamp = Column(DateTime, default=datetime.utcnow)
