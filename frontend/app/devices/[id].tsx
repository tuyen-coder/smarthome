import React, { ComponentProps, useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';
import { realtime } from '@/src/services/realtime';
import { useHome } from '@/src/context/HomeContext';
import { colors } from '@/src/theme/colors';
import type { Area, Device, DeviceCategory, DeviceType } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const deviceTypes: { type: DeviceType; label: string; icon: IconName }[] = [
  { type: 'light', label: 'Ánh sáng', icon: 'bulb-outline' },
  { type: 'climate', label: 'Điều hòa', icon: 'snow-outline' },
  { type: 'security', label: 'An ninh', icon: 'shield-checkmark-outline' },
  { type: 'entertainment', label: 'Giải trí', icon: 'tv-outline' },
  { type: 'camera', label: 'Camera', icon: 'videocam-outline' },
  { type: 'pump', label: 'Máy bơm', icon: 'water-outline' },
  { type: 'other', label: 'Khác', icon: 'hardware-chip-outline' },
];

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeHome, activeHomeRole } = useHome();

  const [device, setDevice] = useState<Device | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [myPerms, setMyPerms] = useState<Record<number, { can_view: boolean; can_control: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<DeviceType>('other');
  const [category, setCategory] = useState<DeviceCategory>('actuator');
  const [areaId, setAreaId] = useState<number | null>(null);
  const [feedKey, setFeedKey] = useState('');
  const [isOn, setIsOn] = useState(false);

  const canEdit = activeHomeRole === 'owner' || activeHomeRole === 'admin';

  const canControl = useMemo(() => {
    if (activeHomeRole === 'owner' || activeHomeRole === 'admin') return true;
    if (activeHomeRole === 'guest') return false;
    if (activeHomeRole === 'member' && device) {
      return myPerms[device.area_id]?.can_control ?? false;
    }
    return false;
  }, [activeHomeRole, device, myPerms]);

  const fetchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const devId = Number(id);
      const dev = await api.device(devId);
      setDevice(dev);
      setName(dev.name);
      setType(dev.type);
      setCategory(dev.category);
      setAreaId(dev.area_id);
      setFeedKey(dev.feed_key || '');
      setIsOn(dev.is_on);

      if (activeHome) {
        const areaList = await api.areas(activeHome.id);
        setAreas(areaList);

        if (activeHomeRole === 'member' || activeHomeRole === 'guest') {
          try {
            const perms = await api.myPermissions(activeHome.id);
            const permMap: Record<number, { can_view: boolean; can_control: boolean }> = {};
            for (const p of perms) {
              permMap[p.area_id] = { can_view: p.can_view, can_control: p.can_control };
            }
            setMyPerms(permMap);
          } catch {}
        }
      }
    } catch (err) {
      console.error('[DeviceDetail] Load error:', err);
      Alert.alert('Lỗi', 'Không thể tải thông tin thiết bị.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, activeHome, activeHomeRole]);

  // Realtime subscription
  useEffect(() => {
    const unsub = realtime.subscribe((payload) => {
      if (payload.type === 'device.updated' && Number(payload.device_id) === Number(id)) {
        if (typeof payload.is_on === 'boolean') {
          setIsOn(payload.is_on);
        }
      }
    });

    return unsub;
  }, [id]);

  const handleToggle = async () => {
    if (!device) return;
    if (!canControl) {
      Alert.alert(
        'Từ chối truy cập',
        activeHomeRole === 'guest'
          ? 'Tài khoản Khách chỉ được xem thông tin, không được phép điều khiển thiết bị.'
          : 'Bạn không có quyền điều khiển thiết bị trong khu vực này.',
      );
      return;
    }

    const next = !isOn;
    setIsOn(next);
    try {
      await api.commandDevice(device.id, { is_on: next });
    } catch (err) {
      console.error('[DeviceDetail] Command error:', err);
      setIsOn(!next);
      Alert.alert('Lỗi', 'Không thể gửi lệnh đến thiết bị.');
    }
  };

  const handleSave = async () => {
    if (!device) return;
    if (!canEdit) {
      Alert.alert('Từ chối', 'Chỉ Chủ nhà hoặc Quản trị viên mới có quyền cập nhật cấu hình thiết bị.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Tên thiết bị không được để trống.');
      return;
    }
    if (!areaId) {
      Alert.alert('Lỗi', 'Vui lòng chọn khu vực (phòng) cho thiết bị.');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await api.updateDevice(device.id, {
        name: name.trim(),
        type,
        category,
        area_id: areaId,
        feed_key: feedKey.trim() || undefined,
      });
      setDevice(updated);
      Alert.alert('Thành công', 'Đã lưu thay đổi thông tin thiết bị!');
    } catch (err) {
      console.error('[DeviceDetail] Save error:', err);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi thiết bị.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!device) return;
    if (!canEdit) {
      Alert.alert('Từ chối', 'Chỉ Chủ nhà hoặc Quản trị viên mới có quyền xóa thiết bị.');
      return;
    }

    Alert.alert(
      'Xác nhận xóa thiết bị',
      `Bạn có chắc chắn muốn xóa thiết bị "${device.name}" khỏi nhà không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await api.deleteDevice(device.id);
              Alert.alert('Đã xóa', 'Thiết bị đã được xóa thành công.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (err) {
              console.error('[DeviceDetail] Delete error:', err);
              Alert.alert('Lỗi', 'Không thể xóa thiết bị.');
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const sortedAreas = useMemo(() => {
    if (!device) return areas;
    const currentDeviceAreaId = device.area_id;
    return [...areas].sort((a, b) => {
      if (a.id === currentDeviceAreaId) return -1;
      if (b.id === currentDeviceAreaId) return 1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [areas, device]);

  const currentArea = areas.find((a) => a.id === areaId);

  if (isLoading) {
    return (
      <AppScreen contentStyle={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Đang tải chi tiết thiết bị...</Text>
      </AppScreen>
    );
  }

  if (!device) {
    return (
      <AppScreen contentStyle={styles.centerContainer}>
        <Ionicons color={colors.textSubtle} name="alert-circle-outline" size={48} />
        <Text style={styles.emptyText}>Không tìm thấy thông tin thiết bị.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </Pressable>
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết thiết bị</Text>
        {canEdit ? (
          <Pressable hitSlop={8} onPress={handleDelete} style={styles.deleteHeaderBtn}>
            <Ionicons color={colors.danger} name="trash-outline" size={22} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIconContainer, isOn && styles.heroIconContainerActive]}>
              <Ionicons
                color={isOn ? colors.primary : colors.textMuted}
                name={deviceTypes.find((t) => t.type === type)?.icon ?? 'hardware-chip-outline'}
                size={34}
              />
            </View>
            <View style={styles.heroInfo}>
              <Text numberOfLines={1} style={styles.heroName}>
                {name || device.name}
              </Text>
              <Text style={styles.heroSub}>
                {currentArea?.name ? `📍 ${currentArea.name}` : 'Chưa phân phòng'}
              </Text>
            </View>
            <Switch
              disabled={!canControl}
              ios_backgroundColor={colors.borderStrong}
              onValueChange={handleToggle}
              thumbColor={colors.surface}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              value={isOn}
            />
          </View>

          {/* Badges row */}
          <View style={styles.heroBadgesRow}>
            <View style={[styles.statusBadge, device.is_online ? styles.badgeOnline : styles.badgeOffline]}>
              <View style={[styles.statusDot, device.is_online ? styles.dotOnline : styles.dotOffline]} />
              <Text style={[styles.statusBadgeText, device.is_online ? styles.textOnline : styles.textOffline]}>
                {device.is_online ? 'Trực tuyến' : 'Ngoại tuyến'}
              </Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{category.toUpperCase()}</Text>
            </View>
            {device.state?.power_watts ? (
              <View style={styles.powerBadge}>
                <Text style={styles.powerBadgeText}>ϟ {String(device.state.power_watts)}W</Text>
              </View>
            ) : null}
          </View>

        </SurfaceCard>

        {/* Edit Form Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>THÔNG TIN THIẾT BỊ</Text>

          {/* Tên thiết bị */}
          <Text style={styles.label}>Tên thiết bị</Text>
          <TextInput
            editable={canEdit}
            onChangeText={setName}
            placeholder="Ví dụ: Đèn Trần Phòng Khách"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, !canEdit && styles.inputDisabled]}
            value={name}
          />

          {/* Loại thiết bị (Grid) */}
          <Text style={styles.label}>Loại thiết bị</Text>
          <View style={styles.typeGrid}>
            {deviceTypes.map((item) => {
              const isSelected = type === item.type;
              return (
                <Pressable
                  disabled={!canEdit}
                  key={item.type}
                  onPress={() => setType(item.type)}
                  style={[
                    styles.typeCard,
                    isSelected && styles.typeCardSelected,
                    !canEdit && styles.typeCardDisabled,
                  ]}>
                  <Ionicons
                    color={isSelected ? colors.primary : colors.textMuted}
                    name={item.icon}
                    size={24}
                  />
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Phân loại bản chất */}
          <Text style={styles.label}>Phân loại hệ thống</Text>
          <View style={styles.categoryRow}>
            {(['actuator', 'sensor', 'hybrid'] as const).map((cat) => {
              const isSelected = category.toLowerCase() === cat;
              return (
                <Pressable
                  disabled={!canEdit}
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                    !canEdit && styles.typeCardDisabled,
                  ]}>
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Chọn phòng */}
          <Text style={styles.label}>Khu vực lắp đặt (Phòng)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaScroll}>
            {sortedAreas.map((area) => {
              const isSelected = areaId === area.id;
              return (
                <Pressable
                  disabled={!canEdit}
                  key={area.id}
                  onPress={() => setAreaId(area.id)}
                  style={[
                    styles.areaChip,
                    isSelected && styles.areaChipSelected,
                    !canEdit && styles.typeCardDisabled,
                  ]}>
                  <Ionicons
                    color={isSelected ? colors.surface : colors.primary}
                    name="home-outline"
                    size={16}
                  />
                  <Text style={[styles.areaChipText, isSelected && styles.areaChipTextSelected]}>
                    {area.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Cấu hình MQTT Feed Key */}
          <Text style={styles.label}>Khóa Feed Adafruit IO (Tùy chọn)</Text>
          <TextInput
            autoCapitalize="none"
            editable={canEdit}
            onChangeText={setFeedKey}
            placeholder="Ví dụ: dadn253.led-1"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, !canEdit && styles.inputDisabled]}
            value={feedKey}
          />
        </View>

        {/* Save Button */}
        {canEdit && (
          <Pressable
            disabled={isSaving}
            onPress={handleSave}
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}>
            {isSaving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <>
                <Ionicons color={colors.surface} name="checkmark-circle-outline" size={20} />
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
              </>
            )}
          </Pressable>
        )}

        {!canEdit && (
          <SurfaceCard style={styles.readOnlyNotice}>
            <Ionicons color={colors.info} name="information-circle-outline" size={22} />
            <Text style={styles.readOnlyNoticeText}>
              Bạn đang đăng nhập với quyền Thành viên/Khách. Chỉ Chủ nhà hoặc Quản trị viên mới có quyền đổi tên, phòng hoặc xóa thiết bị.
            </Text>
          </SurfaceCard>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  backButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  deleteHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.dangerSoft,
  },
  heroCard: {
    padding: 18,
    borderRadius: 24,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconContainerActive: {
    backgroundColor: colors.primarySoft,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  heroSub: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 13,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeOnline: {
    backgroundColor: colors.successSoft,
  },
  badgeOffline: {
    backgroundColor: colors.surfaceStrong,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: colors.success,
  },
  dotOffline: {
    backgroundColor: colors.textSubtle,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textOnline: {
    color: colors.success,
  },
  textOffline: {
    color: colors.textMuted,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.infoSoft,
  },
  categoryBadgeText: {
    color: colors.info,
    fontSize: 11,
    fontWeight: '600',
  },
  powerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.warningSoft,
  },
  powerBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  heroSliderSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  sliderValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31.3%',
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  typeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeCardDisabled: {
    opacity: 0.6,
  },
  typeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryChip: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
  },
  categoryChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: colors.info,
    fontWeight: '700',
  },
  areaScroll: {
    flexDirection: 'row',
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  areaChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  areaChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  areaChipTextSelected: {
    color: colors.surface,
  },
  saveButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 27,
    backgroundColor: colors.primary,
    marginTop: 12,
    marginBottom: 20,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.infoSoft,
    borderColor: colors.infoSoft,
    marginTop: 10,
  },
  readOnlyNoticeText: {
    flex: 1,
    color: colors.info,
    fontSize: 12,
    lineHeight: 18,
  },
});
