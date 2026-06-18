from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from backend.db_models import DecisionLineageDB, AuditRecordDB
import json

PIPELINE_ORDER = [
    "MetaAgent",
    "RegistryAgent",
    "SecurityAgent",
    "ComplianceAgent",
    "RiskAgent",
    "EscalationAgent",
    "AuditAgent",
]


async def get_workflow_lineage_graph(workflow_id: str, db: AsyncSession):
    """
    Generates a React Flow compatible JSON graph with evidence propagation
    across the full governance pipeline.
    """
    result = await db.execute(
        select(DecisionLineageDB)
        .filter_by(workflow_id=workflow_id)
        .order_by(DecisionLineageDB.timestamp)
    )
    lineage_records = list(result.scalars().all())

    # Fetch immutable audit record if available
    audit_result = await db.execute(
        select(AuditRecordDB).filter_by(workflow_id=workflow_id).order_by(AuditRecordDB.timestamp.desc())
    )
    audit_record = audit_result.scalars().first()

    nodes = []
    edges = []

    # Request node
    nodes.append({
        "id": "node_request",
        "type": "default",
        "position": {"x": 250, "y": 0},
        "data": {
            "label": "Request",
            "agent": "Request",
            "stage": "input",
            "decision": "INITIATED",
            "confidence": 1.0,
            "evidence": ["Agent identity submitted for governance review"],
        },
    })

    y_offset = 120
    prev_id = "node_request"

    # Sort records by pipeline order
    record_map = {r.agent_name: r for r in lineage_records}
    ordered_records = [record_map[name] for name in PIPELINE_ORDER if name in record_map]
    # Include any agents not in standard order
    for r in lineage_records:
        if r not in ordered_records:
            ordered_records.append(r)

    for i, record in enumerate(ordered_records):
        node_id = f"node_{i}"
        evidence = record.evidence or []
        if isinstance(evidence, str):
            evidence = [evidence]

        input_data = record.input_data or {}
        output_data = record.output_data or {}

        nodes.append({
            "id": node_id,
            "type": "default",
            "position": {"x": 250, "y": y_offset},
            "data": {
                "label": f"{record.agent_name} ({record.decision})",
                "agent": record.agent_name,
                "stage": record.agent_name.replace("Agent", "").lower(),
                "timestamp": record.timestamp.isoformat(),
                "latency_ms": record.latency_ms,
                "tokens": record.tokens,
                "cost_usd": record.cost_usd,
                "prompt_summary": record.prompt_summary,
                "response_text": record.response_text,
                "decision": record.decision,
                "reasoning_summary": record.reasoning_summary,
                "confidence": record.confidence,
                "input": input_data,
                "evidence": evidence,
                "output": output_data,
            },
        })

        edges.append({
            "id": f"edge_{prev_id}_{node_id}",
            "source": prev_id,
            "target": node_id,
            "type": "smoothstep",
            "animated": True,
            "label": record.decision,
        })

        prev_id = node_id
        y_offset += 150

    # Audit record node (immutable decision)
    if audit_record:
        audit_node_id = "node_audit_record"
        nodes.append({
            "id": audit_node_id,
            "type": "default",
            "position": {"x": 250, "y": y_offset},
            "data": {
                "label": f"Audit Record ({audit_record.decision})",
                "agent": "AuditRecord",
                "stage": "audit_record",
                "decision": audit_record.decision,
                "confidence": 1.0,
                "risk_score": audit_record.risk_score,
                "escalation_status": audit_record.escalation_status,
                "evidence": audit_record.decision_chain or [],
                "output": {
                    "security_findings": audit_record.security_findings,
                    "compliance_findings": audit_record.compliance_findings,
                    "executive_summary": audit_record.executive_summary,
                },
                "immutable": True,
            },
        })
        edges.append({
            "id": f"edge_{prev_id}_{audit_node_id}",
            "source": prev_id,
            "target": audit_node_id,
            "type": "smoothstep",
            "animated": True,
            "label": audit_record.decision,
            "style": {"stroke": "#a855f7"},
        })

    return {"nodes": nodes, "edges": edges, "audit_record_id": audit_record.id if audit_record else None}
