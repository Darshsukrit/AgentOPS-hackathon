from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db_models import DecisionLineageDB
import json

async def get_workflow_lineage_graph(workflow_id: str, db: AsyncSession):
    """
    Generates a React Flow compatible JSON graph of the decision lineage.
    """
    result = await db.execute(select(DecisionLineageDB).filter_by(workflow_id=workflow_id).order_by(DecisionLineageDB.timestamp))
    lineage_records = result.scalars().all()

    nodes = []
    edges = []
    
    # We will position them horizontally or vertically as a rough default for React Flow
    y_offset = 0
    
    for i, record in enumerate(lineage_records):
        node_id = f"node_{i}"
        
        nodes.append({
            "id": node_id,
            "type": "default",
            "position": {"x": 250, "y": y_offset},
            "data": {
                "label": f"{record.agent_name} ({record.decision})",
                "agent": record.agent_name,
                "timestamp": record.timestamp.isoformat(),
                "latency_ms": record.latency_ms,
                "tokens": record.tokens,
                "cost_usd": record.cost_usd,
                "prompt_summary": record.prompt_summary,
                "response_text": record.response_text,
                "decision": record.decision,
                "reasoning_summary": record.reasoning_summary,
                "confidence": record.confidence
            }
        })
        
        if i > 0:
            edges.append({
                "id": f"edge_{i-1}_{i}",
                "source": f"node_{i-1}",
                "target": node_id,
                "type": "smoothstep",
                "animated": True
            })
            
        y_offset += 150

    return {
        "nodes": nodes,
        "edges": edges
    }
