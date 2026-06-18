from fastapi import FastAPI, HTTPException
from backend.routes import users
from backend.schemas import TestAIRequest, TestAIResponse
import logging

# Placeholder for AI client. In your application this should be replaced
# by the real client instance (for example: from backend.ai import ai_client)
ai_client = None
logger = logging.getLogger(__name__)

app = FastAPI()

app.include_router(users.router)

@app.get("/")
def home():
    return {"message": "OPS Backend Running"}

@app.post("/test-ai", response_model=TestAIResponse, tags=["Test endpoints"])
async def test_ai(request: TestAIRequest):
    try:
        if ai_client is None:
            raise RuntimeError("ai_client is not configured")
        result = await ai_client.generate_response(request.prompt)
        return TestAIResponse(
            status="success",
            provider=result["provider"],
            response=result["response_text"]
        )
    except Exception as e:
        logger.error(f"Request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
