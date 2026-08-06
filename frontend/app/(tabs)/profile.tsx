import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { colors } from '@/src/theme/colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function SettingRow({
  icon,
  label,
  value,
  onPress,
  toggle,
  onToggle,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.row}>
      <Ionicons color={colors.primary} name={icon} size={19} />
      <Text style={styles.rowLabel}>{label}</Text>
      {onToggle ? (
        <Switch
          ios_backgroundColor={colors.borderStrong}
          onValueChange={onToggle}
          thumbColor={colors.surface}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          value={toggle}
        />
      ) : (
        <>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
        </>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [warningEnabled, setWarningEnabled] = useState(true);

  return (
    <AppScreen>
      <View style={styles.pageHeader}>
        <View style={styles.avatar}><Ionicons color={colors.primary} name="person" size={20} /></View>
        <Text style={styles.pageTitle}>Cài đặt</Text>
        <Ionicons color={colors.textMuted} name="settings-outline" size={20} />
      </View>

      <SurfaceCard style={styles.profileCard}>
        <View style={styles.largeAvatar}><Ionicons color={colors.surface} name="person" size={30} /></View>
        <View style={styles.flex}>
          <Text style={styles.name}>Nguyễn Thiên Ân</Text>
          <Text style={styles.email}>admin@yolohome.vn</Text>
          <Text style={styles.badge}>Quản trị viên</Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={17} />
      </SurfaceCard>

      <Text style={styles.groupTitle}>CÀI ĐẶT CHUNG</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="home-outline" label="Tên nhà" value="Yolo Mansion" />
        <SettingRow icon="location-outline" label="Vị trí" value="TP. Hồ Chí Minh" />
        <SettingRow icon="language-outline" label="Ngôn ngữ" value="Tiếng Việt" />
      </SurfaceCard>

      <Text style={styles.groupTitle}>THÔNG BÁO</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="notifications-outline" label="Push" onToggle={setPushEnabled} toggle={pushEnabled} />
        <SettingRow icon="warning-outline" label="Cảnh báo" onToggle={setWarningEnabled} toggle={warningEnabled} />
      </SurfaceCard>

      <Text style={styles.groupTitle}>BẢO MẬT & QUẢN TRỊ</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="lock-closed-outline" label="Đổi mật khẩu" />
        <SettingRow
          icon="people-outline"
          label="Quản lý người dùng"
          onPress={() => router.push('/admin/users')}
        />
        <SettingRow
          icon="grid-outline"
          label="Quản lý khu vực"
          onPress={() => router.push('/admin/areas')}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Phân quyền"
          onPress={() => router.push('/admin/permissions')}
        />
      </SurfaceCard>

      <Text style={styles.groupTitle}>HỆ THỐNG</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="refresh-outline" label="Cập nhật firmware" value="v2.4.1" />
        <SettingRow icon="wifi-outline" label="Kết nối Wi-Fi" value="YoloHome_5G" />
      </SurfaceCard>

      <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.logout}>
        <Text style={styles.logoutText}>Đăng Xuất</Text>
      </Pressable>
      <Text style={styles.version}>Home Smart Version 0.1.0</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pageHeader: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  pageTitle: { flex: 1, marginLeft: 10, color: colors.primary, fontSize: 20, fontWeight: '700' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  largeAvatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  name: { color: colors.text, fontWeight: '700' },
  email: { marginTop: 2, color: colors.textMuted, fontSize: 12 },
  badge: { alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', color: colors.primary, backgroundColor: colors.primarySoft, fontSize: 10, fontWeight: '700' },
  groupTitle: { marginTop: 26, marginBottom: 8, marginLeft: 6, color: colors.textSubtle, fontSize: 10, letterSpacing: 1 },
  group: { paddingVertical: 4, paddingHorizontal: 16 },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { flex: 1, color: colors.text, fontSize: 13 },
  rowValue: { color: colors.textMuted, fontSize: 12 },
  logout: { height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 28, borderRadius: 26, borderWidth: 1, borderColor: colors.danger },
  logoutText: { color: colors.danger, fontWeight: '600' },
  version: { marginTop: 18, color: colors.textSubtle, fontSize: 10, textAlign: 'center' },
});
