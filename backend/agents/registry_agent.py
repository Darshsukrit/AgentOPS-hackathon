from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, RegistryOutput
from backend.utils.logger import logger

class RegistryAgent(BaseAgent):
    name = "RegistryAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Registry Agent execution started")
        
        if not context.identity:
            logger.error("No Agent Identity found in context.")
            context.registry = RegistryOutput(is_valid=False, reasoning="Missing Agent Identity", confidence=1.0, evidence=["context.identity is None"], recommendation="Provide Agent Identity")
            
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="system", model="rule_engine",
                latency_ms=0, tokens=0, cost_usd=0, decision="Failed", reasoning="Missing Agent Identity", confidence=1.0, success=False,
                prompt_summary="system check", response_text="rule executed"
            ))
            
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", {"is_valid": False, "reasoning": "Missing Agent Identity"})
            return context

        # Mock validation logic
        import time
        start_time = time.time()
        is_valid = True
        reasoning = "Identity verified successfully"

        if context.identity.agent_id == "malicious_agent":
            is_valid = False
            reasoning = "Agent ID is on blocklist"

        context.registry = RegistryOutput(is_valid=is_valid, reasoning=reasoning, confidence=1.0, evidence=[f"Agent ID: {context.identity.agent_id}"], recommendation="PROCEED" if is_valid else "BLOCK")
        
        from backend.models import AgentExecutionMetrics
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name, provider="system", model="rule_engine",
            latency_ms=(time.time() - start_time) * 1000, tokens=0, cost_usd=0, 
            decision="Valid" if is_valid else "Invalid", reasoning=reasoning, confidence=1.0, success=True,
            prompt_summary="system check", response_text="rule executed"
        ))
        
        if context.band_room_id:
            await self.log_to_band(context.band_room_id, "execution_result", {"is_valid": is_valid, "reasoning": reasoning})

        logger.info("Registry Agent completed")
        return context
