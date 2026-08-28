import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { HomeProvider } from '@/src/context/HomeContext';

export default function TabsLayout() {
  return (
    <HomeProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <AppTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
        <Tabs.Screen name="devices" options={{ title: 'Thiết bị' }} />
        <Tabs.Screen name="automations" options={{ title: 'Tự động' }} />
        <Tabs.Screen name="alerts" options={{ title: 'Thông báo' }} />
        <Tabs.Screen name="settings" options={{ title: 'Cài đặt' }} />
      </Tabs>
    </HomeProvider>
  );
}
