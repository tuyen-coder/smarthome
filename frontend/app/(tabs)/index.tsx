import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';

import { api } from '@/src/services/api';
import { realtime } from '@/src/services/realtime';
import { colors } from '@/src/theme/colors';
import { useHome } from '@/src/context/HomeContext';
import type { Area, DashboardSummary, Device } from '@/src/types/domain';

type IconName = ComponentProps<typeof Ionicons>['name'];

const roomIcons: IconName[] = ['tv-outline', 'bed-outline', 'restaurant-outline', 'flower-outline'];

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: IconName;
  value: string;
  label: string;
}) {
  return (
    <SurfaceCard style={styles.metricCard}>
      <Ionicons color={colors.primary} name={icon} size={21} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </SurfaceCard>
  );
}

export default function DashboardScreen() {
  const { activeHome, isLoading: homeLoading } = useHome();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tải dữ liệu ban đầu từ API
  const fetchData = async () => {
    if (!activeHome) return;
    try {
      setIsLoading(true);
      const [nextSummary, nextAreas] = await Promise.all([
        api.dashboard(activeHome.id),
        api.areas(activeHome.id),
      ]);
      setSummary(nextSummary);
      setAreas(nextAreas);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (!homeLoading) {
      fetchData();
    }

    // Kết nối WebSocket & lắng nghe sự kiện
    realtime.connect();

    const unsubscribe = realtime.subscribe((payload) => {
      if (payload.type === 'DEVICE_UPDATE') {
        const feedKey = payload.feed_key as string | undefined;
        const val = payload.value;

        const numericVal = typeof val === 'number' ? val : parseFloat(String(val));

        setSummary((prev) => {
          if (!prev) return prev;
          const next = { ...prev };

          if (feedKey === 'bbc-temp' || feedKey === 'temperature') {
            if (!isNaN(numericVal)) next.temperature = numericVal;
          } else if (feedKey === 'bbc-humi' || feedKey === 'humidity') {
            if (!isNaN(numericVal)) next.humidity = numericVal;
          } else {
            // Khi có trạng thái thiết bị bật/tắt thay đổi, fetch lại để cập nhật active_devices
            fetchData();
            return prev;
          }

          return next;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeHome, homeLoading]);

  if (homeLoading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!activeHome) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.errorText, { color: colors.danger, textAlign: 'center' }]}>Không tìm thấy nhà. Vui lòng tạo nhà mới.</Text>
      </View>
    );
  }

  return (
    <AppScreen>
      <AppHeader />
      <View style={styles.metrics}>
        <MetricCard
          icon="thermometer-outline"
          label="Nhiệt độ"
          value={summary?.temperature !== undefined ? `${summary.temperature}°C` : '--°C'}
        />
            <MetricCard
              icon="water-outline"
              label="Độ ẩm"
              value={summary?.humidity !== undefined ? `${summary.humidity}%` : '--%'}
            />
            <MetricCard
              icon="bulb-outline"
              label="Đèn đang bật"
              value={`${summary?.active_devices ?? 0}/${summary?.online_devices ?? 0}`}
            />
            <MetricCard icon="flash-outline" label="Điện năng" value="2.4kW" />
          </View>

          <View style={styles.status}>
            <View style={styles.statusIcon}>
              <Ionicons color={colors.surface} name="checkmark-circle-outline" size={24} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.statusTitle}>Hệ thống hoạt động bình thường</Text>
              <Text style={styles.statusText}>Tất cả thiết bị đang kết nối</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phòng & Thiết bị</Text>
            <Pressable onPress={() => router.push('/(tabs)/devices')}>
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </Pressable>
          </View>

          <View style={styles.rooms}>
            {areas.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <Text style={styles.emptyText}>Chưa có phòng nào được tạo</Text>
              </SurfaceCard>
            ) : (
              areas.slice(0, 4).map((area, index) => (
                <Pressable
                  key={area.id}
                  onPress={() => router.push('/(tabs)/devices')}
                  style={({ pressed }) => [styles.room, pressed && styles.pressed]}>
                  <View style={styles.roomIcon}>
                    <Ionicons
                      color={colors.primary}
                      name={roomIcons[index % roomIcons.length]}
                      size={22}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.roomName}>{area.name}</Text>
                    <Text style={styles.roomDescription}>{area.description ?? 'Sẵn sàng'}</Text>
                  </View>
                  <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
                </Pressable>
              ))
            )}
          </View>

          <SurfaceCard style={styles.homeCard}>
            <View style={styles.homeIllustration}>
              <Ionicons color={colors.primary} name="home-outline" size={58} />
            </View>
            <View>
              <Text style={styles.homeTitle}>Ngôi nhà của bạn</Text>
              <Text style={styles.homeText}>Không gian sống kết nối, an toàn và thoải mái.</Text>
            </View>
          </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metricCard: { width: '47.8%', minHeight: 108, padding: 16 },
  metricValue: { marginTop: 4, color: colors.text, fontSize: 18, fontWeight: '700' },
  metricLabel: { marginTop: 2, color: colors.textMuted, fontSize: 14 },
  errorText: { marginTop: 12, color: colors.danger, fontSize: 14, textAlign: 'center' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
    padding: 16,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  statusTitle: { color: colors.primaryPressed, fontWeight: '700' },
  statusText: { marginTop: 3, color: colors.primary, fontSize: 13 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  seeAll: { color: colors.primary, fontSize: 14 },
  rooms: { gap: 12 },
  emptyCard: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  room: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.72 },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  roomName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  roomDescription: { marginTop: 3, color: colors.textMuted, fontSize: 13 },
  homeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    backgroundColor: colors.primarySoft,
  },
  homeIllustration: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  homeTitle: { color: colors.primaryPressed, fontSize: 17, fontWeight: '700' },
  homeText: { maxWidth: 190, marginTop: 5, color: colors.textMuted, lineHeight: 19 },
});