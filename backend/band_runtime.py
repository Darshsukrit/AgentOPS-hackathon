import asyncio
import json
import logging
import random
import time
from typing import Any, Callable, Dict, List, Optional

import httpx
import websockets

from backend.config import settings
from backend.utils.logger import logger

# Helper for exponential backoff with jitter
def _backoff(attempt: int, base: float = 1.0, cap: float = 30.0) -> float:
    """Calculate backoff seconds for a given retry attempt.
    Uses exponential growth capped at `cap` seconds and adds random jitter.
    """
    exp = min(cap, base * (2 ** attempt))
    jitter = random.uniform(0, exp * 0.1)
    return exp + jitter

class BandAgentRuntime:
    """Persistent WebSocket runtime for Band.ai Phoenix channels.

    - Manages a single async websocket connection.
    - Joins required topics (chat_room and agent_contacts).
    - Sends/receives JSON‑encoded Phoenix messages.
    - Automatic reconnection with exponential back‑off.
    - Heartbeat (ping) every 30 seconds to keep the socket alive.
    - Allows registration of per‑event callbacks via `register_handler`.
    """

    def __init__(self) -> None:
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._connected = asyncio.Event()
        self._stop = asyncio.Event()
        self._handlers: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}
        self._listen_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._reconnect_attempt = 0
        self._session = httpx.AsyncClient(
            base_url=settings.BAND_BASE_URL,
            headers={"X-API-Key": settings.BAND_API_KEY, "Content-Type": "application/json"},
            timeout=10.0,
        )
        self._join_refs: Dict[str, int] = {}
        logger.info("BandAgentRuntime initialized")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    async def start(self) -> None:
        """Entry point to start the runtime.
        It spawns the connection manager coroutine and returns immediately.
        """
        logger.info("Starting BandAgentRuntime")
        asyncio.create_task(self._connection_manager())

    async def stop(self) -> None:
        """Gracefully stop the runtime, closing the socket and cancelling background tasks."""
        logger.info("Stopping BandAgentRuntime")
        self._stop.set()
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        if self._listen_task:
            self._listen_task.cancel()
        if self._ws:
            await self._ws.close()
        await self._session.aclose()

    def register_handler(self, event: str, callback: Callable[[Dict[str, Any]], None]) -> None:
        """Register a callback for a specific Phoenix event type (e.g., 'phx_reply', 'phx_error', 'chat_message')."""
        self._handlers.setdefault(event, []).append(callback)
        logger.debug(f"Handler registered for event '{event}'")

    async def send_event(self, topic: str, event: str, payload: Dict[str, Any]) -> None:
        """Send a Phoenix‑style event over the WebSocket.
        The message format is:
            {"topic": topic, "event": event, "payload": payload, "ref": "ref123"}
        """
        await self._connected.wait()
        ref = str(int(time.time() * 1000))
        message = {"topic": topic, "event": event, "payload": payload, "ref": ref}
        try:
            await self._ws.send(json.dumps(message))
            logger.debug(f"Sent event {event} on topic {topic} with ref {ref}")
        except Exception as e:
            logger.error(f"Failed to send event: {e}")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    async def _connection_manager(self) -> None:
        """Maintain the websocket connection; reconnect on failure."""
        ws_url = f"{settings.BAND_BASE_URL.replace('https', 'wss')}/socket/websocket?vsn=2.0.0"
        while not self._stop.is_set():
            try:
                logger.info(f"Connecting to Band WebSocket: {ws_url}")
                async with websockets.connect(ws_url, additional_headers={"X-API-Key": settings.BAND_API_KEY}) as ws:
                    self._ws = ws
                    self._connected.set()
                    self._reconnect_attempt = 0
                    logger.info("Band WebSocket connection established")
                    # Start heartbeat and listener
                    self._heartbeat_task = asyncio.create_task(self._heartbeat())
                    self._listen_task = asyncio.create_task(self._listen())
                    # Wait until either stop or socket error
                    stop_task = asyncio.create_task(self._stop.wait())
                    done, pending = await asyncio.wait(
                        [stop_task, self._listen_task], return_when=asyncio.FIRST_COMPLETED
                    )
                    if not stop_task.done():
                        stop_task.cancel()
                    # If stop was set, break loop
                    if self._stop.is_set():
                        break
            except Exception as exc:
                logger.error(f"WebSocket connection error: {exc}")
                self._connected.clear()
                backoff = _backoff(self._reconnect_attempt)
                logger.info(f"Reconnecting in {backoff:.2f}s (attempt {self._reconnect_attempt + 1})")
                await asyncio.sleep(backoff)
                self._reconnect_attempt += 1
        logger.info("BandAgentRuntime connection manager exiting")

    async def _heartbeat(self) -> None:
        """Send a Phoenix ping every 30 seconds to keep the socket alive."""
        try:
            while not self._stop.is_set():
                await asyncio.sleep(30)
                if self._ws and self._ws.open:
                    ping_msg = {"topic": "phoenix", "event": "heartbeat", "payload": {}, "ref": str(int(time.time() * 1000))}
                    await self._ws.send(json.dumps(ping_msg))
                    logger.debug("Sent Phoenix heartbeat")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")

    async def _listen(self) -> None:
        """Continuously receive messages and dispatch to registered handlers."""
        try:
            async for raw_msg in self._ws:
                try:
                    msg = json.loads(raw_msg)
                    event_type = msg.get("event")
                    logger.debug(f"Received WS message: {msg}")
                    # Dispatch to generic event handlers first
                    if event_type and event_type in self._handlers:
                        for cb in self._handlers[event_type]:
                            try:
                                cb(msg)
                            except Exception as cb_err:
                                logger.error(f"Handler error for event {event_type}: {cb_err}")
                    # Also dispatch based on topic if needed (e.g., chat_message)
                    topic = msg.get("topic")
                    if topic and topic in self._handlers:
                        for cb in self._handlers[topic]:
                            try:
                                cb(msg)
                            except Exception as cb_err:
                                logger.error(f"Handler error for topic {topic}: {cb_err}")
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode WS message: {raw_msg}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Listen loop terminated unexpectedly: {e}")
        finally:
            self._connected.clear()
            logger.info("WebSocket listener stopped")

    async def join_topic(self, topic: str) -> None:
        """Convenience wrapper to send a Phoenix `phx_join` for a given topic.
        Stores the reference number so the client can match replies if needed.
        """
        ref = str(int(time.time() * 1000))
        join_payload = {"status": "joining"}
        await self.send_event(topic, "phx_join", join_payload)
        self._join_refs[topic] = int(ref)
        logger.info(f"Requested join for topic '{topic}' with ref {ref}")

    # ------------------------------------------------------------------
    # Helper for HTTP API interactions (room creation, etc.)
    # ------------------------------------------------------------------
    async def create_chat_room(self, name: str) -> Dict[str, Any]:
        """Thin wrapper around BandClient's REST endpoint, kept here for convenience.
        Returns the JSON payload from the API.
        """
        try:
            resp = await self._session.post("/me/chats", json={"chat": {"title": name}})
            resp.raise_for_status()
            data = resp.json().get("data", {})
            logger.info(f"Created Band chat room '{name}' with id {data.get('id')}")
            return data
        except Exception as e:
            logger.error(f"Failed to create Band chat room: {e}")
            raise

    # ------------------------------------------------------------------
    # Context manager support
    # ------------------------------------------------------------------
    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.stop()
        return False
band_runtime = BandAgentRuntime()
