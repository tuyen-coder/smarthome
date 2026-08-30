import { env } from '@/src/config/env';
import type {
  Alert,
  Area,
  AreaPermission,
  Automation,
  DashboardSummary,
  Device,
  FaceProfile,
  FaceRecognition,
  TokenResponse,
  User,
} from '@/src/types/domain';

let accessToken = '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(env.API_URL + path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
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

async function imageForm(uris: string[], field = 'files') {
  const form = new FormData();
  for (const [index, uri] of uris.entries()) {
    if (typeof document !== 'undefined') {
      const blob = await fetch(uri).then((response) => response.blob());
      form.append(field, blob, `face-${index + 1}.jpg`);
    } else {
      form.append(
        field,
        { uri, name: `face-${index + 1}.jpg`, type: 'image/jpeg' } as unknown as Blob,
      );
    }
  }
  return form;
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
  async enrollFace(userId: number, imageUris: string[]) {
    return request<FaceProfile>('/faces/users/' + userId + '/enroll', {
      method: 'POST',
      body: await imageForm(imageUris),
    });
  },
  faceProfile: (userId: number) =>
    request<FaceProfile>('/faces/users/' + userId),
  deleteFaceProfile: (userId: number) =>
    request<void>('/faces/users/' + userId, { method: 'DELETE' }),
  async recognizeFace(imageUri: string) {
    return request<FaceRecognition>('/faces/recognize', {
      method: 'POST',
      body: await imageForm([imageUri], 'file'),
    });
  },
};
