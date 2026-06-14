import json
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, SecurityOutput
from backend.prompts import SECURITY_PROMPT
from backend.utils.logger import logger

class SecurityAgent(BaseAgent):
    name = "SecurityAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Security Agent execution started")
        
        if not self.ai_client:
            logger.error("Security Agent requires an AI client.")
            raise ValueError("AIClient not provided")

        prompt = f"{SECURITY_PROMPT}\n\n"
        prompt += f"Context to evaluate:\n"
        if context.identity:
            prompt += f"Agent Identity: {context.identity.model_dump_json()}\n"

        try:
            result = await self.ai_client.generate_response(prompt)
            provider = result["provider"]
            response_text = result["response_text"]
            
            # Clean up response if AI included markdown blocks
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
                
            parsed_data = json.loads(clean_text)
            security_output = SecurityOutput.model_validate(parsed_data)
            context.security = security_output
            
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name,
                provider=provider,
                model=result["model"],
                latency_ms=result["latency_ms"],
                tokens=result["tokens"],
                cost_usd=result["cost_usd"],
                decision="Passed" if not security_output.pii_detected else "Failed",
                reasoning=security_output.recommendation,
                confidence=security_output.confidence,
                success=True,
                prompt_summary=prompt[:200] + "...",
                response_text=response_text
            ))
            
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", parsed_data)

        except Exception as e:
            logger.error(f"SecurityAgent execution failed: {e}")
            context.error = f"SecurityAgent failed: {e}"
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="unknown", model="unknown",
                latency_ms=0, tokens=0, cost_usd=0, decision="Error", reasoning=str(e), confidence=0.0, success=False, error=str(e)
            ))

        logger.info("Security Agent completed")
        return context
