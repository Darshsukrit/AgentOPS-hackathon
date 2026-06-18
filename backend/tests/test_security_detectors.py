import pytest
from backend.security.detectors import scan_agent_identity, scan_text


def test_ssn_detection():
    findings = scan_text("Patient SSN: 411-992-0012", "purpose")
    types = {f.type for f in findings}
    assert "SSN" in types


def test_mrn_detection():
    findings = scan_text("Medical Record: MRN-881902-X", "purpose")
    types = {f.type for f in findings}
    assert "MRN" in types


def test_email_detection():
    findings = scan_text("Contact: john.doe@hospital.org", "purpose")
    types = {f.type for f in findings}
    assert "EMAIL" in types


def test_openai_key_detection():
    findings = scan_text("key=sk-abcdefghijklmnopqrstuvwxyz1234567890", "purpose")
    types = {f.type for f in findings}
    assert "OPENAI_KEY" in types


def test_clean_scan():
    result = scan_agent_identity("Test Agent", "Owner", "gpt-4o", "Generate quarterly report")
    assert result.pii_detected is False
    assert result.secrets_detected is False
    assert result.severity == "LOW"


def test_healthcare_pii_scan():
    result = scan_agent_identity(
        "Healthcare Data Request",
        "Ann Kowalski",
        "gpt-4o",
        "Patient: Sarah Jenkins, SSN: 411-992-0012, MRN-881902-X, INS-TX-99120",
    )
    assert result.pii_detected is True
    assert result.severity in ("HIGH", "CRITICAL")
