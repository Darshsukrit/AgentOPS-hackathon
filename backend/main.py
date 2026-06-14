from fastapi import FastAPI, HTTPException, Depends
from contextlib import asynccontextmanager
import httpx
import uuid
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.schemas import HealthResponse, TestAIRequest, TestAIResponse, TestBandRequest, TestBandResponse
from backend.models import WorkflowContext, AgentIdentity
from backend.ai_client import AIClient
from backend.band_client import BandClient
from backend.orchestrator import Orchestrator
from backend.config import settings
from backend.utils.logger import logger
from backend.database import init_db, get_db
from backend.redis_client import redis_client
from backend.db_models import (
    WorkflowDB, AuditLogDB, RiskLogDB, PerformanceLogDB, CostLogDB, DecisionLineageDB
)
from backend.lineage import get_workflow_lineage_graph

ai_client = AIClient()
band_client = BandClient()
orchestrator = Orchestrator(band_client, ai_client)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server started")
    await init_db()
    await redis_client.connect()
    yield
    await ai_client.close()
    await band_client.close()
    logger.info("Server shutting down")

app = FastAPI(title="AgentOS - Enterprise AI Governance Layer", lifespan=lifespan)

@app.get("/", tags=["Root"])
async def root():
    return {"message": "AgentOS Backend Running - Checkpoint 3 (Native Band)"}

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="healthy",
        config_loaded=bool(settings.AIML_API_KEY)
    )

@app.post("/workflow", response_model=WorkflowContext, tags=["Workflow"])
async def trigger_workflow(identity: AgentIdentity, db: AsyncSession = Depends(get_db)):
    workflow_id = str(uuid.uuid4())
    context = WorkflowContext(workflow_id=workflow_id, identity=identity)
    
    # Run the workflow
    final_context = await orchestrator.run_workflow(context, db)
    return final_context

@app.get("/workflow/{id}", tags=["Workflow"])
async def get_workflow(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowDB).filter_by(id=id))
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    state = await redis_client.get_state(f"workflow:{id}")
    return {
        "id": workflow.id,
        "agent_id": workflow.agent_id,
        "status": workflow.status,
        "created_at": workflow.created_at,
        "band_room_id": workflow.band_room_id,
        "error": workflow.error,
        "final_decision": workflow.final_decision,
        "transient_state": state
    }

@app.get("/workflow/{id}/audit", tags=["Workflow"])
async def get_workflow_audit(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLogDB).filter_by(workflow_id=id).order_by(AuditLogDB.timestamp))
    return result.scalars().all()

@app.get("/workflow/{id}/lineage", tags=["Workflow"])
async def get_workflow_lineage(id: str, db: AsyncSession = Depends(get_db)):
    return await get_workflow_lineage_graph(id, db)

@app.get("/workflow/{id}/cost", tags=["Workflow"])
async def get_workflow_cost(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CostLogDB).filter_by(workflow_id=id).order_by(CostLogDB.timestamp))
    return result.scalars().all()

@app.get("/workflow/{id}/performance", tags=["Workflow"])
async def get_workflow_performance(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PerformanceLogDB).filter_by(workflow_id=id).order_by(PerformanceLogDB.timestamp))
    return result.scalars().all()

@app.get("/workflow/{id}/risk", tags=["Workflow"])
async def get_workflow_risk(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskLogDB).filter_by(workflow_id=id).order_by(RiskLogDB.timestamp))
    return result.scalars().all()

@app.get("/workflows", tags=["Workflow"])
async def get_workflows(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkflowDB).order_by(WorkflowDB.created_at.desc()))
    return result.scalars().all()

@app.get("/agents", tags=["Agents"])
async def get_agents(db: AsyncSession = Depends(get_db)):
    # Group by agent_id to get unique agents
    # In SQLite, simple distinct on a column isn't natively supported exactly like Postgres DISTINCT ON,
    # so we fetch all and distinct in memory, or we can use group_by
    result = await db.execute(select(WorkflowDB.agent_id, WorkflowDB.owner, WorkflowDB.model, WorkflowDB.purpose).group_by(WorkflowDB.agent_id))
    agents = []
    for row in result:
        agents.append({
            "agent_id": row[0],
            "owner": row[1],
            "model": row[2],
            "purpose": row[3]
        })
    return agents

@app.post("/test-ai", response_model=TestAIResponse, tags=["Test endpoints"])
async def test_ai(request: TestAIRequest):
    try:
        result = await ai_client.generate_response(request.prompt)
        return TestAIResponse(
            status="success",
            provider=result["provider"],
            response=result["response_text"]
        )
    except Exception as e:
        logger.error(f"Request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
