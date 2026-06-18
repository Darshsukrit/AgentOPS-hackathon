import pytest
from backend.risk.scorer import calculate_risk_score, score_from_context
from backend.models import SecurityFindings, ComplianceFindings, ComplianceViolationItem


def test_pii_adds_30():
    result = calculate_risk_score(pii_detected=True)
    assert result["risk_score"] == 30
    assert result["severity"] == "MEDIUM"


def test_secret_adds_40():
    result = calculate_risk_score(secrets_detected=True)
    assert result["risk_score"] == 40


def test_combined_capped_at_100():
    result = calculate_risk_score(
        pii_detected=True,
        secrets_detected=True,
        hipaa_violation=True,
        gdpr_violation=True,
        agent_blocked=True,
    )
    assert result["risk_score"] == 100
    assert result["severity"] == "CRITICAL"


def test_severity_bands():
    assert calculate_risk_score()["severity"] == "LOW"
    assert calculate_risk_score(pii_detected=True)["severity"] == "MEDIUM"
    result = calculate_risk_score(pii_detected=True, hipaa_violation=True)
    assert result["severity"] == "HIGH"
    result = calculate_risk_score(pii_detected=True, secrets_detected=True, hipaa_violation=True)
    assert result["severity"] == "CRITICAL"


def test_narrative_fields_on_high_risk():
    result = calculate_risk_score(pii_detected=True, secrets_detected=True, hipaa_violation=True)
    assert result["likelihood"] == "High"
    assert result["impact_level"] == "Critical"
    assert result["classification"] == "CRITICAL"
    assert result["potential_outcome"]
    assert "Customer Database" in result["affected_systems"]


def test_score_from_context():
    security = SecurityFindings(pii_detected=True, secrets_detected=False, severity="HIGH")
    compliance = ComplianceFindings(
        status="FAIL",
        violations=[ComplianceViolationItem(
            policy="HIPAA", violation="PHI detected", evidence="test", severity="HIGH"
        )],
    )
    result = score_from_context(security_findings=security, compliance_findings=compliance)
    assert result["risk_score"] >= 60
