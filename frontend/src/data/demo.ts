import type { Alert, Area, Automation, DashboardSummary, Device, User } from '@/src/types/domain';

const now = new Date().toISOString();

export const demoSummary: DashboardSummary = {
  temperature: 28,
  humidity: 65,
  online_devices: 8,
  active_devices: 4,
  unresolved_alerts: 2,
};

export const demoAreas: Area[] = [
  { id: 1, name: 'Phòng Khách', description: '3 thiết bị bật', created_at: now },
  { id: 2, name: 'Phòng Ngủ', description: '2 thiết bị bật', created_at: now },
  { id: 3, name: 'Nhà Bếp', description: 'Tất cả đang tắt', created_at: now },
  { id: 4, name: 'Cửa Chính', description: 'Đã khóa', created_at: now },
];

export const demoDevices: Device[] = [
  {
    id: 1,
    name: 'Đèn Trần',
    type: 'light',
    area_id: 1,
    feed_key: 'bbc-led',
    is_online: true,
    is_on: true,
    state: { brightness: 64 },
    updated_at: now,
  },
  {
    id: 2,
    name: 'Điều Hòa',
    type: 'climate',
    area_id: 1,
    feed_key: 'bbc-pump',
    is_online: true,
    is_on: true,
    state: { temperature: 22 },
    updated_at: now,
  },
  {
    id: 3,
    name: 'Máy Lọc Không Khí',
    type: 'climate',
    area_id: 1,
    is_online: true,
    is_on: true,
    state: { air_quality: 'Tốt', power_watts: 12 },
    updated_at: now,
  },
  {
    id: 4,
    name: 'Quạt Thông Minh',
    type: 'other',
    area_id: 1,
    is_online: true,
    is_on: false,
    state: { speed: 2 },
    updated_at: now,
  },
];

export const demoAlerts: Alert[] = [
  {
    id: 1,
    device_id: 4,
    title: 'An ninh',
    message: 'Cửa chính đã khóa',
    severity: 'info',
    is_read: false,
    is_acknowledged: false,
    is_resolved: false,
    created_at: now,
  },
  {
    id: 2,
    title: 'Cảnh báo',
    message: 'Phát hiện thiết bị lạ kết nối Wi-Fi',
    severity: 'critical',
    is_read: false,
    is_acknowledged: false,
    is_resolved: false,
    created_at: now,
  },
  {
    id: 3,
    title: 'Năng lượng',
    message: 'Đạt giới hạn tiêu thụ hằng ngày tại Nhà bếp',
    severity: 'warning',
    is_read: true,
    is_acknowledged: true,
    is_resolved: false,
    created_at: now,
  },
];

export const demoAutomations: Automation[] = [
  {
    id: 1,
    name: 'Tắt đèn khi rời nhà',
    enabled: true,
    trigger: { type: 'presence', value: 'away' },
    action: { device: 'Tất cả đèn', is_on: false },
    created_at: now,
  },
  {
    id: 2,
    name: 'Chế độ đi ngủ',
    enabled: true,
    trigger: { type: 'time', value: '22:30' },
    action: { scene: 'sleep' },
    created_at: now,
  },
  {
    id: 3,
    name: 'Làm mát phòng khách',
    enabled: false,
    trigger: { metric: 'temperature', operator: '>', value: 29 },
    action: { device: 'Điều hòa', temperature: 24 },
    created_at: now,
  },
];

export const demoUsers: User[] = [
  {
    id: 1,
    name: 'Nguyễn Thiên Ân',
    email: 'admin@yolohome.vn',
    role: 'admin',
    is_active: true,
    created_at: now,
  },
  {
    id: 2,
    name: 'Alex Johnson',
    email: 'alex@yolohome.vn',
    role: 'member',
    is_active: true,
    created_at: now,
  },
  {
    id: 3,
    name: 'Trần Văn Bình',
    email: 'binh.tran@yolohome.vn',
    role: 'member',
    is_active: true,
    created_at: now,
  },
  {
    id: 4,
    name: 'Lê Minh Tâm',
    email: 'tam.le@yolohome.vn',
    role: 'guest',
    is_active: true,
    created_at: now,
  },
];
