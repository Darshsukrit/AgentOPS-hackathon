"""Deterministic governance intelligence mappers — narrative over scores."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.models import (
    AuditOutput,
    ComplianceFindings,
    ComplianceOutput,
    EscalationOutput,
    EscalationState,
    GovernanceIntelligence,
    RegistryOutput,
    RiskOutput,
    RiskScoreResult,
    SecurityFindings,
    SecurityOutput,
    ToolGovernanceResult,
    WorkflowContext,
)

TOOL_SYSTEM_LABELS: Dict[str, str] = {
    "query_database": "Customer Database",
    "read_records": "Customer Records",
    "read_sensitive_records": "Sensitive Records Vault",
    "generate_report": "Reporting System",
    "internet_access": "External API",
    "delete_database": "Production Database",
}


def _tool_label(tool: str) -> str:
    return TOOL_SYSTEM_LABELS.get(tool, tool.replace("_", " ").title())


def map_registry_intelligence(
    registry: RegistryOutput,
    tool_governance: Optional[ToolGovernanceResult] = None,
) -> GovernanceIntelligence:
    evidence = list(registry.evidence)
    affected: List[str] = []

    if tool_governance:
        for tool in tool_governance.matched_tools:
            affected.append(_tool_label(tool))
            evidence.append(f"Requested access: {_tool_label(tool)}")
        if tool_governance.blocked_tools:
            evidence.append(f"Blocked tools detected: {', '.join(tool_governance.blocked_tools)}")
        if tool_governance.escalation_tools:
            evidence.append(f"Escalation-required tools: {', '.join(tool_governance.escalation_tools)}")

    if registry.is_valid:
        finding = "Agent identity verified and permissions confirmed against the governance registry."
        impact = "Registered agent may proceed to downstream security and compliance evaluation."
        decision = "Verified"
        recommendation = registry.recommendation or "Proceed to security and compliance checks"
    else:
        finding = registry.reasoning or "Agent identity validation failed."
        if tool_governance and tool_governance.action == "BLOCK":
            finding = f"Tool governance blocked execution: {tool_governance.recommendation}"
        impact = "Unverified or unauthorized agents cannot access governed resources."
        decision = "Invalid"
        recommendation = registry.recommendation or "Block execution until identity is remediated"

    return GovernanceIntelligence(
        finding=finding,
        evidence=evidence,
        impact=impact,
        recommendation=recommendation,
        confidence=registry.confidence,
        decision=decision,
        affected_systems=affected,
    )


def map_security_intelligence(
    structured: SecurityFindings,
    output: SecurityOutput,
) -> GovernanceIntelligence:
    evidence: List[str] = []
    affected: List[str] = []

    for f in structured.findings:
        evidence.append(f"{f.type} ({f.category}): {f.masked_value}")
        if f.category == "PII":
            affected.append(f"{f.type} data store")
        elif f.category == "SECRET":
            affected.append("Credential vault")

    if structured.pii_detected or structured.secrets_detected:
        types = {f.type for f in structured.findings}
        if structured.secrets_detected:
            finding = "Exposed credentials or secrets detected in the agent request context."
            threat = "Sensitive authentication material may leave the trusted environment."
            impact = "Credential exposure could enable unauthorized system access or data breach."
            decision = "Flagged"
        else:
            finding = f"Personal identifiers detected in request context ({', '.join(sorted(types))})."
            threat = "Sensitive personal information may be transmitted outside controlled boundaries."
            impact = "External transfer of customer records requires additional consent verification."
            decision = "Flagged"
    else:
        finding = "No PII or secret patterns detected in scanned agent fields."
        threat = "No elevated transmission risk identified."
        impact = "Request context appears clean for standard governance thresholds."
        decision = "Clean"

    return GovernanceIntelligence(
        finding=finding,
        evidence=evidence or ["Clean scan — no PII or secret patterns matched"],
        impact=impact,
        recommendation=output.recommendation,
        confidence=output.confidence,
        decision=decision,
        threat_analysis=threat,
        affected_systems=affected,
        classification=structured.severity,
    )


def map_compliance_intelligence(
    structured: ComplianceFindings,
    output: ComplianceOutput,
) -> GovernanceIntelligence:
    policies = list(structured.policy_refs) or [v.policy for v in structured.violations]
    evidence: List[str] = list(structured.evidence)

    for v in structured.violations:
        evidence.append(f"[{v.policy}] {v.violation}: {v.evidence}")

    if structured.status == "PASS":
        finding = "All compliance frameworks satisfied for the evaluated request context."
        impact = "No regulatory policy conflicts identified for this workflow."
        decision = "PASS"
    else:
        violation_count = len(structured.violations)
        frameworks = ", ".join(structured.frameworks_checked) or "governance policy"
        finding = (
            f"Policy conflict detected across {frameworks}: "
            f"{violation_count} violation(s) require remediation."
        )
        impact = (
            "Regulatory exposure may result from proceeding without policy remediation. "
            "External transfer or processing may violate organizational data-sharing controls."
        )
        decision = structured.status

    return GovernanceIntelligence(
        finding=finding,
        evidence=evidence or [f"Frameworks checked: {', '.join(structured.frameworks_checked)}"],
        impact=impact,
        recommendation=output.recommendation,
        confidence=output.confidence,
        decision=decision,
        policies_triggered=policies,
    )


def map_risk_intelligence(
    structured: RiskScoreResult,
    output: RiskOutput,
    security_findings: Optional[SecurityFindings] = None,
    tool_governance: Optional[ToolGovernanceResult] = None,
) -> GovernanceIntelligence:
    narrative_evidence: List[str] = []
    affected = list(structured.affected_systems or [])

    if security_findings and security_findings.pii_detected:
        pii_types = {f.type for f in security_findings.findings if f.category == "PII"}
        narrative_evidence.append(f"PII detected: {', '.join(sorted(pii_types))}")
    if security_findings and security_findings.secrets_detected:
        narrative_evidence.append("Exposed credentials identified in security scan")
    if tool_governance and tool_governance.matched_tools:
        for tool in tool_governance.matched_tools:
            label = _tool_label(tool)
            if label not in affected:
                affected.append(label)
            narrative_evidence.append(f"Requested access to {_tool_label(tool)}")

    for item in structured.findings:
        clean = item.split("(+")[0].strip() if "(+" in item else item
        if clean not in narrative_evidence:
            narrative_evidence.append(clean)

    if not narrative_evidence:
        narrative_evidence.append("No elevated risk signals detected across prior governance stages")

    likelihood = structured.likelihood or "Low"
    impact_level = structured.impact_level or "Low"
    classification = structured.classification or structured.severity
    potential = structured.potential_outcome or "No material business risk identified."

    finding = (
        f"Business impact assessment — Likelihood: {likelihood}, "
        f"Impact: {impact_level}, Classification: {classification}."
    )
    impact = (
        f"Potential outcome: {potential}. "
        f"Affected systems: {', '.join(affected) if affected else 'None identified'}."
    )

    return GovernanceIntelligence(
        finding=finding,
        evidence=narrative_evidence,
        impact=impact,
        recommendation=output.recommendation,
        confidence=output.confidence,
        decision=classification,
        classification=classification,
        likelihood=likelihood,
        potential_outcome=potential,
        affected_systems=affected,
    )


def map_escalation_intelligence(
    state: EscalationState,
    output: EscalationOutput,
) -> GovernanceIntelligence:
    if state.blocked:
        finding = "Governance threshold exceeded — automated execution block triggered."
        impact = "Workflow execution is halted pending remediation of elevated risk signals."
        decision = "Blocked"
        recommendation = state.recommended_action or "BLOCK"
    elif state.escalated:
        finding = "Human governance review required before execution can proceed."
        impact = "Operational delay until a governance officer validates the request."
        decision = "Escalated"
        recommendation = state.recommended_action or "REVIEW"
    else:
        finding = "Risk posture within acceptable thresholds — no human escalation required."
        impact = "Workflow may proceed to final audit without manual intervention."
        decision = "Proceed"
        recommendation = state.recommended_action or "PROCEED"

    evidence = [
        e.replace("Risk score =", "Risk assessment:")
        for e in (state.evidence or [])
    ]

    return GovernanceIntelligence(
        finding=finding,
        evidence=evidence or [state.reasoning or "Escalation evaluation complete"],
        impact=impact,
        recommendation=recommendation,
        confidence=output.confidence or 1.0,
        decision=decision,
    )


def map_audit_intelligence(
    context: WorkflowContext,
    record_decision: str,
    decision_chain: List[str],
    executive_summary: str,
    recommendation: str,
) -> GovernanceIntelligence:
    identity = context.identity
    workflow_action = identity.purpose[:120] if identity and identity.purpose else "Governed agent action"
    agent_name = identity.agent_id if identity else "Unknown agent"

    evidence: List[str] = []
    if context.security and context.security.governance_intelligence:
        gi = context.security.governance_intelligence
        if gi.threat_analysis:
            evidence.append(f"Security: {gi.threat_analysis}")
    if context.compliance and context.compliance.governance_intelligence:
        gi = context.compliance.governance_intelligence
        if gi.policies_triggered:
            evidence.append(f"Compliance: policy conflicts with {', '.join(gi.policies_triggered)}")
    if context.risk and context.risk.governance_intelligence:
        gi = context.risk.governance_intelligence
        if gi.potential_outcome:
            evidence.append(f"Risk: {gi.potential_outcome}")

    if not evidence:
        evidence = list(decision_chain)

    finding = (
        f"Governance verdict for {agent_name}: requested action involves governed resources. "
        f"Final decision: {record_decision}."
    )

    if record_decision in ("DENIED", "BLOCKED"):
        impact = "Execution blocked — sensitive data handling controls were not satisfied."
    elif record_decision == "REVIEW_REQUIRED":
        impact = "Execution held pending human governance review."
    else:
        impact = "Execution may proceed under standard monitoring controls."

    return GovernanceIntelligence(
        finding=finding,
        evidence=evidence,
        impact=impact,
        recommendation=recommendation,
        confidence=1.0,
        decision=record_decision,
        classification=context.risk_score.classification if context.risk_score else None,
        threat_analysis=executive_summary[:300] if executive_summary else None,
    )


def build_governance_report(context: WorkflowContext) -> List[Dict[str, Any]]:
    """Ordered pipeline intelligence for API consumers."""
    report: List[Dict[str, Any]] = []
    entries = [
        ("RegistryAgent", context.registry),
        ("SecurityAgent", context.security),
        ("ComplianceAgent", context.compliance),
        ("RiskAgent", context.risk),
        ("EscalationAgent", context.escalation),
        ("AuditAgent", context.audit),
    ]
    for agent_name, output in entries:
        if output is None:
            continue
        gi = getattr(output, "governance_intelligence", None)
        if gi is None:
            continue
        report.append({
            "agent": agent_name,
            "governance_intelligence": gi.model_dump(),
        })
    return report
