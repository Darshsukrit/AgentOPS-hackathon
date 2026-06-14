import uuid
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, EscalationOutput
from backend.utils.logger import logger

class EscalationAgent(BaseAgent):
    name = "EscalationAgent"
    
    # Example threshold. Can be moved to config.py later.
    ESCALATION_THRESHOLD = 75

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Escalation Agent execution started")
        
        import time
        start_time = time.time()
        
        if not context.risk:
            logger.warning("No Risk Output found. Skipping escalation logic.")
            return context

        risk_score = context.risk.risk_score
        
        if risk_score > self.ESCALATION_THRESHOLD:
            logger.warning(f"Escalation triggered! Risk score {risk_score} > {self.ESCALATION_THRESHOLD}")
            
            escalation_output = EscalationOutput(
                escalated=True,
                case_id=str(uuid.uuid4()),
                priority="P1" if risk_score > 90 else "P2",
                reasoning=f"Automated escalation due to high risk score: {risk_score}",
                confidence=1.0,
                evidence=[f"Risk score = {risk_score}"],
                recommendation="BLOCK" if risk_score > 90 else "REVIEW"
            )
            context.escalation = escalation_output
            
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", escalation_output.model_dump())
        else:
            context.escalation = EscalationOutput(escalated=False)
            if context.band_room_id:
                await self.log_to_band(context.band_room_id, "execution_result", {"escalated": False})
                
        from backend.models import AgentExecutionMetrics
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name, provider="system", model="rule_engine",
            latency_ms=(time.time() - start_time) * 1000, tokens=0, cost_usd=0, 
            decision="Escalated" if context.escalation.escalated else "Passed", 
            reasoning=context.escalation.reasoning if context.escalation.escalated else "No escalation required", 
            confidence=1.0, success=True, prompt_summary="system check", response_text="rule executed"
        ))

        logger.info("Escalation Agent completed")
        return context
