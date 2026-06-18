from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class HealthResponse(BaseModel):
    status: str
    config_loaded: bool
    database: str
    redis: str

class IntegrationStatusResponse(BaseModel):
    supabase: str
    redis: str
    tables_created: bool
    seed_data: bool
    workflows: Dict[str, int]
    total_workflows: int
    audit_logs: int
    cost_records: int
    cost_tracking: bool
    audit_logs_working: bool
    integration_complete: bool

class TestAIRequest(BaseModel):
    prompt: str

class TestAIResponse(BaseModel):
    status: str
    provider: str
    response: str
    error: Optional[str] = None

class TestBandRequest(BaseModel):
    action: str  # create_room, send_message, get_messages, close_room
    room_name: Optional[str] = None
    room_id: Optional[str] = None
    message: Optional[str] = None

class TestBandResponse(BaseModel):
    status: str
    data: Optional[Any] = None
    error: Optional[str] = None
