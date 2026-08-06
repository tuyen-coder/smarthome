import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAutomations } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

export default function AutomationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const automation = useMemo(
    () => demoAutomations.find((item) => item.id === Number(id)) ?? demoAutomations[0],
    [id],
  );
  const [enabled, setEnabled] = useState(automation.enabled);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    await api.toggleAutomation(automation.id, value).catch(() => undefined);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết tự động hóa</Text>
      </View>

      <SurfaceCard style={styles.titleCard}>
        <View style={styles.icon}><Ionicons color={colors.primary} name="timer-outline" size={28} /></View>
        <View style={styles.flex}>
          <Text style={styles.title}>{automation.name}</Text>
          <Text style={styles.status}>{enabled ? 'Đang hoạt động' : 'Đang tắt'}</Text>
        </View>
        <Switch
          ios_backgroundColor={colors.borderStrong}
          onValueChange={toggle}
          thumbColor={colors.surface}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          value={enabled}
        />
      </SurfaceCard>

      <Text style={styles.sectionTitle}>KHI</Text>
      <SurfaceCard>
        <View style={styles.ruleRow}>
          <Ionicons color={colors.primary} name="git-branch-outline" size={24} />
          <View style={styles.flex}>
            <Text style={styles.ruleTitle}>Điều kiện kích hoạt</Text>
            <Text style={styles.json}>{JSON.stringify(automation.trigger, null, 2)}</Text>
          </View>
        </View>
      </SurfaceCard>

      <Text style={styles.sectionTitle}>THÌ</Text>
      <SurfaceCard>
        <View style={styles.ruleRow}>
          <Ionicons color={colors.success} name="flash-outline" size={24} />
          <View style={styles.flex}>
            <Text style={styles.ruleTitle}>Hành động</Text>
            <Text style={styles.json}>{JSON.stringify(automation.action, null, 2)}</Text>
          </View>
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  titleCard: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 18 },
  icon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  status: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
  sectionTitle: { marginTop: 30, marginBottom: 10, marginLeft: 6, color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  ruleRow: { flexDirection: 'row', gap: 14 },
  ruleTitle: { color: colors.text, fontWeight: '700' },
  json: { marginTop: 7, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
});
