import uuid
from sqlalchemy import select, func
from backend.database import AsyncSessionLocal
from backend.models import AgentIdentity, WorkflowContext
from backend.db_models import WorkflowDB, AuditLogDB, CostLogDB, AgentRegistryDB
from backend.services.registry_service import seed_agent_registry
from backend.utils.logger import logger


SEED_AGENTS = {
    "low": AgentIdentity(agent_id="Financial Audit Review", owner="AgentOPS", model="gpt-4o-mini", purpose="Low tier financial data lookup"),
    "medium": AgentIdentity(agent_id="Customer PII Analysis", owner="AgentOPS", model="gpt-4o", purpose="Medium tier customer analytics"),
    "high": AgentIdentity(
        agent_id="Healthcare Data Request",
        owner="Ann Kowalski",
        model="gpt-4o",
        purpose="Healthcare Data Governance Review - Patient record transfer",
    ),
}


async def seed_database(orchestrator) -> bool:
    seeded = False
    async with AsyncSessionLocal() as db:
        # Seed agent registry first
        registry_seeded = await seed_agent_registry(db)
        if registry_seeded:
            await db.commit()
            logger.info("Agent registry seeded")
            seeded = True

        for tier, identity in SEED_AGENTS.items():
            result = await db.execute(
                select(func.count()).select_from(WorkflowDB).where(WorkflowDB.tier == tier)
            )
            if (result.scalar() or 0) > 0:
                continue

            logger.info(f"Seeding {tier} tier workflow...")
            context = WorkflowContext(
                workflow_id=str(uuid.uuid4()),
                tier=tier,
                identity=identity,
            )
            await orchestrator.run_workflow(context, db)
            seeded = True

    if seeded:
        logger.info("Seed data created successfully")
    else:
        logger.info("Seed skipped — data already exists")
    return seeded


async def get_integration_status() -> dict:
    from backend.database import check_db
    from backend.redis_client import redis_client

    db_ok = await check_db()
    redis_ok = redis_client.client is not None

    async with AsyncSessionLocal() as db:
        wf_count = (await db.execute(select(func.count()).select_from(WorkflowDB))).scalar() or 0
        audit_count = (await db.execute(select(func.count()).select_from(AuditLogDB))).scalar() or 0
        cost_count = (await db.execute(select(func.count()).select_from(CostLogDB))).scalar() or 0
        registry_count = (await db.execute(select(func.count()).select_from(AgentRegistryDB))).scalar() or 0

        tier_counts = {}
        all_tiers_seeded = True
        for tier in ("low", "medium", "high"):
            r = await db.execute(select(func.count()).select_from(WorkflowDB).where(WorkflowDB.tier == tier))
            tier_counts[tier] = r.scalar() or 0
            if tier_counts[tier] == 0:
                all_tiers_seeded = False

    return {
        "supabase": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_ok else "fallback",
        "tables_created": db_ok,
        "seed_data": all_tiers_seeded,
        "agent_registry": registry_count,
        "workflows": tier_counts,
        "total_workflows": wf_count,
        "audit_logs": audit_count,
        "cost_records": cost_count,
        "cost_tracking": cost_count > 0,
        "audit_logs_working": audit_count > 0,
        "integration_complete": db_ok and redis_ok and all_tiers_seeded and audit_count > 0 and registry_count > 0,
    }
