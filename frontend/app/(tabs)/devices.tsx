import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { BrightnessSlider } from '@/components/common/BrightnessSlider';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';
import { useHome } from '@/src/context/HomeContext';
import { colors } from '@/src/theme/colors';
import type { Area, Device, DeviceType } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<DeviceType, IconName> = {
  light: 'bulb-outline',
  climate: 'snow-outline',
  security: 'shield-checkmark-outline',
  entertainment: 'tv-outline',
  camera: 'videocam-outline',
  pump: 'water-outline',
  other: 'hardware-chip-outline',
};

function deviceStatus(device: Device) {
  if (typeof device.state?.brightness === 'number') return `Độ sáng: ${device.state.brightness}%`;
  if (typeof device.state?.temperature === 'number') return `Đang bật • ${device.state.temperature}°C`;
  if (device.state?.air_quality) return `Hoạt động: ${device.state.air_quality}`;
  if (device.state?.speed) return `Tốc độ: ${device.state.speed}`;
  return device.is_online ? 'Đang kết nối' : 'Ngoại tuyến';
}

export default function DevicesScreen() {
  const { activeHome, isLoading: homeLoading } = useHome();
  const [areas, setAreas] = useState<Area[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAreas = async () => {
    if (!activeHome) return;
    try {
      const data = await api.areas(activeHome.id);
      setAreas(data);
    } catch (err) {
      console.error('[Devices] Fetch areas error:', err);
    }
  };

  const fetchDevices = async () => {
    if (!activeHome) return;
    try {
      const data = await api.devices(activeHome.id);
      setDevices(data);
    } catch (error) {
      console.error('Fetch devices failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!homeLoading) {
      fetchAreas();
      fetchDevices();
    }
  }, [activeHome, homeLoading]);

  // 3. Tự động LỌC thiết bị ở Client theo Area và Category
  const displayDevices = devices.filter((device) => {
    // Loại bỏ thiết bị loại SENSOR
    const isNotSensor = device.category?.toUpperCase() !== 'SENSOR';
    
    // Nếu chọn "Tất cả" (selectedArea === null) -> Lấy hết
    // Nếu chọn 1 khu vực -> Lọc theo area_id
    const matchesArea = selectedArea === null || device.area_id === selectedArea;

    return isNotSensor && matchesArea;
  });

  const toggle = async (device: Device) => {
    const next = !device.is_on;
    setDevices((items) =>
      items.map((item) => (item.id === device.id ? { ...item, is_on: next } : item)),
    );
    await api.commandDevice(device.id, { is_on: next }).catch(() => {
      setDevices((items) =>
        items.map((item) => (item.id === device.id ? { ...item, is_on: !next } : item)),
      );
    });
  };

  const updateBrightness = (deviceId: number, brightness: number) => {
    setDevices((items) =>
      items.map((item) =>
        item.id === deviceId
          ? { ...item, state: { ...item.state, brightness: Math.round(brightness) } }
          : item,
      ),
    );
  };

  const saveBrightness = async (deviceId: number, brightness: number) => {
    await api
      .commandDevice(deviceId, { state: { brightness } })
      .catch(() => undefined);
  };

  return (
    <AppScreen style={styles.screenPadding}>
      <AppHeader />
      <Text style={styles.title}>Điều khiển</Text>
      <Text style={styles.subtitle}>Quản lý không gian sống của bạn.</Text>

      {/* Tabs chọn Khu vực */}
      <View style={styles.chipsWrapper}>
        <ScrollView
          contentContainerStyle={styles.chips}
          horizontal
          showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setSelectedArea(null)}
            style={[styles.chip, selectedArea === null && styles.activeChip]}>
            <Text style={[styles.chipText, selectedArea === null && styles.activeChipText]}>
              Tất cả
            </Text>
          </Pressable>
          {areas.map((area) => (
            <Pressable
              key={area.id}
              onPress={() => setSelectedArea(area.id)}
              style={[styles.chip, selectedArea === area.id && styles.activeChip]}>
              <Text style={[styles.chipText, selectedArea === area.id && styles.activeChipText]}>
                {area.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Danh sách thiết bị */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Đang tải thiết bị...</Text>
        </View>
      ) : displayDevices.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.emptyText}>Không có thiết bị điều khiển nào trong khu vực này</Text>
        </SurfaceCard>
      ) : (
        <View style={styles.list}>
          {displayDevices.map((device) => {
            const iconName = icons[device.type] ?? 'hardware-chip-outline';
            return (
              <SurfaceCard key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceTop}>
                  <View style={styles.deviceIcon}>
                    <Ionicons color={colors.primary} name={iconName} size={23} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceStatus}>{deviceStatus(device)}</Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Xem chi tiết ${device.name}`}
                    hitSlop={8}
                    onPress={() =>
                      router.push({
                        pathname: '/devices/[id]',
                        params: { id: String(device.id) },
                      })
                    }
                    style={styles.detailButton}>
                    <Ionicons color={colors.textMuted} name="chevron-forward" size={19} />
                  </Pressable>
                  <Switch
                    ios_backgroundColor={colors.borderStrong}
                    onValueChange={() => toggle(device)}
                    thumbColor={colors.surface}
                    trackColor={{ false: colors.borderStrong, true: colors.primary }}
                    value={device.is_on}
                  />
                </View>

                {device.type === 'light' && device.state?.brightness !== undefined ? (
                  <BrightnessSlider
                    onChange={(brightness) => updateBrightness(device.id, brightness)}
                    onComplete={(brightness) => saveBrightness(device.id, brightness)}
                    value={Number(device.state.brightness ?? 0)}
                  />
                ) : null}

                {device.state?.power_watts ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>ϟ {String(device.state.power_watts)}W</Text>
                  </View>
                ) : null}
              </SurfaceCard>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screenPadding: {
    paddingBottom: 24,
  },
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 30, lineHeight: 38, fontWeight: '700' },
  subtitle: { marginTop: 4, color: colors.textMuted, fontSize: 15 },
  chipsWrapper: {
    marginBottom: 16,
  },
  chips: { gap: 10, paddingVertical: 16 },
  chip: {
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.surfaceStrong,
  },
  activeChip: { backgroundColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  activeChipText: { color: colors.surface },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: { 
    gap: 14,
  },
  deviceCard: { minHeight: 90 },
  deviceTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  deviceName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  deviceStatus: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  detailButton: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  meta: { color: colors.textMuted, fontSize: 12 },
});