import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/src/theme/colors';

export default function RootLayout() {
  return (
    <>
      <StatusBar backgroundColor={colors.background} style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
