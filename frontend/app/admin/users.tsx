import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { useHome } from '@/src/context/HomeContext';
import type { HomeRole, HomeMember } from '@/src/types/domain';

const roleLabels: Record<HomeRole, string> = {
  owner: 'Chủ nhà',
  admin: 'Admin',
  member: 'Thành viên',
  guest: 'Khách',
};

export default function UsersScreen() {
  const { activeHome } = useHome();
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [query, setQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<HomeMember | null>(null);

  const fetchMembers = () => {
    if (activeHome) {
      api.homeMembers(activeHome.id).then(setMembers).catch(console.error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeHome]);

  const visible = members.filter((member) =>
    (member.user.name + member.user.email).toLowerCase().includes(query.toLowerCase()),
  );

  const handleRemove = async (targetUserId: number) => {
    if (!activeHome) return;
    try {
      await api.removeHomeMember(activeHome.id, targetUserId);
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeRole = async (role: 'owner' | 'admin' | 'member' | 'guest') => {
    if (!activeHome || !selectedMember) return;
    try {
      await api.updateHomeMember(activeHome.id, selectedMember.user_id, role);
      fetchMembers();
      setSelectedMember(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Quản lý người dùng</Text>
        <Ionicons color={colors.textMuted} name="ellipsis-vertical" size={20} />
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
        <Text style={styles.count}>{members.length} Thành viên</Text>
      </View>

      <View style={styles.list}>
        {visible.map((member) => (
          <Pressable key={member.id} onPress={() => setSelectedMember(member)}>
            <SurfaceCard style={styles.userCard}>
            <View style={styles.avatar}><Ionicons color={colors.primary} name="person" size={24} /></View>
            <View style={styles.flex}>
              <Text style={styles.name}>{member.user.name}</Text>
              <Text style={styles.email}>{member.user.email}</Text>
            </View>
            <View style={[styles.role, (member.role === 'admin' || member.role === 'owner') && styles.adminRole]}>
              <Text style={[styles.roleText, (member.role === 'admin' || member.role === 'owner') && styles.adminRoleText]}>
                {roleLabels[member.role]}
              </Text>
            </View>
            <Pressable onPress={() => handleRemove(member.user_id)} style={styles.removeButton}>
              <Ionicons color={colors.danger} name="trash-outline" size={19} />
            </Pressable>
            </SurfaceCard>
          </Pressable>
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedMember !== null}
        onRequestClose={() => setSelectedMember(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết tài khoản</Text>
              <Pressable onPress={() => setSelectedMember(null)}>
                <Ionicons color={colors.textSubtle} name="close" size={24} />
              </Pressable>
            </View>

            {selectedMember && (
              <>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Họ và tên</Text>
                  <TextInput editable={false} style={styles.modalDetailInput} value={selectedMember.user.name} />
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Email (Không thể sửa)</Text>
                  <TextInput editable={false} style={styles.modalDetailInput} value={selectedMember.user.email} />
                </View>

                <Text style={[styles.modalDetailLabel, { marginTop: 16, marginBottom: 8 }]}>Chức vụ</Text>
                <View style={styles.roleOptions}>
                  {(['admin', 'member', 'guest'] as const).map(role => (
                    <Pressable
                      key={role}
                      onPress={() => handleChangeRole(role)}
                      style={[
                        styles.roleOption,
                        selectedMember.role === role && styles.roleOptionSelected
                      ]}>
                      <Text style={[
                        styles.roleOptionText,
                        selectedMember.role === role && styles.roleOptionTextSelected
                      ]}>{roleLabels[role]}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  permissionInfo: { flexDirection: 'row', gap: 12, marginTop: 34, backgroundColor: colors.infoSoft, borderColor: colors.infoSoft },
  permissionTitle: { color: colors.info, fontSize: 17, fontWeight: '700' },
  permissionText: { marginTop: 5, color: colors.info, fontSize: 12, lineHeight: 19 },
  addButton: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, borderRadius: 28, backgroundColor: colors.primary },
  addText: { color: colors.surface, fontWeight: '600' },
  removeButton: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', backgroundColor: colors.surface, borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modalDetailRow: { marginBottom: 16 },
  modalDetailLabel: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  modalDetailInput: { backgroundColor: colors.background, color: colors.textMuted, padding: 14, borderRadius: 16, fontSize: 15 },
  roleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  roleOptionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  roleOptionText: { color: colors.text, fontSize: 14 },
  roleOptionTextSelected: { color: colors.primary, fontWeight: '700' },
});
