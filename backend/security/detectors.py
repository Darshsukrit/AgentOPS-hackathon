"""Deterministic PII and secret detection engine."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Pattern, Tuple


@dataclass
class DetectionFinding:
    category: str  # PII | SECRET
    type: str
    severity: str
    evidence: str
    masked_value: str
    position: Tuple[int, int] = (0, 0)


@dataclass
class ScanResult:
    findings: List[DetectionFinding] = field(default_factory=list)
    pii_detected: bool = False
    secrets_detected: bool = False
    severity: str = "LOW"
    scanned_fields: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Pattern definitions
# ---------------------------------------------------------------------------

PII_PATTERNS: List[Tuple[str, str, Pattern[str]]] = [
    ("PII", "SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("PII", "SSN", re.compile(r"\b\d{3}-\d{3}-\d{4}\b")),
    ("PII", "SSN", re.compile(r"\b\d{9}\b")),
    ("PII", "EMAIL", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("PII", "PHONE", re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("PII", "PASSPORT", re.compile(r"\b[A-Z]{1,2}\d{6,9}\b")),
    ("PII", "DRIVER_LICENSE", re.compile(r"\b[A-Z]\d{7,8}\b")),
    ("PII", "MRN", re.compile(r"\bMRN[-\s]?\d{4,}[-\w]*\b", re.IGNORECASE)),
    ("PII", "INSURANCE_ID", re.compile(r"\bINS[-\s]?[A-Z]{2}[-\s]?\d{4,}\b", re.IGNORECASE)),
    ("PII", "CREDIT_CARD", re.compile(r"\b(?:\d[ -]*?){13,16}\b")),
]

SECRET_PATTERNS: List[Tuple[str, str, Pattern[str]]] = [
    ("SECRET", "OPENAI_KEY", re.compile(r"sk-[A-Za-z0-9]{20,}")),
    ("SECRET", "AWS_ACCESS_KEY", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("SECRET", "AWS_SECRET_KEY", re.compile(r"(?i)aws[_\s]?secret[_\s]?access[_\s]?key\s*[:=]\s*[A-Za-z0-9/+=]{40}")),
    ("SECRET", "JWT_TOKEN", re.compile(r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")),
    ("SECRET", "GITHUB_TOKEN", re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}")),
    ("SECRET", "API_KEY", re.compile(r"(?i)(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}")),
    ("SECRET", "GENERIC_BEARER", re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{20,}")),
]

SEVERITY_MAP = {
    "SSN": "CRITICAL",
    "CREDIT_CARD": "CRITICAL",
    "MRN": "HIGH",
    "INSURANCE_ID": "HIGH",
    "PASSPORT": "HIGH",
    "DRIVER_LICENSE": "MEDIUM",
    "EMAIL": "MEDIUM",
    "PHONE": "MEDIUM",
    "OPENAI_KEY": "CRITICAL",
    "AWS_ACCESS_KEY": "CRITICAL",
    "AWS_SECRET_KEY": "CRITICAL",
    "JWT_TOKEN": "HIGH",
    "GITHUB_TOKEN": "HIGH",
    "API_KEY": "HIGH",
    "GENERIC_BEARER": "HIGH",
}

SEVERITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def _mask_value(value: str) -> str:
    stripped = value.strip()
    if len(stripped) <= 4:
        return "****"
    return f"{stripped[:2]}***{stripped[-2:]}"


def _luhn_check(number: str) -> bool:
    digits = [int(d) for d in re.sub(r"\D", "", number)]
    if len(digits) < 13:
        return False
    checksum = 0
    reverse = digits[::-1]
    for i, d in enumerate(reverse):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


def _apply_patterns(
    text: str,
    patterns: List[Tuple[str, str, Pattern[str]]],
    field_name: str,
) -> List[DetectionFinding]:
    findings: List[DetectionFinding] = []
    for category, ftype, pattern in patterns:
        for match in pattern.finditer(text):
            value = match.group()
            if ftype == "CREDIT_CARD" and not _luhn_check(value):
                continue
            if ftype == "SSN" and len(re.sub(r"\D", "", value)) == 9:
                digits = re.sub(r"\D", "", value)
                if digits.startswith("000") or digits.startswith("666"):
                    continue
            findings.append(
                DetectionFinding(
                    category=category,
                    type=ftype,
                    severity=SEVERITY_MAP.get(ftype, "MEDIUM"),
                    evidence=f"{field_name}: {ftype} pattern matched",
                    masked_value=_mask_value(value),
                    position=(match.start(), match.end()),
                )
            )
    return findings


def scan_text(text: str, field_name: str = "content") -> List[DetectionFinding]:
    """Run all PII and secret detectors against a single text field."""
    if not text:
        return []
    findings = _apply_patterns(text, PII_PATTERNS, field_name)
    findings.extend(_apply_patterns(text, SECRET_PATTERNS, field_name))
    return findings


def scan_fields(fields: dict[str, str]) -> ScanResult:
    """Scan multiple named text fields and aggregate results."""
    all_findings: List[DetectionFinding] = []
    scanned: List[str] = []

    for name, value in fields.items():
        if not value:
            continue
        scanned.append(name)
        all_findings.extend(scan_text(value, field_name=name))

    # Deduplicate by type + masked value
    seen = set()
    unique: List[DetectionFinding] = []
    for f in all_findings:
        key = (f.type, f.masked_value)
        if key not in seen:
            seen.add(key)
            unique.append(f)

    pii_detected = any(f.category == "PII" for f in unique)
    secrets_detected = any(f.category == "SECRET" for f in unique)

    max_severity = "LOW"
    for f in unique:
        if SEVERITY_RANK[f.severity] > SEVERITY_RANK[max_severity]:
            max_severity = f.severity

    return ScanResult(
        findings=unique,
        pii_detected=pii_detected,
        secrets_detected=secrets_detected,
        severity=max_severity,
        scanned_fields=scanned,
    )


def scan_agent_identity(agent_id: str, owner: str, model: str, purpose: str) -> ScanResult:
    """Convenience wrapper for scanning an agent identity payload."""
    return scan_fields({
        "agent_id": agent_id,
        "owner": owner,
        "model": model,
        "purpose": purpose,
    })
