import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAreas, demoDevices } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { DeviceType } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const deviceTypes: { type: DeviceType; label: string; icon: IconName }[] = [
  { type: 'light', label: 'Ánh sáng', icon: 'bulb-outline' },
  { type: 'climate', label: 'Điều hòa', icon: 'snow-outline' },
  { type: 'security', label: 'An ninh', icon: 'shield-half-outline' },
  { type: 'entertainment', label: 'Giải trí', icon: 'tv-outline' },
  { type: 'camera', label: 'Camera', icon: 'videocam-outline' },
  { type: 'other', label: 'Khác', icon: 'radio-outline' },
];

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const device = useMemo(
    () => demoDevices.find((item) => item.id === Number(id)) ?? demoDevices[0],
    [id],
  );
  const [name, setName] = useState(device.name);
  const [type, setType] = useState<DeviceType>(device.type);
  const [areaId, setAreaId] = useState(device.area_id);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await api.commandDevice(device.id, { state: { name, type, area_id: areaId } }).catch(() => undefined);
    setSaved(true);
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.text} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết thiết bị</Text>
      </View>

      <View style={styles.hero}>
        <Ionicons color={colors.surface} name="home-outline" size={58} />
        <View>
          <Text style={styles.eyebrow}>THIẾT LẬP</Text>
          <Text style={styles.heroTitle}>Không gian của bạn</Text>
        </View>
      </View>

      <Text style={styles.label}>Tên thiết bị</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Ví dụ: Đèn Trần"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        value={name}
      />

      <Text style={styles.label}>Loại thiết bị</Text>
      <View style={styles.typeGrid}>
        {deviceTypes.map((item) => (
          <Pressable
            key={item.type}
            onPress={() => setType(item.type)}
            style={[styles.typeCard, type === item.type && styles.selectedType]}>
            <Ionicons
              color={type === item.type ? colors.primary : colors.textMuted}
              name={item.icon}
              size={25}
            />
            <Text style={[styles.typeLabel, type === item.type && styles.selectedText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.areaHeader}>
        <Text style={styles.label}>Khu vực</Text>
        <Text style={styles.addRoom}>+ Thêm phòng</Text>
      </View>
      <View style={styles.areaChips}>
        {demoAreas.slice(0, 3).map((area) => (
          <Pressable
            key={area.id}
            onPress={() => setAreaId(area.id)}
            style={[styles.areaChip, areaId === area.id && styles.selectedArea]}>
            <Text style={[styles.areaText, areaId === area.id && styles.selectedAreaText]}>
              {area.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <SurfaceCard style={styles.connection}>
        <Ionicons color={colors.primary} name="wifi" size={30} />
        <View style={styles.flex}>
          <Text style={styles.connectionTitle}>Kết nối ổn định</Text>
          <Text style={styles.connectionText}>
            Thiết bị đang trong chế độ ghép nối và ở gần bộ điều khiển trung tâm.
          </Text>
        </View>
      </SurfaceCard>

      {saved ? <Text style={styles.saved}>Đã lưu thay đổi</Text> : null}
      <Pressable onPress={save} style={styles.saveButton}>
        <Ionicons color={colors.primaryPressed} name="save-outline" size={20} />
        <Text style={styles.saveText}>Lưu thiết bị</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 48 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  hero: {
    height: 190,
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 22,
    borderRadius: 32,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  eyebrow: { color: colors.primarySoft, fontSize: 12, letterSpacing: 1.1 },
  heroTitle: { marginTop: 5, color: colors.surface, fontSize: 24, fontWeight: '700' },
  label: { marginTop: 28, marginBottom: 9, marginLeft: 4, color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  input: { height: 56, paddingHorizontal: 22, borderRadius: 28, backgroundColor: colors.surface, color: colors.text, fontSize: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: '30.8%',
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.transparent,
  },
  selectedType: { borderColor: colors.primaryLight },
  typeLabel: { color: colors.textMuted, fontSize: 12 },
  selectedText: { color: colors.primary, fontWeight: '700' },
  areaHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  addRoom: { color: colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 9 },
  areaChips: { flexDirection: 'row', gap: 10, overflow: 'hidden' },
  areaChip: { paddingHorizontal: 20, paddingVertical: 13, borderRadius: 24, backgroundColor: colors.surface },
  selectedArea: { backgroundColor: colors.primaryLight },
  areaText: { color: colors.textMuted, fontSize: 13 },
  selectedAreaText: { color: colors.primaryPressed },
  connection: { flexDirection: 'row', gap: 16, marginTop: 32, backgroundColor: colors.primarySoft },
  connectionTitle: { color: colors.text, fontWeight: '700' },
  connectionText: { marginTop: 5, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  saved: { marginTop: 22, color: colors.success, textAlign: 'center', fontWeight: '600' },
  saveButton: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, borderRadius: 29, backgroundColor: colors.primaryLight },
  saveText: { color: colors.primaryPressed, fontSize: 16 },
});
