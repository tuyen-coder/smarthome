import asyncio
import logging
from typing import Any
from Adafruit_IO import MQTTClient

from app.core.config import settings
from app.db.session import SessionLocal
from app.models import DeviceType, Area
from app.realtime.manager import manager as ws_manager
from app.repositories.devices import DeviceRepository
from app.schemas import AdafruitFeed
from app.services.actuator_service import ActuatorService
from app.services.sensor_service import SensorService

logger = logging.getLogger(__name__)

class AdafruitMQTTService:

    def __init__(self, websocket_manager: Any, db_session_factory: Any):
        if not settings.mqtt_key:
            raise ValueError("mqtt_key chưa được cấu hình trong .env!")

        self.client = MQTTClient(settings.mqtt_username, settings.mqtt_key)
        self.ws_manager = websocket_manager
        self.db_session_factory = db_session_factory
        self.loop: asyncio.AbstractEventLoop | None = None

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client):
        logger.info("[MQTT] Đã kết nối thành công đến Adafruit IO!")
        for feed in AdafruitFeed:
            self.client.subscribe(feed.value)

    def _on_disconnect(self, client):
        logger.info("[MQTT] Đã ngắt kết nối khỏi Adafruit IO!")

    def _on_message(self, client, feed_id: str, payload: str):
        # logger.debug(f"[MQTT Received] Feed: {feed_id} | Data: {payload}")
        if self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self._process_and_broadcast(feed_id, payload), self.loop
            )

    # --- BỔ SUNG METHOD PUBLISH TẠI ĐÂY ---
    def publish(self, feed_key: str, payload: Any) -> None:
        """Gửi dữ liệu/lệnh điều khiển lên Adafruit IO feed."""
        try:
            # Chuyển payload về chuỗi (String) trước khi gửi qua MQTT
            str_payload = str(payload)
            self.client.publish(feed_key, str_payload)
            # logger.debug(f"[MQTT Sent] Feed: '{feed_key}' | Payload: '{str_payload}'")
        except Exception as e:
            logger.error(f"[MQTT Publish Error] Feed '{feed_key}': {e}")

    async def _process_and_broadcast(self, feed_id: str, payload: str):
        try:
            async with self.db_session_factory() as session:
                # 1. Tìm Device theo feed_key
                device_repo = DeviceRepository(session)
                device = await device_repo.get_by_feed_key(feed_id)

                if not device:
                    logger.warning(f"[MQTT Warning] Không tìm thấy Device gắn với feed_key: '{feed_id}'")
                    return

                if device.type in (DeviceType.CLIMATE, DeviceType.OTHER):
                    sensor_service = SensorService(session)
                    await sensor_service.record_telemetry(device, payload)
                    
                    # Gọi evaluate_sensor_automations
                    try:
                        from app.services.automation_service import AutomationService
                        auto_service = AutomationService(session)
                        
                        # Chỉ hỗ trợ nhiệt độ/độ ẩm tùy theo thiết bị
                        # Hiện tại giả định CLIMATE báo nhiệt độ hoặc độ ẩm.
                        # Ta có thể truyền cứng metric hoặc dựa vào tên feed
                        metric = 'temperature' if 'temp' in feed_id.lower() else 'humidity'
                        val = float(payload)
                        
                        area = await session.get(Area, device.area_id)
                        if area:
                            await auto_service.evaluate_sensor_automations(area.home_id, metric, val)
                    except Exception as e_auto:
                        logger.error(f"[MQTT Auto Error] {e_auto}")
                        
                else:
                    actuator_service = ActuatorService(session)
                    await actuator_service.update_state(device, payload)

            # 3. Phát WebSocket thông báo cho Frontend
            await self.ws_manager.broadcast({
                "type": "DEVICE_UPDATE",
                "device_id": device.id,
                "feed_key": feed_id,
                "value": payload,
            })
        except Exception as e:
            logger.error(f"[MQTT Error] Lỗi xử lý feed '{feed_id}': {e}")

    def start(self):
        self.loop = asyncio.get_running_loop()
        self.client.connect()
        self.client.loop_background()

    def stop(self):
        self.client.disconnect()


mqtt_client = AdafruitMQTTService(
    websocket_manager=ws_manager, db_session_factory=SessionLocal
)