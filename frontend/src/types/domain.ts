export type UserRole = 'admin' | 'member' | 'guest';
export type DeviceType =
  | 'light'
  | 'climate'
  | 'security'
  | 'entertainment'
  | 'camera'
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

export interface Area {
  id: number;
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
  type: DeviceType;
  area_id: number;
  feed_key?: string | null;
  is_online: boolean;
  is_on: boolean;
  state: Record<string, string | number | boolean>;
  updated_at: string;
}

export interface Automation {
  id: number;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: number;
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

export interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  confidence: number;
  brightness: number;
  sharpness: number;
  quality_score: number;
}

export interface FaceProfile {
  user_id: number;
  sample_count: number;
  model_name: string;
  model_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaceRecognition {
  event_id: number;
  recognized: boolean;
  user_id?: number | null;
  user_name?: string | null;
  similarity?: number | null;
  threshold: number;
  reason: string;
  detection: FaceDetection;
  liveness_verified: boolean;
}
