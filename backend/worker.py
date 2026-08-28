import asyncio
import json
import logging

from app.core.redis import get_redis
from app.db.session import SessionLocal
from app.models import AlertSeverity, DeviceCategory
from app.schemas import AlertCreate
from app.services.alert_service import AlertService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

async def process_device_activity(payload_str: str):
    try:
        data = json.loads(payload_str)
        device_id = data.get("device_id")
        name = data.get("name")
        category = data.get("category")
        is_on = data.get("is_on")
        user_id = data.get("user_id")
        user_name = data.get("user_name")
        
        # Chỉ xử lý nếu category khác SENSOR
        if category and category.lower() != DeviceCategory.SENSOR.value:
            state_text = "bật" if is_on else "tắt"
            logger.info(f"Processing non-sensor device activity: {name} was {state_text}")
            
            # Khởi tạo DB session để lưu Alert
            async with SessionLocal() as session:
                try:
                    alert_service = AlertService(session)
                    alert_payload = AlertCreate(
                        device_id=device_id,
                        user_id=user_id,
                        user_name=user_name,
                        title=f"Thiết bị thay đổi trạng thái",
                        message=f"Thiết bị '{name}' đã được {state_text}.",
                        severity=AlertSeverity.INFO,
                    )
                    alert = await alert_service.create(alert_payload)
                    
                    # Publish thông báo đến channel broadcast
                    redis = await get_redis()
                    await redis.publish(
                        "channel:websocket_broadcast", 
                        json.dumps({"type": "new_alert", "alert_id": alert.id})
                    )
                except Exception as e:
                    logger.error(f"Error creating alert: {e}")
                    raise
    except Exception as e:
        logger.error(f"Failed to process activity: {e}")

async def main():
    redis = await get_redis()
    logger.info("Worker started, waiting for device_activity events...")
    
    while True:
        try:
            # Sử dụng timeout > 0 để tránh lỗi ngắt kết nối đột ngột của Redis client
            result = await redis.brpop("queue:device_activity", timeout=2)
            if result:
                _, payload = result
                await process_device_activity(payload)
        except Exception as e:
            logger.error(f"Worker loop error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
