"""Schema migrations for production-hardening upgrade."""

from sqlalchemy import text
from backend.utils.logger import logger

MIGRATIONS = [
    "ALTER TABLE decision_lineage ADD COLUMN IF NOT EXISTS input_data JSON",
    "ALTER TABLE decision_lineage ADD COLUMN IF NOT EXISTS evidence JSON",
    "ALTER TABLE decision_lineage ADD COLUMN IF NOT EXISTS output_data JSON",
    "ALTER TABLE risk_logs ADD COLUMN IF NOT EXISTS score_breakdown JSON",
]


async def run_migrations(conn) -> None:
    """Apply additive schema migrations (PostgreSQL)."""
    dialect = conn.dialect.name
    if dialect == "sqlite":
        return
    for stmt in MIGRATIONS:
        try:
            await conn.execute(text(stmt))
            logger.info(f"Migration applied: {stmt[:60]}...")
        except Exception as e:
            logger.warning(f"Migration skipped or failed: {e}")
