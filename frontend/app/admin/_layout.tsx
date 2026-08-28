import { Stack } from 'expo-router';
import { HomeProvider } from '@/src/context/HomeContext';

export default function AdminLayout() {
  return (
    <HomeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </HomeProvider>
  );
}
