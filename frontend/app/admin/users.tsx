import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoUsers } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { UserRole } from '@/src/types/domain';

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

export default function UsersScreen() {
  const [users, setUsers] = useState(demoUsers);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api.users().then(setUsers).catch(() => undefined);
  }, []);

  const visible = users.filter((user) =>
    (user.name + user.email).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Quản lý người dùng</Text>
        <Pressable
          accessibilityLabel="Kiểm tra nhận diện khuôn mặt"
          onPress={() => router.push('/admin/faces/recognize')}
          style={styles.faceTest}>
          <Ionicons color={colors.primary} name="scan-outline" size={22} />
        </Pressable>
      </View>

      <View style={styles.search}>
        <Ionicons color={colors.textSubtle} name="search-outline" size={22} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Tìm kiếm người dùng..."
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>THÀNH VIÊN GIA ĐÌNH</Text>
        <Text style={styles.count}>{users.length} Thành viên</Text>
      </View>

      <View style={styles.list}>
        {visible.map((user) => (
          <SurfaceCard key={user.id} style={styles.userCard}>
            <View style={styles.avatar}><Ionicons color={colors.primary} name="person" size={24} /></View>
            <View style={styles.flex}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
            <View style={[styles.role, user.role === 'admin' && styles.adminRole]}>
              <Text style={[styles.roleText, user.role === 'admin' && styles.adminRoleText]}>
                {roleLabels[user.role]}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={'Đăng ký khuôn mặt cho ' + user.name}
              onPress={() =>
                router.push({
                  pathname: '/admin/users/[id]/face',
                  params: { id: String(user.id) },
                })
              }
              style={styles.faceButton}>
              <Ionicons color={colors.primary} name="camera-outline" size={21} />
            </Pressable>
          </SurfaceCard>
        ))}
      </View>

      <SurfaceCard style={styles.permissionInfo}>
        <Ionicons color={colors.info} name="information-circle-outline" size={25} />
        <View style={styles.flex}>
          <Text style={styles.permissionTitle}>Phân quyền</Text>
          <Text style={styles.permissionText}>
            Admin có toàn quyền thiết lập hệ thống. Thành viên điều khiển thiết bị. Khách có quyền truy cập có thời hạn.
          </Text>
        </View>
      </SurfaceCard>

      <Pressable onPress={() => router.push('/admin/users/new')} style={styles.addButton}>
        <Ionicons color={colors.surface} name="person-add-outline" size={20} />
        <Text style={styles.addText}>Thêm người dùng mới</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  faceTest: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 6, color: colors.primary, fontSize: 23, fontWeight: '700' },
  search: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingHorizontal: 18, borderRadius: 28, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 16 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, letterSpacing: 1 },
  count: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden', color: colors.primary, backgroundColor: colors.primarySoft, fontSize: 11, fontWeight: '700' },
  list: { gap: 14 },
  userCard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primaryLight },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  email: { maxWidth: 150, marginTop: 3, color: colors.textMuted, fontSize: 12 },
  role: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.surfaceStrong },
  adminRole: { backgroundColor: colors.primaryLight },
  roleText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  adminRoleText: { color: colors.primaryPressed },
  faceButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.primarySoft },
  permissionInfo: { flexDirection: 'row', gap: 12, marginTop: 34, backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  permissionTitle: { color: colors.info, fontSize: 17, fontWeight: '700' },
  permissionText: { marginTop: 5, color: colors.info, fontSize: 12, lineHeight: 19 },
  addButton: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, borderRadius: 28, backgroundColor: colors.primary },
  addText: { color: colors.surface, fontWeight: '600' },
});
