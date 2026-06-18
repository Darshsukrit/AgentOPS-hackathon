"""Production governance thresholds and Band agent handle mapping."""

# Escalation rule engine thresholds (0-100 risk score scale)
ESCALATION_THRESHOLD: int = 76
BLOCK_THRESHOLD: int = 91

# Risk severity bands
RISK_SEVERITY_BANDS = {
    "LOW": (0, 25),
    "MEDIUM": (26, 50),
    "HIGH": (51, 75),
    "CRITICAL": (76, 100),
}

# Deterministic risk scoring weights
RISK_WEIGHTS = {
    "pii_detected": 30,
    "hipaa_violation": 30,
    "gdpr_violation": 20,
    "soc2_violation": 15,
    "exposed_secret": 40,
    "blocked_agent": 20,
    "blocked_tool": 25,
    "escalation_tool": 15,
    "review_tool": 10,
    "registry_suspended": 15,
    "unregistered_agent": 25,
    "model_not_allowed": 20,
}

# Band multi-agent governance handles (optional execution backend)
BAND_AGENT_HANDLES = {
    "security": "security-agent",
    "compliance": "compliance-agent",
    "risk": "risk-agent",
    "audit": "audit-agent",
}

# Global tool governance rules (applied before agent execution)
GLOBAL_TOOL_RULES = {
    "delete_database": "BLOCK",
    "drop_table": "BLOCK",
    "read_sensitive_records": "ESCALATE",
    "internet_access": "REVIEW",
    "external_api_call": "REVIEW",
    "file_system_write": "REVIEW",
}
