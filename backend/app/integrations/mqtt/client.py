from collections.abc import Awaitable, Callable

MessageHandler = Callable[[str, bytes], Awaitable[None]]


class MQTTClient:
    """Interface boundary for Adafruit IO publish/subscribe operations."""

    async def connect(self) -> None:
        raise NotImplementedError

    async def publish(self, feed_key: str, payload: str) -> None:
        raise NotImplementedError

    async def subscribe(self, feed_key: str, handler: MessageHandler) -> None:
        raise NotImplementedError
