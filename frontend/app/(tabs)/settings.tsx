import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View, TextInput } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { colors } from '@/src/theme/colors';
import { useHome } from '@/src/context/HomeContext';
import { api } from '@/src/services/api';
import type { User } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

function SettingRow({
  icon,
  label,
  value,
  onPress,
  toggle,
  onToggle,
  disabled,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable 
      disabled={(!onPress && !onToggle && !disabled)} 
      onPress={() => {
        if (disabled) {
          Alert.alert('Từ chối truy cập', 'Bạn không có quyền truy cập tính năng này');
          return;
        }
        if (onPress) onPress();
      }} 
      style={[styles.row, disabled && { opacity: 0.5 }]}>
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
  const { homes, activeHome, activeHomeRole, setActiveHome } = useHome();
  const [user, setUser] = useState<User | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [warningEnabled, setWarningEnabled] = useState(true);
  const [isHomePickerVisible, setHomePickerVisible] = useState(false);
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    api.me().then(setUser).catch(err => console.error('Lỗi lấy thông tin user:', err));
  }, []);

  const getRoleName = (role?: string) => {
    if (role === 'admin') return 'Quản trị viên';
    if (role === 'member') return 'Thành viên';
    if (role === 'guest') return 'Khách';
    return 'Người dùng';
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!oldPassword || !newPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordSuccess('Đổi mật khẩu thành công');
      setTimeout(() => {
        setPasswordModalVisible(false);
        setOldPassword('');
        setNewPassword('');
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Lỗi đổi mật khẩu');
    }
  };

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
          <Text style={styles.name}>{user?.name ?? 'Đang tải...'}</Text>
          <Text style={styles.email}>{user?.email ?? '---'}</Text>
          <Text style={styles.badge}>{getRoleName(user?.role)}</Text>
        </View>
        <Ionicons color={colors.textMuted} name="chevron-forward" size={17} />
      </SurfaceCard>

      <Text style={styles.groupTitle}>CÀI ĐẶT CHUNG</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow 
          icon="home-outline" 
          label="Tên nhà" 
          value={activeHome?.name ?? 'Chưa chọn'} 
          onPress={() => setHomePickerVisible(true)}
        />
        <SettingRow icon="location-outline" label="Vị trí" value={activeHome?.address ?? 'Chưa cập nhật'} />
        <SettingRow icon="language-outline" label="Ngôn ngữ" value="Tiếng Việt" />
      </SurfaceCard>

      <Text style={styles.groupTitle}>THÔNG BÁO</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="notifications-outline" label="Push" onToggle={setPushEnabled} toggle={pushEnabled} />
        <SettingRow icon="warning-outline" label="Cảnh báo" onToggle={setWarningEnabled} toggle={warningEnabled} />
      </SurfaceCard>

      <Text style={styles.groupTitle}>BẢO MẬT & QUẢN TRỊ</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="lock-closed-outline" label="Đổi mật khẩu" onPress={() => setPasswordModalVisible(true)} />
        <SettingRow
          icon="people-outline"
          label="Quản lý người dùng"
          onPress={() => router.push('/admin/users')}
          disabled={user?.role !== 'admin' && activeHomeRole !== 'owner' && activeHomeRole !== 'admin'}
        />
        <SettingRow
          icon="grid-outline"
          label="Quản lý khu vực"
          onPress={() => router.push('/admin/areas')}
          disabled={user?.role !== 'admin' && activeHomeRole !== 'owner' && activeHomeRole !== 'admin'}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Phân quyền"
          onPress={() => router.push('/admin/permissions')}
          disabled={user?.role !== 'admin' && activeHomeRole !== 'owner' && activeHomeRole !== 'admin'}
        />
      </SurfaceCard>

      <Text style={styles.groupTitle}>HỆ THỐNG</Text>
      <SurfaceCard style={styles.group}>
        <SettingRow icon="refresh-outline" label="Cập nhật firmware (Chưa hỗ trợ)" value="v2.4.1" />
        <SettingRow icon="wifi-outline" label="Kết nối Wi-Fi (Chưa hỗ trợ)" value="YoloHome_5G" />
      </SurfaceCard>

      <Pressable 
        onPress={async () => {
          await api.clearAccessToken();
          router.replace('/(auth)/login');
        }} 
        style={styles.logout}
      >
        <Text style={styles.logoutText}>Đăng Xuất</Text>
      </Pressable>
      <Text style={styles.version}>Home Smart Version 0.1.0</Text>

      {/* Modal Chọn Nhà */}
      <Modal visible={isHomePickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn nhà</Text>
            <ScrollView style={styles.modalList}>
              {homes.map((h) => (
                <Pressable 
                  key={h.id} 
                  style={[styles.modalItem, h.id === activeHome?.id && styles.modalItemActive]}
                  onPress={() => {
                    setActiveHome(h);
                    setHomePickerVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, h.id === activeHome?.id && styles.modalItemTextActive]}>
                    {h.name}
                  </Text>
                  {h.id === activeHome?.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalCloseButton} onPress={() => setHomePickerVisible(false)}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Đổi Mật Khẩu */}
      <Modal visible={isPasswordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
            {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}

            <Text style={styles.inputLabel}>Mật khẩu cũ</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.modalCancel]} onPress={() => {
                setPasswordModalVisible(false);
                setOldPassword('');
                setNewPassword('');
                setPasswordError('');
                setPasswordSuccess('');
              }}>
                <Text style={styles.modalCancelText}>Huỷ</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.modalSubmit]} onPress={handleChangePassword}>
                <Text style={styles.modalSubmitText}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  modalList: { maxHeight: 300 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalItemActive: { backgroundColor: colors.primarySoft, borderRadius: 8, borderBottomWidth: 0 },
  modalItemText: { fontSize: 15, color: colors.text },
  modalItemTextActive: { color: colors.primary, fontWeight: '700' },
  modalCloseButton: { marginTop: 20, alignItems: 'center', paddingVertical: 12, borderRadius: 8, backgroundColor: colors.border },
  modalCloseText: { color: colors.text, fontWeight: '600' },
  errorText: { color: colors.danger, marginBottom: 12, fontSize: 13, textAlign: 'center' },
  successText: { color: colors.success, marginBottom: 12, fontSize: 13, textAlign: 'center' },
  inputLabel: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputContainer: { height: 48, borderRadius: 8, backgroundColor: colors.background, paddingHorizontal: 12, justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  textInput: { color: colors.text, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalButton: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalCancel: { backgroundColor: colors.border },
  modalSubmit: { backgroundColor: colors.primary },
  modalCancelText: { color: colors.text, fontWeight: '600' },
  modalSubmitText: { color: colors.surface, fontWeight: '600' },
});
