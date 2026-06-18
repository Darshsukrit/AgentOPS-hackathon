from fastapi import APIRouter

router = APIRouter(prefix="/security-events", tags=["Security Events"])

events = []
@router.post("/")
def create_event(event_type: str):
    event = {
        "id": len(events) + 1,
        "event_type": event_type
    }
    events.append(event)
    return {"success": True, "data": event}
@router.get("/")
def get_events():
    return {"success": True, "data": events}