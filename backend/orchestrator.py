from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
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
    CostLogDB, DecisionLineageDB
)
from datetime import datetime

class Orchestrator:
    def __init__(self, band_client: BandClient, ai_client: AIClient):
        self.band_client = band_client
        self.ai_client = ai_client
        
        self.pipeline: List[BaseAgent] = [
            MetaAgent(self.band_client, self.ai_client),
            RegistryAgent(self.band_client, self.ai_client),
            SecurityAgent(self.band_client, self.ai_client),
            ComplianceAgent(self.band_client, self.ai_client),
            RiskAgent(self.band_client, self.ai_client),
            EscalationAgent(self.band_client, self.ai_client),
            AuditAgent(self.band_client, self.ai_client),
        ]

    async def run_workflow(self, context: WorkflowContext, db: AsyncSession) -> WorkflowContext:
        logger.info(f"Workflow {context.workflow_id} received")
        context.status = "running"
        
        # Initial Redis state
        await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": "running", "current_step": "initializing"})
        
        for agent in self.pipeline:
            await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": "running", "current_step": agent.name})
            try:
                context = await agent.execute(context)
                
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
                break

        if context.status != "failed":
            context.status = "completed"
            logger.info("Workflow completed successfully")

        await redis_client.set_state(f"workflow:{context.workflow_id}", {"status": context.status, "current_step": "done"})

        # Persistence to PostgreSQL
        await self._persist_workflow(context, db)
        
        return context

    async def _persist_workflow(self, context: WorkflowContext, db: AsyncSession):
        logger.info(f"Persisting workflow {context.workflow_id} to database")
        try:
            workflow_db = WorkflowDB(
                id=context.workflow_id,
                agent_id=context.identity.agent_id if context.identity else "unknown",
                owner=context.identity.owner if context.identity else "unknown",
                model=context.identity.model if context.identity else "unknown",
                purpose=context.identity.purpose if context.identity else "unknown",
                status=context.status,
                band_room_id=context.band_room_id,
                error=context.error,
                completed_at=datetime.utcnow() if context.status in ["completed", "failed"] else None,
                final_decision=context.audit.final_outcome if context.audit else None
            )
            db.add(workflow_db)
            
            # Audit Logs
            if context.audit:
                db.add(AuditLogDB(
                    workflow_id=context.workflow_id,
                    event_type="workflow_completed",
                    details=context.audit.model_dump()
                ))
            
            # Risk Logs
            if context.risk:
                db.add(RiskLogDB(
                    workflow_id=context.workflow_id,
                    risk_score=context.risk.risk_score,
                    severity=context.risk.severity,
                    findings=context.risk.findings,
                    recommendation=context.risk.recommendation,
                    rationale=context.risk.rationale
                ))
            
            # Metrics (Cost, Perf, Lineage)
            for m in context.execution_metrics:
                db.add(PerformanceLogDB(
                    workflow_id=context.workflow_id,
                    agent_name=m.agent_name,
                    provider=m.provider,
                    latency_ms=m.latency_ms,
                    success=m.success,
                    error_message=m.error
                ))
                if m.tokens > 0 or m.cost_usd > 0:
                    db.add(CostLogDB(
                        workflow_id=context.workflow_id,
                        agent_name=m.agent_name,
                        provider=m.provider,
                        model=m.model,
                        estimated_tokens=m.tokens,
                        estimated_cost_usd=m.cost_usd
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
                    response_text=m.response_text
                ))
            
            await db.commit()
            logger.info(f"Successfully persisted workflow {context.workflow_id}")
        except Exception as e:
            logger.error(f"Failed to persist workflow {context.workflow_id} to DB: {e}")
            await db.rollback()
