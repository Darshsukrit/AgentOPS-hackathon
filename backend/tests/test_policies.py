import pytest
from backend.policies.engine import evaluate_hipaa, evaluate_gdpr, evaluate_soc2, run_policy_engine
from backend.security.detectors import DetectionFinding


def test_hipaa_phi_violation():
    findings = [DetectionFinding("PII", "SSN", "CRITICAL", "test", "41***12")]
    result = evaluate_hipaa(
        "Healthcare patient record transfer",
        security_findings=findings,
        pii_detected=True,
    )
    assert result.status == "FAIL"
    assert len(result.violations) >= 1


def test_gdpr_personal_data_violation():
    findings = [DetectionFinding("PII", "EMAIL", "MEDIUM", "test", "jo***rg")]
    result = evaluate_gdpr(
        "Process customer email list",
        security_findings=findings,
        pii_detected=True,
    )
    assert result.status == "FAIL"


def test_soc2_secret_violation():
    findings = [DetectionFinding("SECRET", "OPENAI_KEY", "CRITICAL", "test", "sk***90")]
    result = evaluate_soc2(
        "Deploy agent",
        security_findings=findings,
        secrets_detected=True,
    )
    assert result.status == "FAIL"


def test_clean_compliance():
    result = run_policy_engine(
        text="Generate quarterly financial summary",
        pii_detected=False,
        secrets_detected=False,
    )
    assert result["status"] == "PASS"
