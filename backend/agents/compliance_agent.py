import time
from backend.agents.base import BaseAgent
from backend.models import (
    WorkflowContext, ComplianceOutput, ComplianceFindings, ComplianceViolationItem, AgentExecutionMetrics,
)
from backend.policies.engine import run_policy_engine
from backend.governance.intelligence import map_compliance_intelligence
from backend.utils.logger import logger


EXPLANATION_PROMPT = """You are a compliance analyst assistant. Given deterministic policy evaluation results below,
write a concise 2-3 sentence summary. Do NOT change compliance status or violations — the policy engine is authoritative.

Policy Results:
{results}
"""


class ComplianceAgent(BaseAgent):
    name = "ComplianceAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Compliance Agent execution started")
        start_time = time.time()

        if not context.identity:
            context.error = "ComplianceAgent requires agent identity"
            return context

        text = f"{context.identity.purpose} {context.identity.agent_id} {context.identity.owner}"
        security_findings = context.security_findings
        pii_detected = security_findings.pii_detected if security_findings else False
        secrets_detected = security_findings.secrets_detected if security_findings else False
        raw_findings = security_findings.findings if security_findings else []

        policy_result = run_policy_engine(
            text=text,
            security_findings=raw_findings,
            pii_detected=pii_detected,
            secrets_detected=secrets_detected,
        )

        structured = ComplianceFindings(
            status=policy_result["status"],
            violations=[
                ComplianceViolationItem(**v) for v in policy_result["violations"]
            ],
            frameworks_checked=policy_result["frameworks_checked"],
            policy_refs=policy_result["policy_refs"],
            evidence=policy_result["evidence"],
            recommendation=policy_result["recommendation"],
        )
        context.compliance_findings = structured

        violations_text = [f"[{v.policy}] {v.violation}" for v in structured.violations]
        reasoning = self._build_reasoning(structured)
        tokens, cost, provider, model = 0, 0.0, "policy_engine", "deterministic"

        if self.ai_client and structured.violations:
            try:
                import json
                results_json = json.dumps(policy_result, default=str)
                prompt = EXPLANATION_PROMPT.replace("{results}", results_json)
                result = await self.ai_client.generate_response(
                    prompt, tier=context.tier, agent_type="explanation"
                )
                llm_text = result.get("response_text", "")
                if llm_text:
                    reasoning = f"{reasoning} | Summary: {llm_text[:300]}"
                tokens = result.get("tokens", 0)
                cost = result.get("cost_usd", 0.0)
                provider = result.get("provider", "aiml")
                model = result.get("model", "explanation")
            except Exception as e:
                logger.warning(f"LLM explanation skipped for ComplianceAgent: {e}")

        compliance_output = ComplianceOutput(
            status=structured.status,
            violations=violations_text,
            frameworks_checked=structured.frameworks_checked,
            reasoning=reasoning,
            confidence=1.0,
            evidence=structured.evidence,
            recommendation=structured.recommendation,
            policy_refs=structured.policy_refs,
            structured_violations=structured.violations,
        )
        compliance_output.governance_intelligence = map_compliance_intelligence(structured, compliance_output)
        context.compliance = compliance_output

        latency = (time.time() - start_time) * 1000
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name,
            provider=provider,
            model=model,
            latency_ms=latency,
            tokens=tokens,
            cost_usd=cost,
            decision=structured.status,
            reasoning=reasoning,
            confidence=1.0,
            success=True,
            input_data={"frameworks": structured.frameworks_checked},
            evidence=structured.evidence,
            output_data={
                **structured.model_dump(),
                "governance_intelligence": compliance_output.governance_intelligence.model_dump(),
            },
        ))

        if context.band_room_id:
            await self.invoke_band_agent("compliance", context, structured.model_dump())

        logger.info("Compliance Agent completed")
        return context

    def _build_reasoning(self, findings: ComplianceFindings) -> str:
        if findings.status == "PASS":
            return f"All frameworks passed: {', '.join(findings.frameworks_checked)}"
        count = len(findings.violations)
        policies = {v.policy for v in findings.violations}
        return f"Compliance {findings.status}: {count} violation(s) across {', '.join(sorted(policies))}"
