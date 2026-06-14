import json
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, AuditOutput
from backend.prompts import AUDIT_PROMPT
from backend.utils.logger import logger

class AuditAgent(BaseAgent):
    name = "AuditAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Audit Agent execution started")
        
        if not self.ai_client:
            raise ValueError("AIClient not provided")

        prompt = f"{AUDIT_PROMPT}\n\nFull Workflow Context:\n"
        prompt += context.model_dump_json(exclude={"audit", "band_room_id", "status"})

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
            audit_output = AuditOutput.model_validate(parsed_data)
            context.audit = audit_output
            
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name,
                provider=provider,
                model=result["model"],
                latency_ms=result["latency_ms"],
                tokens=result["tokens"],
                cost_usd=result["cost_usd"],
                decision=audit_output.final_outcome,
                reasoning=audit_output.reasoning,
                confidence=audit_output.confidence,
                success=True,
                prompt_summary=prompt[:200] + "...",
                response_text=response_text
            ))
            
            # Generate ASCII Risk Visualization
            score = context.risk.risk_score if context.risk else 0
            blocks = int(score / 10)
            bar = "█" * blocks + "░" * (10 - blocks)
            
            visualization = f"{bar} {score}/100\n\n"
            visualization += f"Security:      {context.security.severity if context.security else 'UNKNOWN'}\n"
            visualization += f"Compliance:    {context.compliance.status if context.compliance else 'UNKNOWN'}\n"
            visualization += f"PII:           {'FOUND' if context.security and context.security.pii_detected else 'CLEAN'}\n"
            visualization += f"Escalation:    {'YES' if context.escalation and context.escalation.escalated else 'NO'}\n\n"
            visualization += f"Final:\n{audit_output.final_outcome}"
            
            audit_output.risk_visualization = visualization
            
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", parsed_data)
                await self.log_to_band(context.band_room_id, "visualization", {"text": visualization})

        except Exception as e:
            logger.error(f"AuditAgent execution failed: {e}")
            context.error = f"AuditAgent failed: {e}"
            from backend.models import AgentExecutionMetrics
            context.execution_metrics.append(AgentExecutionMetrics(
                agent_name=self.name, provider="unknown", model="unknown",
                latency_ms=0, tokens=0, cost_usd=0, decision="Error", reasoning=str(e), confidence=0.0, success=False, error=str(e)
            ))

        logger.info("Audit Agent completed")
        return context
