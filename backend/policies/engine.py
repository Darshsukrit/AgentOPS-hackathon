"""Deterministic compliance policy engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PolicyViolation:
    policy: str
    violation: str
    evidence: str
    severity: str


@dataclass
class PolicyResult:
    policy: str
    status: str  # PASS | FAIL | WARNING
    violations: List[PolicyViolation] = field(default_factory=list)
    evidence: List[str] = field(default_factory=list)
    recommendation: str = "Proceed"


def _has_pii_type(findings: List[Any], types: set[str]) -> bool:
    for f in findings:
        ftype = f.type if hasattr(f, "type") else f.get("type", "")
        if ftype in types:
            return True
    return False


def evaluate_hipaa(
    text: str,
    security_findings: Optional[List[Any]] = None,
    pii_detected: bool = False,
) -> PolicyResult:
    """HIPAA: PHI handling, minimum necessary, encryption requirements."""
    violations: List[PolicyViolation] = []
    evidence: List[str] = []
    phi_types = {"SSN", "MRN", "INSURANCE_ID", "DRIVER_LICENSE", "PASSPORT"}
    healthcare_context = any(
        kw in text.lower()
        for kw in ("patient", "medical", "healthcare", "hipaa", "phi", "mrn", "diagnosis")
    )

    if healthcare_context:
        evidence.append("Healthcare/PHI context detected in request")

    has_phi = pii_detected or _has_pii_type(security_findings or [], phi_types)

    if has_phi and healthcare_context:
        violations.append(PolicyViolation(
            policy="HIPAA",
            violation="PHI detected in uncontrolled agent request context",
            evidence="Protected health information fields present in agent purpose/identity",
            severity="HIGH",
        ))
        evidence.append("PHI types: SSN, MRN, or Insurance ID in healthcare workflow")

    if has_phi and "encrypt" not in text.lower() and "secure" not in text.lower():
        violations.append(PolicyViolation(
            policy="HIPAA",
            violation="No encryption or secure-transmission reference for PHI handling",
            evidence="HIPAA §164.312 — technical safeguards require encryption at rest/in transit",
            severity="MEDIUM",
        ))

    status = "FAIL" if violations else "PASS"
    recommendation = "Remediate PHI handling controls before proceeding" if violations else "HIPAA controls satisfied"
    return PolicyResult(
        policy="HIPAA",
        status=status,
        violations=violations,
        evidence=evidence,
        recommendation=recommendation,
    )


def evaluate_gdpr(
    text: str,
    security_findings: Optional[List[Any]] = None,
    pii_detected: bool = False,
) -> PolicyResult:
    """GDPR: lawful basis, data minimization, cross-border transfer."""
    violations: List[PolicyViolation] = []
    evidence: List[str] = []
    personal_data_types = {"EMAIL", "PHONE", "SSN", "PASSPORT", "DRIVER_LICENSE"}

    has_personal_data = pii_detected or _has_pii_type(security_findings or [], personal_data_types)

    if has_personal_data:
        evidence.append("Personal data detected in agent request")
        if not any(kw in text.lower() for kw in ("consent", "lawful basis", "legitimate interest", "gdpr")):
            violations.append(PolicyViolation(
                policy="GDPR",
                violation="Personal data processing without documented lawful basis",
                evidence="GDPR Art. 6 — lawful basis required for processing personal data",
                severity="HIGH",
            ))

        if any(kw in text.lower() for kw in ("export", "transfer", "cross-border", "international")):
            if "adequacy" not in text.lower() and "scc" not in text.lower():
                violations.append(PolicyViolation(
                    policy="GDPR",
                    violation="Cross-border data transfer without adequacy or SCC reference",
                    evidence="GDPR Art. 44-49 — transfer mechanisms required",
                    severity="HIGH",
                ))

    status = "FAIL" if violations else "PASS"
    recommendation = "Establish lawful basis and transfer mechanisms" if violations else "GDPR requirements met"
    return PolicyResult(
        policy="GDPR",
        status=status,
        violations=violations,
        evidence=evidence,
        recommendation=recommendation,
    )


def evaluate_soc2(
    text: str,
    security_findings: Optional[List[Any]] = None,
    secrets_detected: bool = False,
) -> PolicyResult:
    """SOC2: security, availability, confidentiality trust criteria."""
    violations: List[PolicyViolation] = []
    evidence: List[str] = []

    if secrets_detected or any(
        (f.category if hasattr(f, "category") else f.get("category")) == "SECRET"
        for f in (security_findings or [])
    ):
        violations.append(PolicyViolation(
            policy="SOC2",
            violation="Exposed credentials or secrets in agent context",
            evidence="SOC2 CC6.1 — logical access credentials must not be exposed in plaintext",
            severity="CRITICAL",
        ))
        evidence.append("Secret/credential pattern detected by security scanner")

    if any(kw in text.lower() for kw in ("production", "prod", "live database")):
        if "audit" not in text.lower() and "log" not in text.lower():
            violations.append(PolicyViolation(
                policy="SOC2",
                violation="Production access without audit logging reference",
                evidence="SOC2 CC7.2 — system monitoring and audit trails required",
                severity="MEDIUM",
            ))

    status = "FAIL" if violations else "PASS"
    recommendation = "Remediate security control gaps" if violations else "SOC2 controls satisfied"
    return PolicyResult(
        policy="SOC2",
        status=status,
        violations=violations,
        evidence=evidence,
        recommendation=recommendation,
    )


def run_policy_engine(
    text: str,
    security_findings: Optional[List[Any]] = None,
    pii_detected: bool = False,
    secrets_detected: bool = False,
) -> Dict[str, Any]:
    """Run all compliance policies and aggregate deterministic results."""
    results = [
        evaluate_hipaa(text, security_findings, pii_detected),
        evaluate_gdpr(text, security_findings, pii_detected),
        evaluate_soc2(text, security_findings, secrets_detected),
    ]

    all_violations: List[PolicyViolation] = []
    all_evidence: List[str] = []
    policy_refs: List[str] = []
    frameworks_checked = [r.policy for r in results]

    for r in results:
        all_violations.extend(r.violations)
        all_evidence.extend(r.evidence)
        for v in r.violations:
            policy_refs.append(f"{v.policy}: {v.violation[:60]}")

    has_fail = any(r.status == "FAIL" for r in results)
    has_warning = any(r.status == "WARNING" for r in results)

    if has_fail:
        status = "FAIL"
        recommendation = "Workflow blocked — compliance violations must be remediated"
    elif has_warning:
        status = "WARNING"
        recommendation = "Proceed with documented exceptions and monitoring"
    else:
        status = "PASS"
        recommendation = "All compliance frameworks satisfied"

    return {
        "status": status,
        "violations": [
            {"policy": v.policy, "violation": v.violation, "evidence": v.evidence, "severity": v.severity}
            for v in all_violations
        ],
        "frameworks_checked": frameworks_checked,
        "policy_refs": policy_refs,
        "evidence": all_evidence,
        "recommendation": recommendation,
        "policy_results": results,
    }
