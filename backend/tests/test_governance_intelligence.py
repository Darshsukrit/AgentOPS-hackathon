"""Tests for governance intelligence mappers."""

import pytest

from backend.governance.intelligence import (
    map_audit_intelligence,
    map_compliance_intelligence,
    map_escalation_intelligence,
    map_registry_intelligence,
    map_risk_intelligence,
    map_security_intelligence,
    build_governance_report,
)
from backend.models import (
    AgentIdentity,
    ComplianceFindings,
    ComplianceOutput,
    ComplianceViolationItem,
    EscalationOutput,
    EscalationState,
    RegistryOutput,
    RiskOutput,
    RiskScoreResult,
    SecurityFindingItem,
    SecurityFindings,
    SecurityOutput,
    ToolGovernanceResult,
    WorkflowContext,
)


def _assert_intelligence(gi, decision_substr: str = ""):
    assert gi.finding
    assert isinstance(gi.evidence, list)
    assert gi.impact
    assert gi.recommendation
    assert 0.0 <= gi.confidence <= 1.0
    assert gi.decision
    if decision_substr:
        assert decision_substr.upper() in gi.decision.upper()


def test_registry_intelligence_valid():
    registry = RegistryOutput(
        is_valid=True,
        reasoning="Agent identity verified",
        confidence=1.0,
        evidence=["Agent ID: test"],
        recommendation="PROCEED",
    )
    gi = map_registry_intelligence(registry)
    _assert_intelligence(gi, "Verified")


def test_registry_intelligence_invalid():
    registry = RegistryOutput(
        is_valid=False,
        reasoning="Agent not found in governance registry",
        confidence=1.0,
        evidence=["Registry lookup returned no record"],
        recommendation="BLOCK",
    )
    gi = map_registry_intelligence(registry)
    _assert_intelligence(gi, "Invalid")


def test_security_intelligence_flagged():
    structured = SecurityFindings(
        pii_detected=True,
        secrets_detected=False,
        severity="HIGH",
        findings=[
            SecurityFindingItem(
                category="PII",
                type="SSN",
                severity="HIGH",
                evidence="SSN pattern in purpose",
                masked_value="***-**-0012",
            )
        ],
    )
    output = SecurityOutput(
        pii_detected=True,
        severity="HIGH",
        findings=["SSN detected"],
        reasoning="PII detected",
        confidence=1.0,
        evidence=["SSN pattern"],
        recommendation="Flag — PII present",
    )
    gi = map_security_intelligence(structured, output)
    _assert_intelligence(gi, "Flagged")
    assert gi.threat_analysis


def test_compliance_intelligence_fail():
    structured = ComplianceFindings(
        status="FAIL",
        violations=[
            ComplianceViolationItem(
                policy="GDPR",
                violation="Cross-border transfer without consent",
                evidence="EU data transfer flagged",
                severity="HIGH",
            )
        ],
        frameworks_checked=["GDPR"],
        policy_refs=["GDPR Article 5"],
        evidence=["Cross-border transfer"],
        recommendation="Require user consent validation",
    )
    output = ComplianceOutput(
        status="FAIL",
        violations=["[GDPR] Cross-border transfer"],
        frameworks_checked=["GDPR"],
        reasoning="Compliance FAIL",
        confidence=1.0,
        evidence=["Cross-border transfer"],
        recommendation="Require user consent validation",
        policy_refs=["GDPR Article 5"],
    )
    gi = map_compliance_intelligence(structured, output)
    _assert_intelligence(gi, "FAIL")
    assert "GDPR Article 5" in gi.policies_triggered


def test_risk_intelligence_critical():
    structured = RiskScoreResult(
        risk_score=85,
        severity="CRITICAL",
        score_breakdown={"pii_detected": 30, "hipaa_violation": 30},
        findings=["PII detected", "HIPAA violation"],
        recommendation="BLOCK",
        likelihood="High",
        impact_level="Critical",
        affected_systems=["Customer Database", "Protected Health Records"],
        potential_outcome="Unauthorized disclosure of protected health information.",
        classification="CRITICAL",
    )
    output = RiskOutput(
        risk_score=85,
        severity="CRITICAL",
        findings=structured.findings,
        reasoning="High risk",
        confidence=1.0,
        evidence=["pii_detected"],
        recommendation="BLOCK",
    )
    gi = map_risk_intelligence(structured, output)
    _assert_intelligence(gi, "CRITICAL")
    assert gi.likelihood == "High"
    assert gi.potential_outcome


def test_escalation_intelligence_blocked():
    state = EscalationState(
        escalated=True,
        blocked=True,
        recommended_action="BLOCK",
        reasoning="Risk threshold exceeded",
        evidence=["Risk score = 95"],
    )
    output = EscalationOutput(
        escalated=True,
        blocked=True,
        reasoning=state.reasoning,
        confidence=1.0,
        evidence=state.evidence,
        recommendation="BLOCK",
    )
    gi = map_escalation_intelligence(state, output)
    _assert_intelligence(gi, "Blocked")


def test_audit_intelligence_denied():
    context = WorkflowContext(
        workflow_id="wf_test",
        identity=AgentIdentity(
            agent_id="Healthcare Data Request",
            owner="Ann Kowalski",
            model="gpt-4o",
            purpose="Export patient records",
        ),
    )
    gi = map_audit_intelligence(
        context,
        record_decision="DENIED",
        decision_chain=[
            "Security controls identified elevated exposure risk.",
            "Compliance review detected policy conflicts.",
        ],
        executive_summary="Governance blocked execution.",
        recommendation="Remediate compliance violations before retry",
    )
    _assert_intelligence(gi, "DENIED")
    assert len(gi.evidence) >= 1


def test_build_governance_report():
    context = WorkflowContext(workflow_id="wf_test")
    context.security = SecurityOutput(
        pii_detected=False,
        severity="LOW",
        findings=[],
        reasoning="Clean",
        confidence=1.0,
        evidence=[],
        recommendation="Pass",
        governance_intelligence=map_security_intelligence(
            SecurityFindings(),
            SecurityOutput(
                pii_detected=False,
                severity="LOW",
                findings=[],
                reasoning="Clean",
                confidence=1.0,
                evidence=[],
                recommendation="Pass",
            ),
        ),
    )
    report = build_governance_report(context)
    assert len(report) == 1
    assert report[0]["agent"] == "SecurityAgent"
    assert report[0]["governance_intelligence"]["finding"]
