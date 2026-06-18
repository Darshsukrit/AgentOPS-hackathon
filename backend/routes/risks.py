from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.db_models import RiskLogDB

router = APIRouter(prefix="/risks", tags=["Risks"])


@router.get("/")
async def get_risks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RiskLogDB).order_by(RiskLogDB.timestamp.desc()))
    risks = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": r.id,
                "workflow_id": r.workflow_id,
                "risk_score": r.risk_score,
                "severity": r.severity,
                "findings": r.findings,
                "recommendation": r.recommendation,
                "rationale": r.rationale,
                "timestamp": r.timestamp,
            }
            for r in risks
        ],
    }
