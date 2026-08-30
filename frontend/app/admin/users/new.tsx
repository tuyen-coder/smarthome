import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { UserRole } from '@/src/types/domain';

const roles: { value: UserRole; title: string; description: string }[] = [
  { value: 'admin', title: 'Quản trị viên', description: 'Toàn quyền điều khiển và quản lý người dùng.' },
  { value: 'member', title: 'Thành viên', description: 'Điều khiển thiết bị nhưng không thể thay đổi cài đặt.' },
  { value: 'guest', title: 'Khách', description: 'Truy cập tạm thời trong khoảng thời gian nhất định.' },
];

export default function NewUserScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    try {
      const user = await api.createUser({ name, email, role, password: 'changeme123' });
      router.replace({
        pathname: '/admin/users/[id]/face',
        params: { id: String(user.id) },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể thêm người dùng');
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Thêm người dùng mới</Text>
      </View>

      <View style={styles.photo}>
        <Ionicons color={colors.textMuted} name="camera-outline" size={32} />
        <View style={styles.edit}><Ionicons color={colors.surface} name="pencil" size={12} /></View>
      </View>
      <Text style={styles.photoLabel}>Khuôn mặt sẽ được đăng ký sau khi tạo người dùng</Text>

      <Text style={styles.label}>Họ và tên</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Nguyễn Văn A"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        value={name}
      />
      <Text style={styles.label}>Địa chỉ Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="example@email.com"
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        value={email}
      />

      <Text style={styles.label}>Chọn vai trò</Text>
      <View style={styles.roles}>
        {roles.map((item) => (
          <Pressable key={item.value} onPress={() => setRole(item.value)}>
            <SurfaceCard style={[styles.roleCard, role === item.value && styles.selectedRole]}>
              <Ionicons
                color={role === item.value ? colors.primary : colors.textMuted}
                name={item.value === 'admin' ? 'shield-checkmark-outline' : 'people-outline'}
                size={22}
              />
              <View style={styles.flex}>
                <Text style={styles.roleTitle}>{item.title}</Text>
                <Text style={styles.roleDescription}>{item.description}</Text>
              </View>
              <View style={[styles.radio, role === item.value && styles.selectedRadio]}>
                {role === item.value ? <View style={styles.radioDot} /> : null}
              </View>
            </SurfaceCard>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={!name.trim() || !email.trim()}
        onPress={submit}
        style={[styles.submit, (!name.trim() || !email.trim()) && styles.disabled]}>
        <Ionicons color={colors.surface} name="person-add-outline" size={19} />
        <Text style={styles.submitText}>Thêm người dùng</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 48 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, marginLeft: 6, color: colors.primary, fontSize: 22, fontWeight: '700' },
  photo: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: colors.surfaceMuted },
  edit: { position: 'absolute', right: 0, bottom: 2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  photoLabel: { marginTop: 10, color: colors.textMuted, textAlign: 'center', fontSize: 12 },
  label: { marginTop: 24, marginBottom: 8, color: colors.primary, fontSize: 12 },
  input: { height: 54, paddingHorizontal: 20, borderRadius: 27, color: colors.text, backgroundColor: colors.surfaceMuted },
  roles: { gap: 12 },
  roleCard: { minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderWidth: 2, borderColor: colors.transparent },
  selectedRole: { borderColor: colors.primaryLight },
  roleTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  roleDescription: { marginTop: 4, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  radio: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong },
  selectedRadio: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  error: { marginTop: 16, color: colors.danger, textAlign: 'center' },
  submit: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 30, borderRadius: 28, backgroundColor: colors.primary },
  submitText: { color: colors.surface, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
