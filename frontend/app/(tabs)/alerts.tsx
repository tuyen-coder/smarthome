import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAlerts } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { AlertSeverity } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const severity: Record<AlertSeverity, { icon: IconName; color: string; soft: string }> = {
  info: { icon: 'shield-checkmark', color: colors.primary, soft: colors.primarySoft },
  warning: { icon: 'flash', color: colors.warning, soft: colors.warningSoft },
  critical: { icon: 'warning', color: colors.danger, soft: colors.dangerSoft },
};

import { realtime } from '@/src/services/realtime';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = () => {
    setIsLoading(true);
    api.alerts()
      .then(setAlerts)
      .catch((err) => console.error('[Alerts] Fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
    
    realtime.connect();
    const unsubscribe = realtime.subscribe((payload) => {
      if (payload.type === 'new_alert') {
        // Có thông báo mới thì tải lại danh sách
        fetchAlerts();
      }
    });
    
    return () => unsubscribe();
  }, []);

  const markAll = async () => {
    setAlerts((items) => items.map((item) => ({ ...item, is_read: true })));
    await api.markAllAlertsRead().catch(() => {
      // Revert if error
      fetchAlerts();
    });
  };

  return (
    <AppScreen>
      <AppHeader />

      <View style={styles.energyHeader}>
        <View>
          <Text style={styles.overline}>THỐNG KÊ</Text>
          <Text style={styles.energyTitle}>Năng lượng tiêu thụ</Text>
        </View>
        <View style={styles.energyValueWrap}>
          <Text style={styles.energyValue}>42.8<Text style={styles.energyUnit}> kWh</Text></Text>
          <Text style={styles.energyChange}>-12% so với tuần trước</Text>
        </View>
      </View>

      <SurfaceCard style={styles.chart}>
        <View style={styles.chartCaption}>
          <Text style={styles.chartText}>Tuần này</Text>
          <Text style={styles.chartText}>T2 - CN</Text>
        </View>
        <View style={styles.bars}>
          {[28, 38, 66, 62, 48, 76, 104].map((height, index) => (
            <View key={index} style={styles.barColumn}>
              <View style={[styles.bar, { height }]} />
              <Text style={[styles.day, index === 6 && styles.activeDay]}>
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lịch sử & Thông báo</Text>
        <Pressable onPress={markAll}><Text style={styles.markAll}>Đã đọc tất cả</Text></Pressable>
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : alerts.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
          </SurfaceCard>
        ) : (
          alerts.map((alert) => {
            const appearance = severity[alert.severity as AlertSeverity] ?? severity.info;
            const timeStr = alert.created_at
              ? new Date(alert.created_at).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '';
            return (
              <Pressable
                key={alert.id}
                onPress={() =>
                  router.push({
                    pathname: '/alerts/[id]',
                    params: { id: String(alert.id) },
                  })
                }
                style={[styles.alert, { backgroundColor: appearance.soft }, alert.is_read && styles.read]}>
                <View style={[styles.alertIcon, { backgroundColor: colors.surface }]}>
                  <Ionicons color={appearance.color} name={appearance.icon} size={20} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.alertTitle, { color: appearance.color }]}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <View style={styles.alertMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.alertTime}>{timeStr}</Text>
                    {alert.user_name ? (
                      <>
                        <Ionicons name="person-outline" size={12} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={styles.alertUser}>{alert.user_name}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                {!alert.is_read ? <View style={styles.unread} /> : null}
              </Pressable>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  energyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  overline: { color: colors.textMuted, fontSize: 11, letterSpacing: 1.2 },
  energyTitle: { width: 190, marginTop: 6, color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  energyValueWrap: { alignItems: 'flex-end' },
  energyValue: { color: colors.primary, fontSize: 23, fontWeight: '700' },
  energyUnit: { fontSize: 12 },
  energyChange: { maxWidth: 110, color: colors.success, fontSize: 11, textAlign: 'right' },
  chart: { height: 240, marginTop: 18 },
  chartCaption: { flexDirection: 'row', justifyContent: 'space-between' },
  chartText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18 },
  barColumn: { height: 165, flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 20, borderRadius: 10, backgroundColor: colors.primarySoft, borderTopWidth: 3, borderColor: colors.primary },
  day: { marginTop: 10, color: colors.textMuted, fontSize: 11 },
  activeDay: { color: colors.primary, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 21, fontWeight: '700' },
  markAll: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  list: { gap: 12 },
  alert: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 28 },
  read: { backgroundColor: colors.surfaceMuted },
  alertIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertMessage: { marginTop: 4, color: colors.text, fontSize: 14, lineHeight: 19 },
  alertMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  alertTime: { color: colors.textMuted, fontSize: 11 },
  alertUser: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  unread: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  loadingContainer: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 8, color: colors.textMuted, fontSize: 14 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
