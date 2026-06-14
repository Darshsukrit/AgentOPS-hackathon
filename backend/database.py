from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os

# We default to an async SQLite DB for local testing, to avoid forcing the user to spin up Docker.
# If they provide a DATABASE_URL, we'll use that instead.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./agentos.db")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def init_db():
    """Initializes the database tables."""
    from backend.db_models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency for getting a DB session."""
    async with AsyncSessionLocal() as session:
        yield session
