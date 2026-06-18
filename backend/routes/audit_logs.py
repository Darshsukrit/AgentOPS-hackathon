from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.db_models import AuditLogDB

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("/")
async def get_logs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AuditLogDB).order_by(AuditLogDB.timestamp.desc()))
    logs = result.scalars().all()
    return {
        "success": True,
        "data": [
            {
                "id": log.id,
                "workflow_id": log.workflow_id,
                "event_type": log.event_type,
                "details": log.details,
                "timestamp": log.timestamp,
            }
            for log in logs
        ],
    }
