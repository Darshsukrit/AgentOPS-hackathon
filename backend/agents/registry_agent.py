from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, RegistryOutput, AgentExecutionMetrics
from backend.services.registry_service import validate_agent
from backend.governance.tool_governance import evaluate_tool_governance
from backend.governance.intelligence import map_registry_intelligence
from backend.models import ToolGovernanceResult
from backend.database import AsyncSessionLocal
from backend.utils.logger import logger
import time


class RegistryAgent(BaseAgent):
    name = "RegistryAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Registry Agent execution started")
        start_time = time.time()

        if not context.identity:
            logger.error("No Agent Identity found in context.")
            context.registry = RegistryOutput(
                is_valid=False,
                reasoning="Missing Agent Identity",
                confidence=1.0,
                evidence=["context.identity is None"],
                recommendation="BLOCK",
            )
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="system", model="rule_engine",
                latency_ms=0, tokens=0, cost_usd=0, decision="Failed",
                reasoning="Missing Agent Identity", confidence=1.0, success=False,
                input_data={"error": "missing_identity"},
            ))
            return context

        db = context.db
        owns_session = False
        if db is None:
            owns_session = True

        try:
            if owns_session:
                async with AsyncSessionLocal() as session:
                    context.db = session
                    registry_output = await validate_agent(session, context.identity)
                    await session.commit()
            else:
                registry_output = await validate_agent(db, context.identity)

            context.registry = registry_output

            # Tool governance pre-execution check
            if registry_output.is_valid:
                tool_result = evaluate_tool_governance(
                    purpose=context.identity.purpose,
                    allowed_tools=registry_output.allowed_tools,
                    blocked_tools=registry_output.blocked_tools,
                    escalation_tools=registry_output.escalation_tools,
                )
                context.tool_governance = ToolGovernanceResult(
                    action=tool_result.action,
                    matched_tools=tool_result.matched_tools,
                    blocked_tools=tool_result.blocked_tools,
                    escalation_tools=tool_result.escalation_tools,
                    review_tools=tool_result.review_tools,
                    evidence=tool_result.evidence,
                    recommendation=tool_result.recommendation,
                )
                if tool_result.action == "BLOCK":
                    context.registry = RegistryOutput(
                        is_valid=False,
                        reasoning=f"Tool governance blocked execution: {tool_result.recommendation}",
                        confidence=1.0,
                        evidence=registry_output.evidence + tool_result.evidence,
                        recommendation="BLOCK",
                        registry_status=registry_output.registry_status,
                        risk_level=registry_output.risk_level,
                    )

            latency = (time.time() - start_time) * 1000
            is_valid = context.registry.is_valid
            context.registry.governance_intelligence = map_registry_intelligence(
                context.registry, context.tool_governance
            )
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name,
                provider="registry_db",
                model="rule_engine",
                latency_ms=latency,
                tokens=0,
                cost_usd=0,
                decision="Valid" if is_valid else "Invalid",
                reasoning=context.registry.reasoning,
                confidence=1.0,
                success=True,
                input_data={
                    "agent_id": context.identity.agent_id,
                    "owner": context.identity.owner,
                    "model": context.identity.model,
                },
                evidence=context.registry.evidence,
                output_data={
                    "is_valid": is_valid,
                    "registry_status": context.registry.registry_status,
                    "risk_level": context.registry.risk_level,
                    "tool_governance": context.tool_governance.model_dump() if context.tool_governance else None,
                    "governance_intelligence": context.registry.governance_intelligence.model_dump(),
                },
            ))

            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", {
                    "is_valid": is_valid,
                    "reasoning": context.registry.reasoning,
                    "registry_status": context.registry.registry_status,
                })

        except Exception as e:
            logger.error(f"RegistryAgent execution failed: {e}")
            context.error = f"RegistryAgent failed: {e}"
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="registry_db", model="rule_engine",
                latency_ms=0, tokens=0, cost_usd=0, decision="Error",
                reasoning=str(e), confidence=0.0, success=False, error=str(e),
            ))

        logger.info("Registry Agent completed")
        return context
