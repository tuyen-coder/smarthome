import { env } from '@/src/config/env';
import type {
  Alert,
  Area,
  AreaPermission,
  Automation,
  DashboardSummary,
  Device,
  TokenResponse,
  User,
} from '@/src/types/domain';

let accessToken = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(env.API_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? 'Không thể kết nối đến máy chủ');
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  setAccessToken(token: string) {
    accessToken = token;
  },

  async login(email: string, password: string) {
    const result = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    accessToken = result.access_token;
    return result;
  },

  me: () => request<User>('/auth/me'),
  dashboard: () => request<DashboardSummary>('/telemetry/dashboard'),
  areas: () => request<Area[]>('/areas'),
  devices: (areaId?: number) =>
    request<Device[]>('/devices' + (areaId ? '?area_id=' + areaId : '')),
  commandDevice: (
    deviceId: number,
    payload: { is_on?: boolean; state?: Record<string, unknown> },
  ) =>
    request<Device>('/devices/' + deviceId + '/command', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  alerts: () => request<Alert[]>('/alerts'),
  updateAlert: (alertId: number, action: 'read' | 'acknowledge' | 'resolve') =>
    request<Alert>('/alerts/' + alertId + '/' + action, { method: 'PATCH' }),
  automations: () => request<Automation[]>('/automations'),
  toggleAutomation: (automationId: number, enabled: boolean) =>
    request<Automation>('/automations/' + automationId + '?enabled=' + enabled, {
      method: 'PATCH',
    }),
  users: () => request<User[]>('/users'),
  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
  }) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createArea: (payload: { name: string; description?: string }) =>
    request<Area>('/areas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteArea: (areaId: number) =>
    request<void>('/areas/' + areaId, { method: 'DELETE' }),
  grantPermission: (
    areaId: number,
    userId: number,
    payload: { can_view: boolean; can_control: boolean },
  ) =>
    request<AreaPermission>('/areas/' + areaId + '/permissions/' + userId, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
