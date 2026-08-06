import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="devices" options={{ title: 'Thiết bị' }} />
      <Tabs.Screen name="automations" options={{ title: 'Tự động' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Thống kê' }} />
      <Tabs.Screen name="profile" options={{ title: 'Cài đặt' }} />
    </Tabs>
  );
}
