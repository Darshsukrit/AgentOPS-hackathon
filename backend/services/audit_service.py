"""Immutable audit record service — source of truth for governance decisions."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.db_models import AuditRecordDB
from backend.governance.settings import BLOCK_THRESHOLD, ESCALATION_THRESHOLD
from backend.models import AuditRecord, WorkflowContext


def derive_governance_decision(context: WorkflowContext) -> str:
    """Deterministic final decision — never sourced from LLM."""
    if context.escalation_state and context.escalation_state.blocked:
        return "BLOCKED"
    if context.compliance_findings and context.compliance_findings.status == "FAIL":
        return "DENIED"
    if context.escalation_state and context.escalation_state.escalated:
        return "REVIEW_REQUIRED"
    risk_score = 0
    if context.risk_score:
        risk_score = context.risk_score.risk_score
    elif context.risk:
        risk_score = context.risk.risk_score
    if risk_score >= BLOCK_THRESHOLD:
        return "BLOCKED"
    if risk_score >= ESCALATION_THRESHOLD:
        return "REVIEW_REQUIRED"
    if context.security_findings and context.security_findings.secrets_detected:
        return "DENIED"
    return "APPROVED"


def build_decision_chain(context: WorkflowContext) -> List[str]:
    """Investigation-style narrative bullets for audit verdict lineage."""
    chain: List[str] = []

    if context.registry:
        if context.registry.is_valid:
            chain.append("Agent identity verified and registry permissions confirmed.")
        else:
            chain.append(f"Registry validation failed: {context.registry.reasoning}")

    if context.tool_governance and context.tool_governance.action != "ALLOW":
        chain.append(
            f"Tool governance flagged requested access: {context.tool_governance.recommendation}."
        )

    if context.security_findings:
        sf = context.security_findings
        if sf.secrets_detected:
            chain.append("Security controls identified exposed credentials in the request context.")
        elif sf.pii_detected:
            chain.append(
                f"Security scan detected personal identifiers (severity: {sf.severity})."
            )
        else:
            chain.append("Security inspection found no PII or credential exposure.")

    if context.compliance_findings:
        cf = context.compliance_findings
        if cf.status == "FAIL":
            policies = ", ".join(cf.policy_refs) if cf.policy_refs else "governance policy"
            chain.append(f"Compliance review detected policy conflicts ({policies}).")
        elif cf.status == "WARNING":
            chain.append("Compliance review issued warnings requiring attention.")
        else:
            chain.append("Compliance frameworks satisfied for evaluated request context.")

    if context.risk_score or context.risk:
        risk = context.risk_score or context.risk
        classification = getattr(risk, "classification", None) or getattr(risk, "severity", "UNKNOWN")
        potential = getattr(risk, "potential_outcome", None)
        if classification in ("CRITICAL", "HIGH"):
            msg = f"Risk assessment classified exposure as {classification}."
            if potential:
                msg += f" {potential}"
            chain.append(msg)
        elif classification == "MEDIUM":
            chain.append("Risk assessment identified elevated operational exposure.")
        else:
            chain.append("Risk posture within acceptable governance thresholds.")

    if context.escalation_state:
        es = context.escalation_state
        if es.blocked:
            chain.append("Governance threshold exceeded — execution blocked.")
        elif es.escalated:
            chain.append("Human governance review required before execution.")

    return chain


def build_audit_record(context: WorkflowContext) -> AuditRecord:
    """Build immutable audit record from deterministic governance signals."""
    decision = derive_governance_decision(context)
    escalation_status = "none"
    if context.escalation_state:
        if context.escalation_state.blocked:
            escalation_status = "blocked"
        elif context.escalation_state.escalated:
            escalation_status = "escalated"
        else:
            escalation_status = "cleared"

    risk_score_val = 0
    if context.risk_score:
        risk_score_val = context.risk_score.risk_score
    elif context.risk:
        risk_score_val = context.risk.risk_score

    security_data = []
    if context.security_findings:
        security_data = [f.model_dump() for f in context.security_findings.findings]

    compliance_data = []
    if context.compliance_findings:
        compliance_data = [v.model_dump() if hasattr(v, "model_dump") else v for v in context.compliance_findings.violations]

    return AuditRecord(
        record_id=str(uuid.uuid4()),
        workflow_id=context.workflow_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        security_findings=security_data,
        compliance_findings=compliance_data,
        risk_score=risk_score_val,
        decision=decision,
        escalation_status=escalation_status,
        decision_chain=build_decision_chain(context),
        participating_agents=[m.agent_name for m in context.execution_metrics],
    )


async def persist_audit_record(db: AsyncSession, record: AuditRecord, executive_summary: Optional[str] = None) -> AuditRecordDB:
    """Persist immutable audit record to database."""
    db_record = AuditRecordDB(
        id=record.record_id,
        workflow_id=record.workflow_id,
        security_findings=record.security_findings,
        compliance_findings=record.compliance_findings,
        risk_score=record.risk_score,
        decision=record.decision,
        escalation_status=record.escalation_status,
        decision_chain=record.decision_chain,
        participating_agents=record.participating_agents,
        executive_summary=executive_summary,
    )
    db.add(db_record)
    await db.flush()
    return db_record
