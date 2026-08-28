export type UserRole = 'admin' | 'member' | 'guest';
export type HomeRole = 'owner' | 'admin' | 'member' | 'guest';
export type DeviceCategory = 'sensor' | 'actuator' | 'hybrid';
export type DeviceType =
  | 'light'
  | 'climate'
  | 'security'
  | 'entertainment'
  | 'camera'
  | 'pump' // <-- Thêm loại pump vào đây
  | 'other';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Home {
  id: number;
  name: string;
  address?: string | null;
  owner_id: number;
  created_at: string;
}

export interface HomeMember {
  id: number;
  user_id: number;
  home_id: number;
  role: HomeRole;
  joined_at: string;
  user: User;
}

export interface Area {
  id: number;
  home_id: number;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface AreaPermission {
  id: number;
  user_id: number;
  area_id: number;
  can_view: boolean;
  can_control: boolean;
}

export interface Device {
  id: number;
  name: string;
  category: DeviceCategory;
  type: DeviceType;
  area_id: number;
  feed_key?: string | null;
  is_online: boolean;
  is_on: boolean;
  state: Record<string, unknown>;
  updated_at: string;
}

export interface Automation {
  id: number;
  home_id: number;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: number;
  home_id?: number | null;
  device_id?: number | null;
  title: string;
  message: string;
  severity: AlertSeverity;
  is_read: boolean;
  is_acknowledged: boolean;
  is_resolved: boolean;
  created_at: string;
}

export interface DashboardSummary {
  temperature: number | null;
  humidity: number | null;
  online_devices: number;
  active_devices: number;
  unresolved_alerts: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
}
