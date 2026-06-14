from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class HealthResponse(BaseModel):
    status: str
    config_loaded: bool

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
