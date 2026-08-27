import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/src/theme/colors';
import { realtime } from '@/src/services/realtime';
import { initAccessToken } from '@/src/services/api';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initAccessToken();
        realtime.connect();
      } catch (e) {
        console.error('[RootLayout] Init error:', e);
      } finally {
        setIsReady(true);
      }
    }

    prepareApp();

    return () => {
      realtime.disconnect();
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar backgroundColor={colors.background} style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}