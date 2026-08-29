import { Tabs, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { useHome } from '@/src/context/HomeContext';
import { colors } from '@/src/theme/colors';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';

export default function TabsLayout() {
  const { homes, isLoading } = useHome();

  const handleLogout = async () => {
    await api.clearAccessToken();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (homes.length === 0) {
    return (
      <View style={styles.center}>
        <SurfaceCard style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="home-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Chưa có ngôi nhà nào</Text>
          <Text style={styles.subtitle}>
            Bạn hiện chưa được thêm vào ngôi nhà nào. Vui lòng yêu cầu quản trị viên mời bạn vào nhà, hoặc tạo một ngôi nhà mới.
          </Text>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutBtnText}>Quay lại Đăng nhập</Text>
          </Pressable>
        </SurfaceCard>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="devices" options={{ title: 'Thiết bị' }} />
      <Tabs.Screen name="automations" options={{ title: 'Tự động' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Thông báo' }} />
      <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
    width: '100%',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
});
