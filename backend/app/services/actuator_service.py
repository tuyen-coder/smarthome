from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Device


class ActuatorService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def update_state(self, device: Device, payload: str) -> None:
        """Cập nhật trạng thái bật/tắt của thiết bị chấp hành (Đèn, Bơm, Quạt...)."""
        clean_payload = payload.strip().upper()
        is_on = clean_payload in ("1", "ON", "TRUE")

        device.is_on = is_on
        device.is_online = True
        
        # Cập nhật thêm thông tin payload vào JSON state
        device.state = {**device.state, "last_payload": payload}

        await self.session.commit()
        print(f"[DB Updated] Actuator | Device #{device.id} ({device.name}) -> is_on={is_on}")