import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { BrightnessSlider } from '@/components/common/BrightnessSlider';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAreas, demoDevices } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { Device } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const icons: Record<Device['type'], IconName> = {
  light: 'bulb-outline',
  climate: 'snow-outline',
  security: 'shield-checkmark-outline',
  entertainment: 'tv-outline',
  camera: 'videocam-outline',
  other: 'hardware-chip-outline',
};

function deviceStatus(device: Device) {
  if (typeof device.state.brightness === 'number') return 'Độ sáng: ' + device.state.brightness + '%';
  if (typeof device.state.temperature === 'number') return 'Đang bật • ' + device.state.temperature + '°C';
  if (device.state.air_quality) return 'Hoạt động: ' + device.state.air_quality;
  if (device.state.speed) return 'Tốc độ: ' + device.state.speed;
  return device.is_online ? 'Đang kết nối' : 'Ngoại tuyến';
}

export default function DevicesScreen() {
  const [devices, setDevices] = useState(demoDevices);
  const [selectedArea, setSelectedArea] = useState(1);

  useEffect(() => {
    api.devices(selectedArea).then(setDevices).catch(() => setDevices(demoDevices));
  }, [selectedArea]);

  const toggle = async (device: Device) => {
    const next = !device.is_on;
    setDevices((items) =>
      items.map((item) => (item.id === device.id ? { ...item, is_on: next } : item)),
    );
    await api.commandDevice(device.id, { is_on: next }).catch(() => undefined);
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
    <AppScreen>
      <AppHeader />
      <Text style={styles.title}>Điều khiển</Text>
      <Text style={styles.subtitle}>Quản lý không gian sống của bạn.</Text>

      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {demoAreas.map((area) => (
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

      <View style={styles.list}>
        {devices.map((device) => (
          <SurfaceCard key={device.id} style={styles.deviceCard}>
            <View style={styles.deviceTop}>
              <View style={styles.deviceIcon}>
                <Ionicons color={colors.primary} name={icons[device.type]} size={23} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceStatus}>{deviceStatus(device)}</Text>
              </View>
              <Pressable
                accessibilityLabel={'Xem chi tiết ' + device.name}
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
            {device.type === 'light' ? (
              <BrightnessSlider
                onChange={(brightness) => updateBrightness(device.id, brightness)}
                onComplete={(brightness) => saveBrightness(device.id, brightness)}
                value={Number(device.state.brightness ?? 0)}
              />
            ) : null}
            {device.state.power_watts ? (
              <View style={styles.metaRow}>
                <Text style={styles.meta}>ϟ {device.state.power_watts}W</Text>
                <Text style={styles.metaStrong}>AQI: 14</Text>
              </View>
            ) : null}
          </SurfaceCard>
        ))}
      </View>

      <Text style={styles.environmentTitle}>Môi trường phòng</Text>
      <SurfaceCard style={styles.environment}>
        {[
          ['thermometer-outline', 'Nhiệt độ', '24°C'],
          ['water-outline', 'Độ ẩm', '52%'],
          ['leaf-outline', 'Không khí', 'Tốt'],
        ].map(([icon, label, value]) => (
          <View key={label} style={styles.environmentItem}>
            <Ionicons color={colors.primary} name={icon as IconName} size={22} />
            <Text style={styles.environmentLabel}>{label}</Text>
            <Text style={styles.environmentValue}>{value}</Text>
          </View>
        ))}
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 30, lineHeight: 38, fontWeight: '700' },
  subtitle: { marginTop: 4, color: colors.textMuted, fontSize: 15 },
  chips: { gap: 10, paddingVertical: 22 },
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
  list: { gap: 14 },
  deviceCard: { minHeight: 120 },
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  meta: { color: colors.textMuted, fontSize: 12 },
  metaStrong: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  environmentTitle: { marginTop: 30, marginBottom: 14, color: colors.text, fontSize: 21, fontWeight: '700' },
  environment: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surfaceMuted },
  environmentItem: { alignItems: 'center' },
  environmentLabel: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  environmentValue: { color: colors.text, fontSize: 19, fontWeight: '700' },
});
