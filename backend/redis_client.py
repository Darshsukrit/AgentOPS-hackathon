import redis.asyncio as redis
import os
import json
from typing import Optional, Any
from backend.utils.logger import logger

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self._fallback_dict = {}

    async def connect(self):
        try:
            self.client = redis.from_url(REDIS_URL, decode_responses=True)
            await self.client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}. Using in-memory fallback for transient state.")
            self.client = None

    async def set_state(self, key: str, value: Any, expire_seconds: int = 3600):
        val_str = json.dumps(value)
        if self.client:
            try:
                await self.client.set(key, val_str, ex=expire_seconds)
            except Exception as e:
                logger.error(f"Redis set error: {e}")
                self._fallback_dict[key] = val_str
        else:
            self._fallback_dict[key] = val_str

    async def get_state(self, key: str) -> Optional[Any]:
        val_str = None
        if self.client:
            try:
                val_str = await self.client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
                val_str = self._fallback_dict.get(key)
        else:
            val_str = self._fallback_dict.get(key)

        if val_str:
            return json.loads(val_str)
        return None

    async def delete_state(self, key: str):
        if self.client:
            try:
                await self.client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
                self._fallback_dict.pop(key, None)
        else:
            self._fallback_dict.pop(key, None)

redis_client = RedisClient()
