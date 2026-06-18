from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from backend.database import AsyncSessionLocal
from backend.models import WorkflowContext
from backend.agents.base import BaseAgent
from backend.agents.meta_agent import MetaAgent
from backend.agents.registry_agent import RegistryAgent
from backend.agents.security_agent import SecurityAgent
from backend.agents.compliance_agent import ComplianceAgent
from backend.agents.risk_agent import RiskAgent
from backend.agents.escalation_agent import EscalationAgent
from backend.agents.audit_agent import AuditAgent
from backend.band_client import BandClient
from backend.ai_client import AIClient
from backend.utils.logger import logger
from backend.redis_client import redis_client
from backend.db_models import (
    WorkflowDB, AuditLogDB, RiskLogDB, PerformanceLogDB,
    CostLogDB, DecisionLineageDB,
)
from datetime import datetime, timezone

TIER_PIPELINES = {
    "low": ["MetaAgent", "RegistryAgent", "AuditAgent"],
    "medium": ["MetaAgent", "RegistryAgent", "SecurityAgent", "RiskAgent", "AuditAgent"],
    "high": ["MetaAgent", "RegistryAgent", "SecurityAgent", "ComplianceAgent", "RiskAgent", "EscalationAgent", "AuditAgent"],
}


class Orchestrator:
    def __init__(self, band_client: BandClient, ai_client: AIClient):
        self.band_client = band_client
        self.ai_client = ai_client
        self._agents: Dict[str, BaseAgent] = {
            "MetaAgent": MetaAgent(self.band_client, self.ai_client),
            "RegistryAgent": RegistryAgent(self.band_client, self.ai_client),
            "SecurityAgent": SecurityAgent(self.band_client, self.ai_client),
            "ComplianceAgent": ComplianceAgent(self.band_client, self.ai_client),
            "RiskAgent": RiskAgent(self.band_client, self.ai_client),
            "EscalationAgent": EscalationAgent(self.band_client, self.ai_client),
            "AuditAgent": AuditAgent(self.band_client, self.ai_client),
        }

    def _pipeline_for_tier(self, tier: str) -> List[BaseAgent]:
        names = TIER_PIPELINES.get(tier, TIER_PIPELINES["medium"])
        return [self._agents[name] for name in names]

    async def _audit_log(self, db: AsyncSession, workflow_id: str, event_type: str, details: Dict[str, Any]):
        db.add(AuditLogDB(workflow_id=workflow_id, event_type=event_type, details=details))
        await db.flush()

    async def run_workflow(self, context: WorkflowContext, db: Optional[AsyncSession] = None) -> WorkflowContext:
        """Execute the workflow pipeline.

        If a database session is not provided, a new session is created for the duration of the call.
        """
        if db is None:
            # Create a new session if not supplied (used in unit tests)
            async with AsyncSessionLocal() as db:
                return await self._run_workflow_inner(context, db)
        else:
            return await self._run_workflow_inner(context, db)

    async def _run_workflow_inner(self, context: WorkflowContext, db: AsyncSession) -> WorkflowContext:
        tier = context.tier or "medium"
        pipeline = self._pipeline_for_tier(tier)
        logger.info(f"Workflow {context.workflow_id} received (tier={tier})")
        context.status = "running"

        workflow_db = WorkflowDB(
            id=context.workflow_id,
            agent_id=context.identity.agent_id if context.identity else "unknown",
            owner=context.identity.owner if context.identity else "unknown",
            model=context.identity.model if context.identity else "unknown",
            purpose=context.identity.purpose if context.identity else "unknown",
            status="running",
            tier=tier,
            band_room_id=context.band_room_id,
        )
        db.add(workflow_db)
        await db.flush()

        await self._audit_log(db, context.workflow_id, "workflow_started", {
            "tier": tier, "agent_id": context.identity.agent_id if context.identity else None
        })
        await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": "running", "current_step": "initializing", "tier": tier})

        # Inject DB session for agents that need registry/audit persistence
        context.db = db

        for agent in pipeline:
            await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": "running", "current_step": agent.name, "tier": tier})
            try:
                context = await agent.execute(context)

                await self._audit_log(db, context.workflow_id, f"{agent.name}_complete", {
                    "tier": tier, "success": not bool(context.error),
                    "decision": context.execution_metrics[-1].decision if context.execution_metrics else None,
                })

                if context.error:
                    logger.error(f"Workflow halted due to error in {agent.name}: {context.error}")
                    context.status = "failed"
                    break

                if context.registry and not context.registry.is_valid:
                    logger.warning("Workflow halted: Registry Validation failed.")
                    context.status = "failed"
                    context.error = "Agent validation failed."
                    break

            except Exception as e:
                logger.error(f"Unhandled exception in {agent.name}: {e}")
                context.status = "failed"
                context.error = f"Unhandled exception: {str(e)}"
                await self._audit_log(db, context.workflow_id, f"{agent.name}_error", {"error": str(e)})
                break

        if context.status != "failed":
            context.status = "completed"
            logger.info("Workflow completed successfully")

        await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": context.status, "current_step": "done", "tier": tier})
        await self._finalize_workflow(context, db, workflow_db)
        return context

    async def _finalize_workflow(self, context: WorkflowContext, db: AsyncSession, workflow_db: WorkflowDB):
        logger.info(f"Finalizing workflow {context.workflow_id} in database")
        try:
            workflow_db.status = context.status
            workflow_db.band_room_id = context.band_room_id
            workflow_db.error = context.error
            workflow_db.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            workflow_db.final_decision = (
                context.audit_record.decision if context.audit_record
                else (context.audit.final_outcome if context.audit else None)
            )

            if context.audit:
                await self._audit_log(db, context.workflow_id, "workflow_completed", context.audit.model_dump())

            if context.risk_score or context.risk:
                risk = context.risk_score or context.risk
                db.add(RiskLogDB(
                    workflow_id=context.workflow_id,
                    risk_score=risk.risk_score,
                    severity=risk.severity,
                    findings=risk.findings,
                    recommendation=risk.recommendation,
                    rationale=risk.reasoning if hasattr(risk, "reasoning") else str(risk.findings),
                    score_breakdown=getattr(risk, "score_breakdown", None),
                ))

            for m in context.execution_metrics:
                db.add(PerformanceLogDB(
                    workflow_id=context.workflow_id,
                    agent_name=m.agent_name,
                    provider=m.provider,
                    latency_ms=m.latency_ms,
                    success=m.success,
                    error_message=m.error,
                ))
                db.add(CostLogDB(
                    workflow_id=context.workflow_id,
                    agent_name=m.agent_name,
                    provider=m.provider,
                    model=m.model,
                    estimated_tokens=m.tokens,
                    estimated_cost_usd=m.cost_usd,
                ))
                db.add(DecisionLineageDB(
                    workflow_id=context.workflow_id,
                    agent_name=m.agent_name,
                    decision=m.decision,
                    reasoning_summary=m.reasoning,
                    confidence=m.confidence,
                    latency_ms=m.latency_ms,
                    tokens=m.tokens,
                    cost_usd=m.cost_usd,
                    prompt_summary=m.prompt_summary,
                    response_text=m.response_text,
                    input_data=m.input_data,
                    evidence=m.evidence,
                    output_data=m.output_data,
                ))

            await db.commit()
            logger.info(f"Successfully persisted workflow {context.workflow_id}")
        except Exception as e:
            logger.error(f"Failed to persist workflow {context.workflow_id} to DB: {e}")
            await db.rollback()
