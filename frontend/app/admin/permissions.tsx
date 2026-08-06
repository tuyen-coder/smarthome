import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAreas, demoUsers } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

type PermissionState = Record<number, { can_view: boolean; can_control: boolean }>;

export default function PermissionsScreen() {
  const [selectedUser, setSelectedUser] = useState(demoUsers[1].id);
  const [permissions, setPermissions] = useState<PermissionState>(() =>
    Object.fromEntries(
      demoAreas.map((area, index) => [
        area.id,
        { can_view: index < 3, can_control: index < 2 },
      ]),
    ),
  );

  const update = async (
    areaId: number,
    field: 'can_view' | 'can_control',
    value: boolean,
  ) => {
    const next = { ...permissions[areaId], [field]: value };
    if (field === 'can_view' && !value) next.can_control = false;
    if (field === 'can_control' && value) next.can_view = true;
    setPermissions((current) => ({ ...current, [areaId]: next }));
    await api.grantPermission(areaId, selectedUser, next).catch(() => undefined);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Phân quyền truy cập</Text>
      </View>

      <Text style={styles.sectionTitle}>CHỌN THÀNH VIÊN</Text>
      <View style={styles.userChips}>
        {demoUsers.slice(1).map((user) => (
          <Pressable
            key={user.id}
            onPress={() => setSelectedUser(user.id)}
            style={[styles.userChip, selectedUser === user.id && styles.selectedUser]}>
            <Ionicons
              color={selectedUser === user.id ? colors.surface : colors.primary}
              name="person-outline"
              size={18}
            />
            <Text style={[styles.userName, selectedUser === user.id && styles.selectedUserText]}>
              {user.name.split(' ').slice(-2).join(' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>QUYỀN THEO KHU VỰC</Text>
      <View style={styles.list}>
        {demoAreas.map((area) => {
          const permission = permissions[area.id];
          return (
            <SurfaceCard key={area.id}>
              <View style={styles.areaHeader}>
                <View style={styles.areaIcon}>
                  <Ionicons color={colors.primary} name="home-outline" size={21} />
                </View>
                <Text style={styles.areaName}>{area.name}</Text>
              </View>
              <View style={styles.permissionRow}>
                <Text style={styles.permissionLabel}>Được xem khu vực</Text>
                <Switch
                  onValueChange={(value) => update(area.id, 'can_view', value)}
                  trackColor={{ false: colors.borderStrong, true: colors.primary }}
                  value={permission.can_view}
                />
              </View>
              <View style={styles.permissionRow}>
                <Text style={styles.permissionLabel}>Được điều khiển thiết bị</Text>
                <Switch
                  onValueChange={(value) => update(area.id, 'can_control', value)}
                  trackColor={{ false: colors.borderStrong, true: colors.primary }}
                  value={permission.can_control}
                />
              </View>
            </SurfaceCard>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { height: 58, flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 6, color: colors.primary, fontSize: 23, fontWeight: '700' },
  sectionTitle: { marginTop: 28, marginBottom: 12, marginLeft: 5, color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  userChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, backgroundColor: colors.surface },
  selectedUser: { backgroundColor: colors.primary },
  userName: { color: colors.text, fontSize: 12, fontWeight: '600' },
  selectedUserText: { color: colors.surface },
  list: { gap: 14 },
  areaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  areaIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  areaName: { color: colors.text, fontWeight: '700' },
  permissionRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  permissionLabel: { color: colors.textMuted, fontSize: 13 },
});
