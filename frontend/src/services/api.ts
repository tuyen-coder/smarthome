import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from '@/src/config/env';
import type {
  Alert,
  Area,
  AreaPermission,
  Automation,
  DashboardSummary,
  Device,
  Home,
  HomeMember,
  TokenResponse,
  User,
} from '@/src/types/domain';

const TOKEN_KEY = 'user_access_token';
let accessToken = '';

// Helper hỗ trợ lưu trữ cross-platform (Web dùng localStorage, Mobile dùng SecureStore)
async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return await SecureStore.getItemAsync(key);
}

async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function getAccessToken(): string {
  return accessToken;
}

// Khôi phục token từ bộ nhớ khi mở App
export async function initAccessToken() {
  const savedToken = await getStorageItem(TOKEN_KEY);
  if (savedToken) {
    accessToken = savedToken;
  }
  return savedToken;
}

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
  async setAccessToken(token: string) {
    accessToken = token;
    await setStorageItem(TOKEN_KEY, token);
  },

  async clearAccessToken() {
    accessToken = '';
    await deleteStorageItem(TOKEN_KEY);
  },

  async login(email: string, password: string) {
    const result = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    await this.setAccessToken(result.access_token);
    return result;
  },

  register: (payload: any) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => request<User>('/auth/me'),
  changePassword: (payload: { old_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  homes: () => request<Home[]>('/homes'),
  createHome: (payload: { name: string; address?: string }) =>
    request<Home>('/homes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  homeMembers: (homeId: number) => request<HomeMember[]>('/homes/' + homeId + '/members'),
  myRole: (homeId: number) => request<{ role: string | null }>('/homes/' + homeId + '/my_role'),
  addHomeMember: (homeId: number, payload: { email: string; role: string }) =>
    request<HomeMember>(`/homes/${homeId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHomeMember: (homeId: number, targetUserId: number, role: string) =>
    request<HomeMember>(`/homes/${homeId}/members/${targetUserId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  removeHomeMember: (homeId: number, targetUserId: number) =>
    request<void>(`/homes/${homeId}/members/${targetUserId}`, {
      method: 'DELETE',
    }),
  dashboard: (homeId: number) => request<DashboardSummary>('/telemetry/dashboard?home_id=' + homeId),
  areas: (homeId: number) => request<Area[]>('/areas?home_id=' + homeId),
  createArea: (payload: { name: string; home_id: number }) =>
    request<Area>('/areas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteArea: (areaId: number) =>
    request<void>(`/areas/${areaId}`, {
      method: 'DELETE',
    }),
  getPermissions: (homeId: number, userId: number) =>
    request<AreaPermission[]>(`/homes/${homeId}/members/${userId}/permissions`),
  myPermissions: (homeId: number) =>
    request<AreaPermission[]>(`/homes/${homeId}/my_permissions`),
  grantPermission: (
    areaId: number,
    userId: number,
    payload: { can_view: boolean; can_control: boolean },
  ) =>
    request<AreaPermission>('/areas/' + areaId + '/permissions/' + userId, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  devices: (homeId: number, areaId?: number) =>
    request<Device[]>('/devices?home_id=' + homeId + (areaId ? '&area_id=' + areaId : '')),
  device: (deviceId: number) =>
    request<Device>('/devices/' + deviceId),
  updateDevice: (deviceId: number, payload: Partial<Device>) =>
    request<Device>('/devices/' + deviceId, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteDevice: (deviceId: number) =>
    request<void>('/devices/' + deviceId, {
      method: 'DELETE',
    }),
  commandDevice: (
    deviceId: number,
    payload: { is_on?: boolean; state?: Record<string, unknown> },
  ) =>
    request<Device>('/devices/' + deviceId + '/command', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  alerts: (homeId: number) => request<Alert[]>('/alerts?home_id=' + homeId),
  updateAlert: (alertId: number, action: 'read' | 'acknowledge' | 'resolve') =>
    request<Alert>('/alerts/' + alertId + '/' + action, { method: 'PATCH' }),
  markAllAlertsRead: (homeId: number) =>
    request<void>('/alerts/mark-all-read?home_id=' + homeId, { method: 'PATCH' }),
  automations: (homeId: number) => request<Automation[]>('/automations?home_id=' + homeId),
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

};