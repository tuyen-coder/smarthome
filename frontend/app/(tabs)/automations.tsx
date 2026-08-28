import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { useHome } from '@/src/context/HomeContext';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { Automation } from '@/src/types/domain';

function describe(automation: Automation) {
  if (automation.trigger.type === 'time') return 'Mỗi ngày lúc ' + automation.trigger.value;
  if (automation.trigger.type === 'presence') return 'Khi mọi người rời nhà';
  if (automation.trigger.metric === 'temperature') {
    return 'Khi nhiệt độ lớn hơn ' + automation.trigger.value + '°C';
  }
  return 'Điều kiện tùy chỉnh';
}

export default function AutomationsScreen() {
  const { activeHome, isLoading: homeLoading } = useHome();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAutomations = async () => {
    if (!activeHome) return;
    try {
      setIsLoading(true);
      const data = await api.automations(activeHome.id);
      setAutomations(data);
    } catch (err) {
      console.error('[Automations] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!homeLoading) {
      fetchAutomations();
    }
  }, [activeHome, homeLoading]);

  const toggle = async (automation: Automation) => {
    const enabled = !automation.enabled;
    setAutomations((items) =>
      items.map((item) => (item.id === automation.id ? { ...item, enabled } : item)),
    );
    await api.toggleAutomation(automation.id, enabled).catch(() => {
      // Revert if error
      setAutomations((items) =>
        items.map((item) => (item.id === automation.id ? { ...item, enabled: !enabled } : item)),
      );
    });
  };

  return (
    <AppScreen>
      <AppHeader />
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Tự động hóa</Text>
          <Text style={styles.subtitle}>Thiết lập quy tắc IF–THEN cho ngôi nhà.</Text>
        </View>
        <Pressable style={styles.addButton}>
          <Ionicons color={colors.surface} name="add" size={25} />
        </Pressable>
      </View>

      <SurfaceCard style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons color={colors.primary} name="timer-outline" size={28} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.summaryTitle}>Lịch đang hoạt động</Text>
          <Text style={styles.summaryText}>
            {automations.filter((item) => item.enabled).length} trong {automations.length} quy tắc đã bật
          </Text>
        </View>
      </SurfaceCard>

      <Text style={styles.sectionTitle}>Quy tắc của bạn</Text>
      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Đang tải quy tắc...</Text>
          </View>
        ) : automations.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có quy tắc tự động hóa nào</Text>
          </SurfaceCard>
        ) : (
          automations.map((automation) => (
            <Pressable
              key={automation.id}
              onPress={() =>
                router.push({
                  pathname: '/automations/[id]',
                  params: { id: String(automation.id) },
                })
              }>
              <SurfaceCard style={styles.card}>
                <View style={[styles.ruleIcon, automation.enabled && styles.ruleIconEnabled]}>
                  <Ionicons
                    color={automation.enabled ? colors.primary : colors.textMuted}
                    name={automation.trigger.type === 'time' ? 'time-outline' : 'git-branch-outline'}
                    size={23}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.ruleName}>{automation.name}</Text>
                  <Text style={styles.ruleDescription}>{describe(automation)}</Text>
                </View>
                <Switch
                  ios_backgroundColor={colors.borderStrong}
                  onValueChange={() => toggle(automation)}
                  thumbColor={colors.surface}
                  trackColor={{ false: colors.borderStrong, true: colors.primary }}
                  value={automation.enabled}
                />
              </SurfaceCard>
            </Pressable>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  subtitle: { maxWidth: 260, marginTop: 4, color: colors.textMuted, lineHeight: 20 },
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, backgroundColor: colors.primarySoft },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  summaryTitle: { color: colors.primaryPressed, fontWeight: '700' },
  summaryText: { marginTop: 3, color: colors.primary, fontSize: 13 },
  sectionTitle: { marginTop: 30, marginBottom: 14, color: colors.text, fontSize: 20, fontWeight: '700' },
  list: { gap: 14 },
  card: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ruleIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  ruleIconEnabled: { backgroundColor: colors.primarySoft },
  ruleName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  ruleDescription: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  loadingContainer: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 8, color: colors.textMuted, fontSize: 14 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
