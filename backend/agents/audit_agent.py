import time
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, AuditOutput, AgentExecutionMetrics
from backend.services.audit_service import build_audit_record, persist_audit_record
from backend.governance.intelligence import map_audit_intelligence, build_governance_report
from backend.utils.logger import logger


SUMMARY_PROMPT = """You are a governance auditor assistant. Given the immutable audit record below,
write a concise executive summary (3-4 sentences). Do NOT change the decision or risk score — they are authoritative.

Audit Record:
{record}
"""


class AuditAgent(BaseAgent):
    name = "AuditAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Audit Agent execution started")
        start_time = time.time()

        # Build immutable audit record from deterministic governance signals
        record = build_audit_record(context)
        context.audit_record = record
        decision = record.decision

        executive_summary = self._build_summary(context, record)
        tokens, cost, provider, model = 0, 0.0, "audit_engine", "deterministic"

        if self.ai_client:
            try:
                import json
                record_json = json.dumps(record.model_dump(), default=str)
                prompt = SUMMARY_PROMPT.replace("{record}", record_json)
                result = await self.ai_client.generate_response(
                    prompt, tier=context.tier, agent_type="explanation"
                )
                llm_summary = result.get("response_text", "")
                if llm_summary:
                    executive_summary = llm_summary[:500]
                tokens = result.get("tokens", 0)
                cost = result.get("cost_usd", 0.0)
                provider = result.get("provider", "aiml")
                model = result.get("model", "explanation")
            except Exception as e:
                logger.warning(f"LLM summary skipped for AuditAgent: {e}")

        # Persist immutable audit record
        if context.db:
            try:
                await persist_audit_record(context.db, record, executive_summary)
            except Exception as e:
                logger.error(f"Failed to persist audit record: {e}")

        score = record.risk_score
        sec_severity = context.security_findings.severity if context.security_findings else "N/A"
        comp_status = context.compliance_findings.status if context.compliance_findings else "N/A"
        pii = context.security_findings.pii_detected if context.security_findings else False
        escalated = context.escalation_state.escalated if context.escalation_state else False
        classification = (
            context.risk_score.classification if context.risk_score
            else (context.risk.severity if context.risk else "N/A")
        )

        visualization = (
            f"Governance Verdict: {decision}\n"
            f"Risk Classification: {classification}\n\n"
            f"Security:      {sec_severity}\n"
            f"Compliance:    {comp_status}\n"
            f"PII:           {'FOUND' if pii else 'CLEAN'}\n"
            f"Escalation:    {'YES' if escalated else 'NO'}\n\n"
            + "\n".join(f"• {line}" for line in record.decision_chain)
        )

        recommendation = self._recommendation_for_decision(decision)
        audit_output = AuditOutput(
            governance_summary=executive_summary,
            decision_chain=record.decision_chain,
            participating_agents=record.participating_agents,
            final_outcome=decision,
            reasoning=" ".join(record.decision_chain),
            confidence=1.0,
            evidence=record.decision_chain,
            recommendation=recommendation,
            risk_visualization=visualization,
            audit_record_id=record.record_id,
        )
        audit_output.governance_intelligence = map_audit_intelligence(
            context,
            record_decision=decision,
            decision_chain=record.decision_chain,
            executive_summary=executive_summary,
            recommendation=recommendation,
        )
        context.audit = audit_output
        context.governance_report = build_governance_report(context)

        latency = (time.time() - start_time) * 1000
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name,
            provider=provider,
            model=model,
            latency_ms=latency,
            tokens=tokens,
            cost_usd=cost,
            decision=decision,
            reasoning=audit_output.reasoning,
            confidence=1.0,
            success=True,
            input_data={"risk_score": score, "escalation_status": record.escalation_status},
            evidence=record.decision_chain,
            output_data={
                "audit_record_id": record.record_id,
                "decision": decision,
                "governance_intelligence": audit_output.governance_intelligence.model_dump(),
            },
        ))

        if context.band_room_id:
            await self.invoke_band_agent("audit", context, record.model_dump())

        logger.info("Audit Agent completed")
        return context

    def _build_summary(self, context: WorkflowContext, record) -> str:
        parts = [f"Governance workflow {context.workflow_id} completed with decision: {record.decision}."]
        if context.security_findings and context.security_findings.pii_detected:
            parts.append("PII was detected in the request context.")
        if context.compliance_findings and context.compliance_findings.status == "FAIL":
            parts.append(f"Compliance failures: {len(context.compliance_findings.violations)} violation(s).")
        classification = (
            context.risk_score.classification if context.risk_score
            else (context.risk.severity if context.risk else "N/A")
        )
        parts.append(f"Risk classification: {classification}.")
        return " ".join(parts)

    def _recommendation_for_decision(self, decision: str) -> str:
        mapping = {
            "APPROVED": "Deploy with standard monitoring",
            "REVIEW_REQUIRED": "Hold pending human governance review",
            "DENIED": "Remediate compliance violations before retry",
            "BLOCKED": "Do not deploy — block agent execution",
        }
        return mapping.get(decision, "Review governance findings")
