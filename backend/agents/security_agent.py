import time
from backend.agents.base import BaseAgent
from backend.models import (
    WorkflowContext, SecurityOutput, SecurityFindings, SecurityFindingItem, AgentExecutionMetrics,
)
from backend.security.detectors import scan_agent_identity
from backend.governance.intelligence import map_security_intelligence
from backend.utils.logger import logger


EXPLANATION_PROMPT = """You are a security analyst assistant. Given deterministic scan findings below,
write a concise 2-3 sentence explanation of the security posture. Do NOT change, add, or remove any findings.
Do NOT decide whether PII exists — the scan results are authoritative.

Findings JSON:
{findings}
"""


class SecurityAgent(BaseAgent):
    name = "SecurityAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Security Agent execution started")
        start_time = time.time()

        if not context.identity:
            context.error = "SecurityAgent requires agent identity"
            return context

        identity = context.identity
        scan = scan_agent_identity(
            agent_id=identity.agent_id,
            owner=identity.owner,
            model=identity.model,
            purpose=identity.purpose,
        )

        structured = SecurityFindings(
            findings=[
                SecurityFindingItem(
                    category=f.category,
                    type=f.type,
                    severity=f.severity,
                    evidence=f.evidence,
                    masked_value=f.masked_value,
                )
                for f in scan.findings
            ],
            pii_detected=scan.pii_detected,
            secrets_detected=scan.secrets_detected,
            severity=scan.severity,
            scanned_fields=scan.scanned_fields,
        )
        context.security_findings = structured

        findings_text = [
            f"{f.type} ({f.category}, {f.severity}): {f.masked_value}"
            for f in structured.findings
        ] or ["No PII or secrets detected"]

        recommendation = "Pass"
        if scan.secrets_detected:
            recommendation = "Block — exposed credentials"
        elif scan.pii_detected and scan.severity in ("HIGH", "CRITICAL"):
            recommendation = "Review — sensitive PII detected"
        elif scan.pii_detected:
            recommendation = "Flag — PII present"

        reasoning = self._build_reasoning(structured)
        llm_reasoning = None
        tokens, cost, provider, model = 0, 0.0, "deterministic", "security_scanner"

        if self.ai_client and structured.findings:
            try:
                import json
                findings_json = json.dumps([f.model_dump() for f in structured.findings], default=str)
                prompt = EXPLANATION_PROMPT.replace("{findings}", findings_json)
                result = await self.ai_client.generate_response(
                    prompt, tier=context.tier, agent_type="explanation"
                )
                llm_reasoning = result.get("response_text", "")
                tokens = result.get("tokens", 0)
                cost = result.get("cost_usd", 0.0)
                provider = result.get("provider", "aiml")
                model = result.get("model", "explanation")
            except Exception as e:
                logger.warning(f"LLM explanation skipped for SecurityAgent: {e}")

        if llm_reasoning:
            reasoning = f"{reasoning} | Analysis: {llm_reasoning[:300]}"

        security_output = SecurityOutput(
            pii_detected=scan.pii_detected,
            secrets_detected=scan.secrets_detected,
            severity=scan.severity,
            findings=findings_text,
            reasoning=reasoning,
            confidence=1.0,
            evidence=[f.evidence for f in structured.findings] or ["Clean scan — no patterns matched"],
            recommendation=recommendation,
            structured_findings=structured.findings,
        )
        security_output.governance_intelligence = map_security_intelligence(structured, security_output)
        context.security = security_output

        latency = (time.time() - start_time) * 1000
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name,
            provider=provider,
            model=model,
            latency_ms=latency,
            tokens=tokens,
            cost_usd=cost,
            decision="Passed" if not scan.secrets_detected else "Failed",
            reasoning=reasoning,
            confidence=1.0,
            success=True,
            input_data={"purpose": identity.purpose[:200]},
            evidence=security_output.evidence,
            output_data={
                **structured.model_dump(),
                "governance_intelligence": security_output.governance_intelligence.model_dump(),
            },
        ))

        if context.band_room_id:
            await self.invoke_band_agent("security", context, structured.model_dump())

        logger.info("Security Agent completed")
        return context

    def _build_reasoning(self, findings: SecurityFindings) -> str:
        if not findings.findings:
            return "Deterministic scan found no PII or secret patterns."
        parts = []
        if findings.pii_detected:
            pii_types = {f.type for f in findings.findings if f.category == "PII"}
            parts.append(f"PII detected: {', '.join(sorted(pii_types))}")
        if findings.secrets_detected:
            secret_types = {f.type for f in findings.findings if f.category == "SECRET"}
            parts.append(f"Secrets detected: {', '.join(sorted(secret_types))}")
        parts.append(f"Overall severity: {findings.severity}")
        return ". ".join(parts) + "."
