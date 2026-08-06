from fastapi import APIRouter, Query, status

from app.api.deps import AdminUser, CurrentUser, DatabaseSession
from app.schemas import DashboardSummary, TelemetryCreate, TelemetryRead
from app.services.statistics_service import StatisticsService

router = APIRouter()


@router.get("", response_model=list[TelemetryRead])
async def telemetry_history(
    _: CurrentUser,
    session: DatabaseSession,
    device_id: int | None = None,
    metric: str | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
) -> list:
    return await StatisticsService(session).history(device_id, metric, limit)


@router.post("", response_model=TelemetryRead, status_code=status.HTTP_201_CREATED)
async def record_telemetry(
    payload: TelemetryCreate, _: AdminUser, session: DatabaseSession
):
    return await StatisticsService(session).record(payload)


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard(_: CurrentUser, session: DatabaseSession) -> DashboardSummary:
    return await StatisticsService(session).dashboard()
