from typing import Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._user_connections: dict[int, set[WebSocket]] = {}
        self._home_connections: dict[int, set[WebSocket]] = {}
        self._metadata: dict[WebSocket, dict[str, Any]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int | None = None,
        home_id: int | None = None,
    ) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        self._metadata[websocket] = {"user_id": user_id, "home_id": home_id}

        if user_id is not None:
            self._user_connections.setdefault(user_id, set()).add(websocket)
        if home_id is not None:
            self._home_connections.setdefault(home_id, set()).add(websocket)

    def set_user(self, websocket: WebSocket, user_id: int) -> None:
        if websocket not in self._metadata:
            return
        old_user_id = self._metadata[websocket].get("user_id")
        if old_user_id is not None and old_user_id in self._user_connections:
            self._user_connections[old_user_id].discard(websocket)
            if not self._user_connections[old_user_id]:
                del self._user_connections[old_user_id]

        self._metadata[websocket]["user_id"] = user_id
        self._user_connections.setdefault(user_id, set()).add(websocket)

    def set_home(self, websocket: WebSocket, home_id: int) -> None:
        if websocket not in self._metadata:
            return
        old_home_id = self._metadata[websocket].get("home_id")
        if old_home_id is not None and old_home_id in self._home_connections:
            self._home_connections[old_home_id].discard(websocket)
            if not self._home_connections[old_home_id]:
                del self._home_connections[old_home_id]

        self._metadata[websocket]["home_id"] = home_id
        self._home_connections.setdefault(home_id, set()).add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        meta = self._metadata.pop(websocket, None)
        if meta:
            user_id = meta.get("user_id")
            home_id = meta.get("home_id")
            if user_id is not None and user_id in self._user_connections:
                self._user_connections[user_id].discard(websocket)
                if not self._user_connections[user_id]:
                    del self._user_connections[user_id]
            if home_id is not None and home_id in self._home_connections:
                self._home_connections[home_id].discard(websocket)
                if not self._home_connections[home_id]:
                    del self._home_connections[home_id]

    async def send_personal_message(self, user_id: int, payload: dict[str, Any]) -> None:
        """Chỉ gửi đúng socket của target_user_id"""
        sockets = list(self._user_connections.get(user_id, set()))
        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except (RuntimeError, OSError):
                stale.append(socket)

        for socket in stale:
            self.disconnect(socket)

    async def broadcast_to_home(self, home_id: int, payload: dict[str, Any]) -> None:
        """Chỉ gửi cho các user đang mở ngôi nhà home_id"""
        sockets = list(self._home_connections.get(home_id, set()))
        stale: list[WebSocket] = []
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except (RuntimeError, OSError):
                stale.append(socket)

        for socket in stale:
            self.disconnect(socket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        """Gửi toàn cục nếu cần"""
        connections = list(self._connections)
        stale: list[WebSocket] = []
        for connection in connections:
            try:
                await connection.send_json(payload)
            except (RuntimeError, OSError):
                stale.append(connection)

        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()
