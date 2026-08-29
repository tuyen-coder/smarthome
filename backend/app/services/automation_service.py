from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models import Automation, User
from app.repositories.automations import AutomationRepository
from app.schemas import AutomationCreate, DeviceCommand
from app.services.device_service import DeviceService


class AutomationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.automations = AutomationRepository(session)

    async def list(self, home_id: int) -> list[Automation]:
        return await self.automations.list(home_id=home_id)

    async def get(self, automation_id: int) -> Automation:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy kịch bản")
        return automation

    async def create(self, payload: AutomationCreate) -> Automation:
        return await self.automations.create(**payload.model_dump())

    async def update(self, automation_id: int, payload: AutomationCreate) -> Automation:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy kịch bản")
        
        # update via repository, assuming update(**kwargs) exists or manual update
        return await self.automations.update(automation, **payload.model_dump())

    async def toggle(self, automation_id: int, enabled: bool) -> Automation:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy tự động hóa")
        return await self.automations.set_enabled(automation, enabled)

    async def delete(self, automation_id: int) -> None:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy tự động hóa")
        await self.automations.delete(automation)

    async def execute_scene(self, automation_id: int, user: User) -> None:
        automation = await self.automations.get(automation_id)
        if automation is None:
            raise EntityNotFoundError("Không tìm thấy kịch bản")
            
        if automation.trigger.get("type") != "scene":
            raise ValueError("Chỉ có thể kích hoạt thủ công kịch bản loại Ngữ cảnh (Scene)")
            
        devices = automation.action.get("devices", [])
        if not devices:
            return
            
        device_service = DeviceService(self.session)
        for device_action in devices:
            try:
                device_id = device_action.get("id")
                is_on = device_action.get("is_on")
                if device_id is not None and is_on is not None:
                    payload = DeviceCommand(is_on=is_on)
                    await device_service.command(user, device_id, payload)
            except Exception as e:
                print(f"Error executing scene device {device_action.get('id')}: {e}")

    async def evaluate_time_automations(self, current_time: str) -> None:
        """Kiểm tra và thực thi các kịch bản hẹn giờ."""
        enabled_automations = await self.automations.list_all_enabled()
        
        for auto in enabled_automations:
            trigger = auto.trigger
            if trigger.get("type") == "time":
                # Chuyển đổi định dạng giờ nếu cần
                target_time = trigger.get("value")
                if target_time == current_time:
                    print(f"[Automation] Hẹn giờ kích hoạt: {auto.name}")
                    # Thực thi với user=None
                    await self._execute_internal(auto)

    async def evaluate_sensor_automations(self, home_id: int, metric: str, current_value: float) -> None:
        """Kiểm tra và thực thi các kịch bản cảm biến trong cùng 1 nhà."""
        from app.core.redis import redis_client
        enabled_automations = await self.automations.list_all_enabled()
        
        for auto in enabled_automations:
            if auto.home_id != home_id:
                continue
                
            trigger = auto.trigger
            if trigger.get("type") == "sensor" and trigger.get("metric") == metric:
                operator = trigger.get("operator")
                target_value = trigger.get("value")
                
                if operator is None or target_value is None:
                    continue
                    
                target_value = float(target_value)
                condition_met = False
                if operator == '>':
                    condition_met = current_value > target_value
                elif operator == '<':
                    condition_met = current_value < target_value
                elif operator == '=':
                    condition_met = current_value == target_value
                    
                # Sử dụng Redis để tránh spam lệnh liên tục (chỉ gửi khi trạng thái thay đổi từ False -> True)
                redis_key = f"automation:sensor_state:{auto.id}"
                last_state = await redis_client.get(redis_key)
                
                if condition_met and last_state != b"1":
                    print(f"[Automation] Cảm biến đạt ngưỡng, kích hoạt: {auto.name}")
                    await self._execute_internal(auto)
                    await redis_client.set(redis_key, "1")
                elif not condition_met and last_state == b"1":
                    await redis_client.set(redis_key, "0")

    async def _execute_internal(self, automation: Automation) -> None:
        """Hàm thực thi nội bộ không yêu cầu User (cho tiến trình ngầm)."""
        devices = automation.action.get("devices", [])
        if not devices:
            return
            
        device_service = DeviceService(self.session)
        for device_action in devices:
            try:
                device_id = device_action.get("id")
                is_on = device_action.get("is_on")
                if device_id is not None and is_on is not None:
                    payload = DeviceCommand(is_on=is_on)
                    await device_service.command(None, device_id, payload)
            except Exception as e:
                print(f"Error executing internal automation device {device_action.get('id')}: {e}")
