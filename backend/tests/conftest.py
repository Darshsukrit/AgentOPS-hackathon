import os
os.environ["DEMO_MODE"] = "True"

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database import init_db

@pytest.fixture(autouse=True, scope="session")
async def setup_test_db():
    await init_db()

@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

