"""Deterministic risk scoring engine."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.governance.settings import RISK_WEIGHTS, RISK_SEVERITY_BANDS


def _severity_from_score(score: int) -> str:
    for label, (lo, hi) in RISK_SEVERITY_BANDS.items():
        if lo <= score <= hi:
            return label
    return "CRITICAL"


def calculate_risk_score(
    *,
    pii_detected: bool = False,
    secrets_detected: bool = False,
    hipaa_violation: bool = False,
    gdpr_violation: bool = False,
    soc2_violation: bool = False,
    agent_blocked: bool = False,
    agent_suspended: bool = False,
    agent_unregistered: bool = False,
    model_not_allowed: bool = False,
    blocked_tool: bool = False,
    escalation_tool: bool = False,
    review_tool: bool = False,
) -> Dict[str, Any]:
    """Calculate deterministic risk score from governance signals."""
    breakdown: Dict[str, int] = {}
    findings: List[str] = []

    def add(key: str, label: str):
        weight = RISK_WEIGHTS[key]
        breakdown[key] = weight
        findings.append(label)

    if pii_detected:
        add("pii_detected", "PII detected in request context (+30)")
    if secrets_detected:
        add("exposed_secret", "Exposed secret or credential detected (+40)")
    if hipaa_violation:
        add("hipaa_violation", "HIPAA compliance violation (+30)")
    if gdpr_violation:
        add("gdpr_violation", "GDPR compliance violation (+20)")
    if soc2_violation:
        add("soc2_violation", "SOC2 compliance violation (+15)")
    if agent_blocked:
        add("blocked_agent", "Agent is blocked in registry (+20)")
    if agent_suspended:
        add("registry_suspended", "Agent is suspended in registry (+15)")
    if agent_unregistered:
        add("unregistered_agent", "Agent not found in registry (+25)")
    if model_not_allowed:
        add("model_not_allowed", "Requested model not in allowed_models (+20)")
    if blocked_tool:
        add("blocked_tool", "Blocked tool requested (+25)")
    if escalation_tool:
        add("escalation_tool", "Escalation-required tool requested (+15)")
    if review_tool:
        add("review_tool", "Review-required tool requested (+10)")

    raw_score = sum(breakdown.values())
    risk_score = min(raw_score, 100)
    severity = _severity_from_score(risk_score)

    if risk_score >= 76:
        recommendation = "BLOCK" if risk_score >= 91 else "ESCALATE"
    elif risk_score >= 26:
        recommendation = "FLAG"
    else:
        recommendation = "PROCEED"

    likelihood = "Low"
    if risk_score >= 76:
        likelihood = "High"
    elif risk_score >= 26:
        likelihood = "Medium"

    impact_level = "Low"
    if secrets_detected or hipaa_violation:
        impact_level = "Critical"
    elif pii_detected or gdpr_violation or blocked_tool:
        impact_level = "High"
    elif soc2_violation or escalation_tool or agent_blocked:
        impact_level = "Medium"

    affected_systems: List[str] = []
    if pii_detected:
        affected_systems.append("Customer Database")
    if secrets_detected:
        affected_systems.append("Credential Vault")
    if hipaa_violation:
        affected_systems.append("Protected Health Records")
    if gdpr_violation:
        affected_systems.append("EU Personal Data Store")
    if blocked_tool:
        affected_systems.append("Production Database")
    if escalation_tool:
        affected_systems.append("Sensitive Records Vault")
    if review_tool:
        affected_systems.append("External API")

    if secrets_detected:
        potential_outcome = "Unauthorized disclosure of credentials or protected system access."
    elif hipaa_violation:
        potential_outcome = "Unauthorized disclosure of protected health information."
    elif pii_detected and gdpr_violation:
        potential_outcome = "Unauthorized disclosure of personal data subject to GDPR controls."
    elif pii_detected:
        potential_outcome = "Unauthorized disclosure of customer personal identifiers."
    elif blocked_tool:
        potential_outcome = "Destructive or unauthorized database operations."
    elif risk_score >= 76:
        potential_outcome = "Material governance breach with regulatory exposure."
    elif risk_score >= 26:
        potential_outcome = "Elevated operational risk requiring additional controls."
    else:
        potential_outcome = "No material business risk identified."

    return {
        "risk_score": risk_score,
        "severity": severity,
        "score_breakdown": breakdown,
        "findings": findings,
        "recommendation": recommendation,
        "likelihood": likelihood,
        "impact_level": impact_level,
        "affected_systems": affected_systems,
        "potential_outcome": potential_outcome,
        "classification": severity,
    }


def _read(obj: Any, key: str, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def score_from_context(
    registry: Optional[Any] = None,
    security_findings: Optional[Any] = None,
    compliance_findings: Optional[Any] = None,
    tool_governance: Optional[Any] = None,
) -> Dict[str, Any]:
    """Derive risk score from structured governance context objects."""
    pii_detected = bool(_read(security_findings, "pii_detected", False))
    secrets_detected = bool(_read(security_findings, "secrets_detected", False))

    hipaa_violation = gdpr_violation = soc2_violation = False
    violations = _read(compliance_findings, "violations", []) or []
    for v in violations:
        policy = _read(v, "policy", "")
        if policy == "HIPAA":
            hipaa_violation = True
        elif policy == "GDPR":
            gdpr_violation = True
        elif policy == "SOC2":
            soc2_violation = True

    agent_blocked = agent_suspended = agent_unregistered = model_not_allowed = False
    if registry:
        is_valid = _read(registry, "is_valid", True)
        if not is_valid:
            reasoning = _read(registry, "reasoning", "") or ""
            if "blocked" in reasoning.lower():
                agent_blocked = True
            elif "not found" in reasoning.lower() or "unregistered" in reasoning.lower():
                agent_unregistered = True
            elif "suspended" in reasoning.lower():
                agent_suspended = True
        evidence = _read(registry, "evidence", []) or []
        if any("model not allowed" in str(e).lower() for e in evidence):
            model_not_allowed = True

    blocked_tool = escalation_tool = review_tool = False
    if tool_governance:
        action = _read(tool_governance, "action", "ALLOW")
        if action == "BLOCK":
            blocked_tool = True
        elif action == "ESCALATE":
            escalation_tool = True
        elif action == "REVIEW":
            review_tool = True

    result = calculate_risk_score(
        pii_detected=pii_detected,
        secrets_detected=secrets_detected,
        hipaa_violation=hipaa_violation,
        gdpr_violation=gdpr_violation,
        soc2_violation=soc2_violation,
        agent_blocked=agent_blocked,
        agent_suspended=agent_suspended,
        agent_unregistered=agent_unregistered,
        model_not_allowed=model_not_allowed,
        blocked_tool=blocked_tool,
        escalation_tool=escalation_tool,
        review_tool=review_tool,
    )

    if tool_governance:
        from backend.governance.intelligence import TOOL_SYSTEM_LABELS
        matched = _read(tool_governance, "matched_tools", []) or []
        extra = [TOOL_SYSTEM_LABELS.get(t, t.replace("_", " ").title()) for t in matched]
        systems = list(dict.fromkeys(result["affected_systems"] + extra))
        result["affected_systems"] = systems

    return result
