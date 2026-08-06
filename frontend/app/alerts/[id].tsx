import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAlerts } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alert = useMemo(
    () => demoAlerts.find((item) => item.id === Number(id)) ?? demoAlerts[0],
    [id],
  );
  const [resolved, setResolved] = useState(alert.is_resolved);

  const resolve = async () => {
    await api.updateAlert(alert.id, 'resolve').catch(() => undefined);
    setResolved(true);
  };

  const danger = alert.severity === 'critical';

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
      </View>

      <View style={[styles.heroIcon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Ionicons
          color={danger ? colors.danger : colors.primary}
          name={danger ? 'warning' : 'shield-checkmark'}
          size={42}
        />
      </View>
      <Text style={styles.title}>{alert.title}</Text>
      <Text style={styles.message}>{alert.message}</Text>

      <SurfaceCard style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mức độ</Text>
          <Text style={[styles.infoValue, { color: danger ? colors.danger : colors.primary }]}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Trạng thái</Text>
          <Text style={styles.infoValue}>{resolved ? 'Đã xử lý' : 'Cần kiểm tra'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Thời gian</Text>
          <Text style={styles.infoValue}>{new Date(alert.created_at).toLocaleString('vi-VN')}</Text>
        </View>
      </SurfaceCard>

      <Pressable disabled={resolved} onPress={resolve} style={[styles.resolve, resolved && styles.disabled]}>
        <Ionicons color={colors.surface} name="checkmark-circle-outline" size={21} />
        <Text style={styles.resolveText}>{resolved ? 'Đã xử lý' : 'Đánh dấu đã xử lý'}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.primary, fontSize: 21, fontWeight: '700' },
  heroIcon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 40 },
  title: { marginTop: 22, color: colors.text, fontSize: 27, fontWeight: '700', textAlign: 'center' },
  message: { marginTop: 10, color: colors.textMuted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  info: { marginTop: 34 },
  infoRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  infoLabel: { color: colors.textMuted },
  infoValue: { color: colors.text, fontWeight: '600' },
  resolve: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, borderRadius: 28, backgroundColor: colors.primary },
  resolveText: { color: colors.surface, fontWeight: '700' },
  disabled: { backgroundColor: colors.success },
});
