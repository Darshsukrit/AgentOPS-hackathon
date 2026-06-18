"""Tool governance — deterministic pre-execution tool access checks."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from backend.governance.settings import GLOBAL_TOOL_RULES


@dataclass
class ToolGovernanceResult:
    action: str  # ALLOW | REVIEW | ESCALATE | BLOCK
    matched_tools: List[str] = field(default_factory=list)
    blocked_tools: List[str] = field(default_factory=list)
    escalation_tools: List[str] = field(default_factory=list)
    review_tools: List[str] = field(default_factory=list)
    evidence: List[str] = field(default_factory=list)
    recommendation: str = "Proceed"


def _extract_tool_mentions(text: str) -> List[str]:
    """Extract tool-like identifiers from purpose text."""
    mentions = set()
    # Explicit tool: syntax
    for match in re.finditer(r"(?:tool|use|invoke|call)[:\s]+([a-z_][a-z0-9_]*)", text, re.IGNORECASE):
        mentions.add(match.group(1).lower())
    # Known global tool names embedded in text
    for tool in GLOBAL_TOOL_RULES:
        if tool.replace("_", " ") in text.lower() or tool in text.lower():
            mentions.add(tool)
    return list(mentions)


def evaluate_tool_governance(
    purpose: str,
    allowed_tools: Optional[List[str]] = None,
    blocked_tools: Optional[List[str]] = None,
    escalation_tools: Optional[List[str]] = None,
) -> ToolGovernanceResult:
    """
    Evaluate tool access requests against registry and global governance rules.

    Global rules:
      delete_database -> BLOCK
      read_sensitive_records -> ESCALATE
      internet_access -> REVIEW
    """
    allowed_tools = allowed_tools or []
    blocked_tools = set(blocked_tools or [])
    escalation_tools = set(escalation_tools or [])
    mentions = _extract_tool_mentions(purpose)

    result = ToolGovernanceResult(action="ALLOW")
    result.matched_tools = mentions

    for tool in mentions:
        # Global rules take precedence
        global_action = GLOBAL_TOOL_RULES.get(tool)
        if global_action == "BLOCK":
            result.blocked_tools.append(tool)
            result.evidence.append(f"Global rule: {tool} -> BLOCK")
        elif global_action == "ESCALATE":
            result.escalation_tools.append(tool)
            result.evidence.append(f"Global rule: {tool} -> ESCALATE")
        elif global_action == "REVIEW":
            result.review_tools.append(tool)
            result.evidence.append(f"Global rule: {tool} -> REVIEW")
        elif tool in blocked_tools:
            result.blocked_tools.append(tool)
            result.evidence.append(f"Registry blocked_tools: {tool}")
        elif tool in escalation_tools:
            result.escalation_tools.append(tool)
            result.evidence.append(f"Registry escalation_tools: {tool}")
        elif allowed_tools and tool not in allowed_tools:
            result.review_tools.append(tool)
            result.evidence.append(f"Tool {tool} not in allowed_tools list")

    if result.blocked_tools:
        result.action = "BLOCK"
        result.recommendation = f"Blocked tools detected: {', '.join(result.blocked_tools)}"
    elif result.escalation_tools:
        result.action = "ESCALATE"
        result.recommendation = f"Escalation required for: {', '.join(result.escalation_tools)}"
    elif result.review_tools:
        result.action = "REVIEW"
        result.recommendation = f"Manual review required for: {', '.join(result.review_tools)}"

    return result
