from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
import os
from backend.utils.logger import logger

# Load environment variables from .env if present
from backend.config import settings
load_dotenv()

# In demo mode, always use in-memory SQLite regardless of .env settings.
if settings.DEMO_MODE:
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"
    logger.info("Demo mode: using in-memory SQLite database.")
else:
    # Use provided DATABASE_URL or fallback to SQLite.
    DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite+aiosqlite:///:memory:"
    if not os.getenv("DATABASE_URL"):
        logger.info("Using SQLite in-memory database as fallback.")

# ==========================
# ENGINE
# ==========================
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300
)

# ==========================
# SESSION
# ==========================
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# ==========================
# INIT DB
# ==========================
async def init_db():
    from backend.db_models import Base
    from backend.migrations import run_migrations
    async with engine.begin() as conn:

        await conn.run_sync(Base.metadata.create_all)

        if engine.dialect.name != "sqlite":
            try:
                await conn.execute(text(
                    "ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tier VARCHAR DEFAULT 'medium'"
                ))
            except Exception as e:
                logger.warning(f"Failed to add column 'tier': {e}")
            await run_migrations(conn)


async def check_db() -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

# ==========================
# GET DB SESSION
# ==========================
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session