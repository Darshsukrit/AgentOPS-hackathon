import json
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, RiskOutput
from backend.prompts import RISK_PROMPT
from backend.utils.logger import logger

class RiskAgent(BaseAgent):
    name = "RiskAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Risk Agent execution started")
        
        if not self.ai_client:
            raise ValueError("AIClient not provided")

        prompt = f"{RISK_PROMPT}\n\nContext to evaluate:\n"
        if context.identity:
            prompt += f"Agent Identity: {context.identity.model_dump_json()}\n"
        if context.registry:
            prompt += f"Registry Validation: {context.registry.model_dump_json()}\n"
        if context.security:
            prompt += f"Security Output: {context.security.model_dump_json()}\n"
        if context.compliance:
            prompt += f"Compliance Output: {context.compliance.model_dump_json()}\n"

        try:
            result = await self.ai_client.generate_response(prompt)
            provider = result["provider"]
            response_text = result["response_text"]
            
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
                
            parsed_data = json.loads(clean_text)
            risk_output = RiskOutput.model_validate(parsed_data)
            context.risk = risk_output
            
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name,
                provider=provider,
                model=result["model"],
                latency_ms=result["latency_ms"],
                tokens=result["tokens"],
                cost_usd=result["cost_usd"],
                decision=risk_output.recommendation,
                reasoning=risk_output.reasoning,
                confidence=risk_output.confidence,
                success=True,
                prompt_summary=prompt[:200] + "...",
                response_text=response_text
            ))
            
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", parsed_data)

        except Exception as e:
            logger.error(f"RiskAgent execution failed: {e}")
            context.error = f"RiskAgent failed: {e}"
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="unknown", model="unknown",
                latency_ms=0, tokens=0, cost_usd=0, decision="Error", reasoning=str(e), confidence=0.0, success=False, error=str(e)
            ))

        logger.info("Risk Agent completed")
        return context
