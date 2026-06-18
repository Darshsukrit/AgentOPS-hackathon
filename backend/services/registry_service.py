"""Agent registry validation service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.db_models import AgentRegistryDB
from backend.models import AgentIdentity, RegistryOutput


async def get_agent(db: AsyncSession, agent_id: str) -> Optional[AgentRegistryDB]:
    result = await db.execute(select(AgentRegistryDB).filter_by(agent_id=agent_id))
    return result.scalars().first()


async def validate_agent(
    db: AsyncSession,
    identity: AgentIdentity,
) -> RegistryOutput:
    """Validate agent identity against the AgentRegistry database."""
    record = await get_agent(db, identity.agent_id)
    evidence: List[str] = [f"Agent ID: {identity.agent_id}"]

    if record is None:
        return RegistryOutput(
            is_valid=False,
            reasoning="Agent not found in governance registry",
            confidence=1.0,
            evidence=evidence + ["Registry lookup returned no record"],
            recommendation="BLOCK",
            registry_status="unregistered",
            risk_level="unknown",
            model_allowed=False,
        )

    evidence.append(f"Registry status: {record.status}")
    evidence.append(f"Registry risk_level: {record.risk_level}")
    evidence.append(f"Owner: {record.owner}")

    if record.status == "blocked":
        return RegistryOutput(
            is_valid=False,
            reasoning=f"Agent '{identity.agent_id}' is blocked in registry",
            confidence=1.0,
            evidence=evidence,
            recommendation="BLOCK",
            registry_status=record.status,
            risk_level=record.risk_level,
            model_allowed=False,
            allowed_tools=record.allowed_tools or [],
            blocked_tools=record.blocked_tools or [],
        )

    if record.status == "suspended":
        return RegistryOutput(
            is_valid=False,
            reasoning=f"Agent '{identity.agent_id}' is suspended pending audit",
            confidence=1.0,
            evidence=evidence,
            recommendation="BLOCK",
            registry_status=record.status,
            risk_level=record.risk_level,
            model_allowed=False,
            allowed_tools=record.allowed_tools or [],
            blocked_tools=record.blocked_tools or [],
        )

    if record.owner and identity.owner and record.owner.lower() != identity.owner.lower():
        evidence.append(f"Owner mismatch: registry={record.owner}, request={identity.owner}")
        return RegistryOutput(
            is_valid=False,
            reasoning="Agent owner does not match registry record",
            confidence=1.0,
            evidence=evidence,
            recommendation="BLOCK",
            registry_status=record.status,
            risk_level=record.risk_level,
            model_allowed=False,
        )

    allowed_models = record.allowed_models or []
    model_allowed = True
    if allowed_models and identity.model not in allowed_models:
        model_allowed = False
        evidence.append(f"Model not allowed: requested={identity.model}, allowed={allowed_models}")

    if not model_allowed:
        return RegistryOutput(
            is_valid=False,
            reasoning=f"Model '{identity.model}' is not in allowed_models for this agent",
            confidence=1.0,
            evidence=evidence,
            recommendation="BLOCK",
            registry_status=record.status,
            risk_level=record.risk_level,
            model_allowed=False,
            allowed_tools=record.allowed_tools or [],
            blocked_tools=record.blocked_tools or [],
        )

    # Update last_audit timestamp
    record.last_audit = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()

    return RegistryOutput(
        is_valid=True,
        reasoning="Agent identity verified against governance registry",
        confidence=1.0,
        evidence=evidence + [f"Model '{identity.model}' authorized"],
        recommendation="PROCEED",
        registry_status=record.status,
        risk_level=record.risk_level,
        model_allowed=True,
        allowed_tools=record.allowed_tools or [],
        blocked_tools=record.blocked_tools or [],
        escalation_tools=record.escalation_tools or [],
    )


async def seed_agent_registry(db: AsyncSession) -> bool:
    """Seed production agent registry records if empty."""
    result = await db.execute(select(AgentRegistryDB))
    if result.scalars().first():
        return False

    agents = [
        AgentRegistryDB(
            agent_id="Healthcare Data Request",
            owner="Ann Kowalski",
            status="active",
            risk_level="high",
            allowed_models=["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet"],
            allowed_tools=["read_records", "query_database", "generate_report"],
            blocked_tools=["delete_database", "drop_table"],
            escalation_tools=["read_sensitive_records"],
        ),
        AgentRegistryDB(
            agent_id="Customer PII Analysis",
            owner="AgentOPS",
            status="active",
            risk_level="medium",
            allowed_models=["gpt-4o", "gpt-4o-mini"],
            allowed_tools=["query_database", "generate_report", "internet_access"],
            blocked_tools=["delete_database"],
            escalation_tools=["read_sensitive_records"],
        ),
        AgentRegistryDB(
            agent_id="Financial Audit Review",
            owner="AgentOPS",
            status="active",
            risk_level="low",
            allowed_models=["gpt-4o-mini", "gpt-4o"],
            allowed_tools=["query_database", "generate_report"],
            blocked_tools=["delete_database", "internet_access"],
            escalation_tools=[],
        ),
        AgentRegistryDB(
            agent_id="Suspicious Data Extractor",
            owner="Unknown",
            status="blocked",
            risk_level="critical",
            allowed_models=[],
            allowed_tools=[],
            blocked_tools=["delete_database", "read_sensitive_records", "internet_access"],
            escalation_tools=[],
        ),
    ]
    for agent in agents:
        db.add(agent)
    await db.flush()
    return True
