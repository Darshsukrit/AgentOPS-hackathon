import json
import time
from typing import Any, Dict, Optional, Tuple

from backend.agents.base import BaseAgent
from backend.models import (
    WorkflowContext, RiskOutput, RiskScoreResult, AgentExecutionMetrics,
)
from backend.risk.scorer import score_from_context
from backend.governance.intelligence import map_risk_intelligence
from backend.utils.logger import logger


EXPLANATION_PROMPT = """You are a risk analyst assistant. Given a deterministic risk score breakdown below,
write a concise 2-3 sentence explanation of the risk posture. Do NOT change the score or severity — they are authoritative.

Risk Assessment:
{assessment}
"""


class RiskAgent(BaseAgent):
    """Deterministic risk scoring; LLM is optional explanation text only."""

    name = "RiskAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Risk Agent execution started")
        start_time = time.time()

        scored = score_from_context(
            registry=context.registry,
            security_findings=context.security_findings,
            compliance_findings=context.compliance_findings,
            tool_governance=context.tool_governance,
        )

        structured = RiskScoreResult(
            risk_score=scored["risk_score"],
            severity=scored["severity"],
            score_breakdown=scored["score_breakdown"],
            findings=scored["findings"],
            recommendation=scored["recommendation"],
            likelihood=scored.get("likelihood"),
            impact_level=scored.get("impact_level"),
            affected_systems=scored.get("affected_systems", []),
            potential_outcome=scored.get("potential_outcome"),
            classification=scored.get("classification"),
        )
        context.risk_score = structured

        reasoning = self._build_reasoning(structured)
        tokens, cost, provider, model = 0, 0.0, "risk_engine", "deterministic"

        llm_meta = await self._optional_llm_explanation(scored, context)
        if llm_meta:
            llm_text, tokens, cost, provider, model = llm_meta
            if llm_text:
                reasoning = f"{reasoning} | Analysis: {llm_text[:300]}"

        risk_output = RiskOutput(
            risk_score=structured.risk_score,
            severity=structured.severity,
            findings=structured.findings,
            reasoning=reasoning,
            confidence=1.0,
            evidence=[f"{k}: +{v}" for k, v in structured.score_breakdown.items()] or structured.findings,
            recommendation=structured.recommendation,
            score_breakdown=structured.score_breakdown,
        )
        risk_output.governance_intelligence = map_risk_intelligence(
            structured,
            risk_output,
            security_findings=context.security_findings,
            tool_governance=context.tool_governance,
        )
        context.risk = risk_output

        latency = (time.time() - start_time) * 1000
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name,
            provider=provider,
            model=model,
            latency_ms=latency,
            tokens=tokens,
            cost_usd=cost,
            decision=structured.recommendation,
            reasoning=reasoning,
            confidence=1.0,
            success=True,
            input_data={
                "security_severity": context.security_findings.severity if context.security_findings else None,
                "compliance_status": context.compliance_findings.status if context.compliance_findings else None,
            },
            evidence=risk_output.evidence,
            output_data={
                **structured.model_dump(),
                "governance_intelligence": risk_output.governance_intelligence.model_dump(),
            },
        ))

        if context.band_room_id:
            try:
                await self.invoke_band_agent("risk", context, structured.model_dump())
            except Exception as e:
                logger.warning(f"Band notification skipped for RiskAgent: {e}")

        logger.info("Risk Agent completed")
        return context

    async def _optional_llm_explanation(
        self,
        scored: Dict[str, Any],
        context: WorkflowContext,
    ) -> Optional[Tuple[str, int, float, str, str]]:
        """Fetch optional LLM explanation text. Never parses JSON; never raises."""
        if not self.ai_client:
            return None
        try:
            assessment = json.dumps(scored, default=str)
            prompt = EXPLANATION_PROMPT.replace("{assessment}", assessment)
            result = await self.ai_client.generate_response(
                prompt, tier=context.tier, agent_type="explanation"
            )
            llm_text = (result.get("response_text") or "").strip()
            if llm_text.startswith("{") or llm_text.startswith("["):
                logger.warning(
                    "RiskAgent received JSON-shaped LLM text; using as plain explanation (not parsed)."
                )
            return (
                llm_text,
                int(result.get("tokens", 0) or 0),
                float(result.get("cost_usd", 0.0) or 0.0),
                result.get("provider", "aiml"),
                result.get("model", "explanation"),
            )
        except Exception as e:
            logger.warning(f"LLM explanation skipped for RiskAgent: {e}")
            return None

    def _build_reasoning(self, score: RiskScoreResult) -> str:
        if not score.score_breakdown:
            return f"Deterministic risk score: {score.risk_score}/100 ({score.severity}). No risk signals detected."
        factors = ", ".join(f"{k}(+{v})" for k, v in score.score_breakdown.items())
        return f"Deterministic risk score: {score.risk_score}/100 ({score.severity}). Factors: {factors}."
