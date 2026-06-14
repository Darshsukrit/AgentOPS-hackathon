import uuid
from backend.agents.base import BaseAgent
from backend.models import WorkflowContext, AgentIdentity
from backend.utils.logger import logger

class MetaAgent(BaseAgent):
    name = "MetaAgent"

    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        logger.info("Meta Agent execution started")
        
        # 1. Create Band room
        room_name = f"Workflow-{context.workflow_id}"
        import time
        start_time = time.time()
        
        try:
            room_data = await self.band_client.create_chat(room_name)
            context.band_room_id = room_data.get("id", str(uuid.uuid4()))
            logger.info(f"Band room created: {context.band_room_id}")
        except Exception as e:
            logger.warning(f"Band room creation failed: {e}. Proceeding without Band room.")
            context.band_room_id = None

        # 2. Log initialization
        if context.band_room_id:
            await self.log_to_band(context.band_room_id, "workflow_initialized", {"workflow_id": context.workflow_id})
            if context.identity:
                await self.log_to_band(context.band_room_id, "agent_injected", {"agent_id": context.identity.agent_id})

        from backend.models import AgentExecutionMetrics
        context.execution_metrics.append(AgentExecutionMetrics(
            agent_name=self.name, provider="system", model="band_api",
            latency_ms=(time.time() - start_time) * 1000, tokens=0, cost_usd=0, 
            decision="Initialized", reasoning="Workflow context and chat created", confidence=1.0, success=True
        ))

        logger.info("Meta Agent completed")
        return context
