from fastapi import APIRouter

router = APIRouter(prefix="/agents", tags=["Agents"])

agents = []
@router.post("/")
def create_agent(name: str, model: str):
    agent = {
        "id": len(agents) + 1,
        "name": name,
        "model": model
    }
    agents.append(agent)
    return {"success": True, "data": agent}
@router.get("/")
def get_agents():
    return {"success": True, "data": agents}