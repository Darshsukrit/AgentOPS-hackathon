import uuid
import time
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, EscalationOutput, EscalationState, AgentExecutionMetrics
from backend.governance.settings import ESCALATION_THRESHOLD, BLOCK_THRESHOLD
from backend.governance.intelligence import map_escalation_intelligence
from backend.utils.logger import logger


class EscalationAgent(BaseAgent):
    name = "EscalationAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Escalation Agent execution started")
        start_time = time.time()

        score = 0
        if context.risk_score:
            score = context.risk_score.risk_score
        elif context.risk:
            score = context.risk.risk_score

        blocked = score >= BLOCK_THRESHOLD
        escalated = score >= ESCALATION_THRESHOLD

        if blocked:
            state = EscalationState(
                escalated=True,
                blocked=True,
                case_id=str(uuid.uuid4()),
                priority="P1",
                recommended_action="BLOCK",
                reasoning=f"Automated block: risk score {score} >= {BLOCK_THRESHOLD}",
                evidence=[f"Risk score = {score}", f"Block threshold = {BLOCK_THRESHOLD}"],
            )
            logger.warning(f"Block triggered! Risk score {score} >= {BLOCK_THRESHOLD}")
        elif escalated:
            state = EscalationState(
                escalated=True,
                blocked=False,
                case_id=str(uuid.uuid4()),
                priority="P2",
                recommended_action="REVIEW",
                reasoning=f"Automated escalation: risk score {score} >= {ESCALATION_THRESHOLD}",
                evidence=[f"Risk score = {score}", f"Escalation threshold = {ESCALATION_THRESHOLD}"],
            )
            logger.warning(f"Escalation triggered! Risk score {score} >= {ESCALATION_THRESHOLD}")
        else:
            state = EscalationState(
                escalated=False,
                blocked=False,
                recommended_action="PROCEED",
                reasoning=f"Risk score {score} below escalation threshold ({ESCALATION_THRESHOLD})",
                evidence=[f"Risk score = {score}"],
            )

        context.escalation_state = state
        context.escalation = EscalationOutput(
            escalated=state.escalated,
            blocked=state.blocked,
            case_id=state.case_id,
            priority=state.priority,
            reasoning=state.reasoning,
            confidence=1.0,
            evidence=state.evidence,
            recommendation=state.recommended_action,
            recommended_action=state.recommended_action,
        )
        context.escalation.governance_intelligence = map_escalation_intelligence(
            state, context.escalation
        )

        latency = (time.time() - start_time) * 1000
        decision = "Blocked" if blocked else ("Escalated" if escalated else "Passed")
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name,
            provider="system",
            model="rule_engine",
            latency_ms=latency,
            tokens=0,
            cost_usd=0,
            decision=decision,
            reasoning=state.reasoning or "",
            confidence=1.0,
            success=True,
            input_data={"risk_score": score, "escalation_threshold": ESCALATION_THRESHOLD, "block_threshold": BLOCK_THRESHOLD},
            evidence=state.evidence,
            output_data={
                **state.model_dump(),
                "governance_intelligence": context.escalation.governance_intelligence.model_dump(),
            },
        ))

        if context.band_room_id:
            await self.log_to_band(context.band_room_id, "execution_result", state.model_dump())

        logger.info("Escalation Agent completed")
        return context
