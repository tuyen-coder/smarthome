import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.realtime.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def realtime_updates(websocket: WebSocket) -> None:
    # 1. Trích xuất thông tin ban đầu từ query params (nếu có)
    params = websocket.query_params
    token = params.get("token")
    home_id_param = params.get("home_id")
    user_id_param = params.get("user_id")

    user_id: int | None = None
    home_id: int | None = int(home_id_param) if home_id_param and home_id_param.isdigit() else None

    if token:
        try:
            payload = decode_access_token(token)
            sub = payload.get("sub")
            if sub and str(sub).isdigit():
                user_id = int(sub)
        except Exception:
            pass

    if user_id is None and user_id_param and user_id_param.isdigit():
        user_id = int(user_id_param)

    await manager.connect(websocket, user_id=user_id, home_id=home_id)

    try:
        while True:
            text = await websocket.receive_text()
            if not text:
                continue

            try:
                msg = json.loads(text)
                if isinstance(msg, dict):
                    msg_type = msg.get("type")
                    if msg_type == "authenticate":
                        msg_token = msg.get("token")
                        if msg_token:
                            try:
                                payload = decode_access_token(msg_token)
                                sub = payload.get("sub")
                                if sub and str(sub).isdigit():
                                    manager.set_user(websocket, int(sub))
                            except Exception:
                                pass
                        if "home_id" in msg and str(msg["home_id"]).isdigit():
                            manager.set_home(websocket, int(msg["home_id"]))

                    elif msg_type == "switch_home":
                        new_home_id = msg.get("home_id")
                        if new_home_id is not None and str(new_home_id).isdigit():
                            manager.set_home(websocket, int(new_home_id))
            except json.JSONDecodeError:
                # Bỏ qua tin nhắn không phải JSON
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
