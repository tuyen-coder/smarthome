from collections.abc import Awaitable, Callable

MessageHandler = Callable[[str, bytes], Awaitable[None]]


class MQTTClient:
    """Small async MQTT boundary used by services and replaceable in production."""

    def __init__(self) -> None:
        self.connected = False
        self.last_messages: dict[str, str] = {}
        self._handlers: dict[str, list[MessageHandler]] = {}

    async def connect(self) -> None:
        self.connected = True

    async def publish(self, feed_key: str, payload: str) -> None:
        if not self.connected:
            await self.connect()
        self.last_messages[feed_key] = payload
        for handler in self._handlers.get(feed_key, []):
            await handler(feed_key, payload.encode())

    async def subscribe(self, feed_key: str, handler: MessageHandler) -> None:
        self._handlers.setdefault(feed_key, []).append(handler)


mqtt_client = MQTTClient()
