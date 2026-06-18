from dotenv import load_dotenv
load_dotenv()


from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import uuid
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.schemas import HealthResponse, TestAIRequest, TestAIResponse, TestBandRequest, TestBandResponse, IntegrationStatusResponse
from backend.models import WorkflowContext, AgentIdentity, WorkflowRequest
from backend.ai_client import AIClient
from backend.band_client import BandClient
from backend.orchestrator import Orchestrator
from backend.config import settings
from backend.utils.logger import logger
from backend.database import init_db, get_db, check_db
from backend.redis_client import redis_client
from backend.seed import seed_database, get_integration_status
from backend.db_models import (
    WorkflowDB, AuditLogDB, RiskLogDB, PerformanceLogDB, CostLogDB, DecisionLineageDB
)
from backend.lineage import get_workflow_lineage_graph
from backend.routes import users, agents, audit_logs, risks, security_events
from backend.band_runtime import BandAgentRuntime
from backend.routes.governance_agents import router as governance_router

ai_client = AIClient()
band_client = BandClient()
orchestrator = Orchestrator(band_client, ai_client)
band_runtime = BandAgentRuntime()

def validate_startup_config():
    import os
    logger.info("Running startup configuration validation...")
    demo_mode = settings.DEMO_MODE
    
    # 1. Check missing environment variables
    critical_vars = ["AIML_API_KEY", "FEATHERLESS_API_KEY", "BAND_API_KEY"]
    if not demo_mode:
        critical_vars.append("DATABASE_URL")
        
    missing = [v for v in critical_vars if not getattr(settings, v, None) and not os.getenv(v)]
    if missing:
        logger.warning(f"Configuration warning: Missing critical environment variables: {', '.join(missing)}")
        if not demo_mode:
            logger.error("Database or API configuration is missing in production mode. Startup aborted.")
            raise ValueError(f"Missing environment variables: {missing}")

    # 2. Check Database URL validity
    if not demo_mode:
        db_url = settings.DATABASE_URL or os.getenv("DATABASE_URL", "")
        if not db_url.startswith("postgresql+asyncpg://"):
            logger.error(f"Configuration error: DATABASE_URL must start with 'postgresql+asyncpg://'. Found: {db_url}")
            raise ValueError("Invalid DATABASE_URL format")

    # 3. Band configuration check
    if not settings.BAND_API_KEY or not settings.BAND_BASE_URL:
        logger.warning("Band configuration is incomplete. Some integration features may be degraded.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server starting...")
    validate_startup_config()
    await init_db()
    await redis_client.connect()
    if not redis_client.is_connected():
        logger.warning("Redis is offline or unavailable. Running with in-memory transient state fallback.")
    await seed_database(orchestrator)
    # Start Band runtime
    await band_runtime.start()
    yield
    await ai_client.close()
    await band_client.close()
    await band_runtime.stop()
    logger.info("Server shutting down")

app = FastAPI(title="AgentOS - Enterprise AI Governance Layer", lifespan=lifespan)

# CORS: allow the Vite dev-server (and any localhost origin) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
# agents.router removed: in-memory /agents/ conflicted with DB-backed /agents in main.py
app.include_router(audit_logs.router)
app.include_router(risks.router)
app.include_router(security_events.router)
app.include_router(governance_router)

@app.get("/", tags=["Root"])
async def root():
    return {"message": "AgentOS Backend Running"}

@app.post("/test-ai", response_model=TestAIResponse, tags=["Test endpoints"])
async def test_ai(request: TestAIRequest):
    try:
        result = await ai_client.generate_response(request.prompt)
        # Support both tuple/list and dict returns
        if isinstance(result, (list, tuple)) and len(result) == 2:
            provider, response_text = result
        elif isinstance(result, dict):
            provider = result.get("provider")
            response_text = result.get("response_text")
        else:
            raise ValueError("Unexpected AI client response format")
        return TestAIResponse(
            status="success",
            provider=provider,
            response=response_text
        )
    except Exception as e:
        logger.error(f"Request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    db_ok = await check_db()
    redis_status = "connected" if redis_client.is_connected() else "fallback"
    if settings.DEMO_MODE:
        overall = "healthy"
    else:
        overall = "healthy"
    return HealthResponse(
        status=overall,
        config_loaded=bool(settings.AIML_API_KEY),
        database="connected" if db_ok else "disconnected",
        redis=redis_status,
    )

@app.get("/integration/status", response_model=IntegrationStatusResponse, tags=["Integration"])
async def integration_status():
    return await get_integration_status()

@app.get("/band/status", tags=["Integration"])
async def band_status():
    return await band_client.get_status()

@app.get("/ai/status", tags=["Integration"])
async def ai_status():
    return await ai_client.get_status()

@app.post("/workflow", response_model=WorkflowContext, tags=["Workflow"])
async def trigger_workflow(request: WorkflowRequest, db: AsyncSession = Depends(get_db)):
    workflow_id = str(uuid.uuid4())
    context = WorkflowContext(workflow_id=workflow_id, identity=request.identity, tier=request.tier)
    final_context = await orchestrator.run_workflow(context, db)
    return final_context

@app.post("/workflow/low", response_model=WorkflowContext, tags=["Workflow"])
async def trigger_low_workflow(identity: AgentIdentity, db: AsyncSession = Depends(get_db)):
    return await trigger_workflow(WorkflowRequest(identity=identity, tier="low"), db)

@app.post("/workflow/medium", response_model=WorkflowContext, tags=["Workflow"])
async def trigger_medium_workflow(identity: AgentIdentity, db: AsyncSession = Depends(get_db)):
    return await trigger_workflow(WorkflowRequest(identity=identity, tier="medium"), db)

@app.post("/workflow/high", response_model=WorkflowContext, tags=["Workflow"])
async def trigger_high_workflow(identity: AgentIdentity, db: AsyncSession = Depends(get_db)):
    return await trigger_workflow(WorkflowRequest(identity=identity, tier="high"), db)

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
        "tier": workflow.tier,
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
    result = await db.execute(select(WorkflowDB).order_by(WorkflowDB.created_at.desc()))
    seen = set()
    agents = []
    for workflow in result.scalars().all():
        if workflow.agent_id in seen:
            continue
        seen.add(workflow.agent_id)
        agents.append({
            "agent_id": workflow.agent_id,
            "owner": workflow.owner,
            "model": workflow.model,
            "purpose": workflow.purpose,
            "tier": workflow.tier,
        })
    return agents

# duplicate /test-ai route removed – the canonical one is at line 94

@app.post("/test-band", response_model=TestBandResponse, tags=["Test endpoints"])
async def test_band(request: TestBandRequest):
    try:
        if request.action == "create_room":
            if not request.room_name:
                raise HTTPException(status_code=400, detail="room_name is required")
            data = await band_client.create_room(request.room_name)
        elif request.action == "send_message":
            if not request.room_id or not request.message:
                raise HTTPException(status_code=400, detail="room_id and message are required")
            data = await band_client.send_message(request.room_id, request.message)
        elif request.action == "get_messages":
            if not request.room_id:
                raise HTTPException(status_code=400, detail="room_id is required")
            data = await band_client.get_messages(request.room_id)
        elif request.action == "close_room":
            if not request.room_id:
                raise HTTPException(status_code=400, detail="room_id is required")
            data = await band_client.close_room(request.room_id)
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
        return TestBandResponse(status="success", data=data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Band request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
