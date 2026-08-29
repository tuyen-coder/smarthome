import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';

import { SurfaceCard } from '@/components/common/SurfaceCard';
import { DeviceSelectorModal } from './DeviceSelectorModal';
import { useHome } from '@/src/context/HomeContext';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { Device } from '@/src/types/domain';

export function SceneTemplate({ automationId }: { automationId?: number }) {
  const { activeHome } = useHome();
  const [name, setName] = useState('Chế độ Đi ngủ');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!automationId);
  const [devices, setDevices] = useState<{id: number, name: string, is_on: boolean}[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  useEffect(() => {
    if (automationId && activeHome) {
      Promise.all([
        api.getAutomation(automationId),
        api.devices(activeHome.id)
      ]).then(([data, allDevices]) => {
        setName(data.name);
        if (data.action?.devices && Array.isArray(data.action.devices)) {
          const mappedDevices = data.action.devices.map((d: any) => {
            const found = allDevices.find(dev => dev.id === d.id);
            return {
              id: d.id,
              name: found ? found.name : (d.name || `Thiết bị #${d.id}`),
              is_on: d.is_on
            };
          });
          setDevices(mappedDevices);
        }
        setIsLoading(false);
      }).catch(err => {
        console.error(err);
        setIsLoading(false);
      });
    } else if (!automationId) {
       setIsLoading(false);
    }
  }, [automationId, activeHome]);

  const toggleDeviceState = (id: number) => {
    setDevices(devices.map((d) => (d.id === id ? { ...d, is_on: !d.is_on } : d)));
  };

  const handleAddDevice = (device: Device) => {
    setDevices([...devices, { id: device.id, name: device.name, is_on: true }]);
  };

  const handleSave = async () => {
    if (!activeHome) return;
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên kịch bản');
      return;
    }
    if (devices.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một thiết bị');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        home_id: activeHome.id,
        name: name.trim(),
        enabled: true,
        trigger: { type: 'scene' },
        action: { devices: devices.map(d => ({ id: d.id, name: d.name, is_on: d.is_on })) }
      };

      if (automationId) {
        await api.updateAutomationFull(automationId, payload);
      } else {
        await api.createAutomation(payload);
      }
      
      Alert.alert('Thành công', 'Đã lưu kịch bản thành công!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể lưu kịch bản');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.nameSection}>
        <Text style={styles.sectionLabel}>TÊN NGỮ CẢNH</Text>
        <SurfaceCard style={styles.nameInputCard}>
          <TextInput
            onChangeText={setName}
            placeholder="Nhập tên ngữ cảnh..."
            placeholderTextColor={colors.textMuted}
            style={styles.nameInput}
            value={name}
          />
        </SurfaceCard>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>KÍCH HOẠT (KHI)</Text>
      </View>

      <SurfaceCard style={styles.sceneCard}>
        <View style={styles.sceneIconWrap}>
          <Ionicons color={colors.surface} name="color-palette-outline" size={32} />
        </View>
        <Text style={styles.sceneTitle}>Thủ công</Text>
        <Text style={styles.sceneDesc}>Kịch bản này chỉ chạy khi bạn tự tay bấm nút kích hoạt.</Text>
      </SurfaceCard>

      <View style={styles.connector}>
        <View style={styles.connectorLine} />
        <Ionicons color={colors.borderStrong} name="arrow-down" size={16} style={styles.connectorIcon} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>HÀNH ĐỘNG (THÌ)</Text>
        <Pressable style={styles.addButton} onPress={() => setShowDeviceSelector(true)}>
          <Ionicons color={colors.primary} name="add" size={16} />
          <Text style={styles.addButtonText}>Thêm thiết bị</Text>
        </Pressable>
      </View>

      {devices.length === 0 && (
        <SurfaceCard style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Chưa có thiết bị nào</Text>
        </SurfaceCard>
      )}

      {devices.map((device) => (
        <SurfaceCard key={device.id} style={styles.deviceCard}>
          <View style={styles.deviceIcon}>
            <Ionicons
              color={device.is_on ? colors.primary : colors.textMuted}
              name="bulb-outline"
              size={24}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.deviceName}>{device.name}</Text>
          </View>
          <Pressable
            onPress={() => toggleDeviceState(device.id)}
            style={[
              styles.stateToggle,
              { backgroundColor: device.is_on ? colors.success + '20' : colors.danger + '20' },
            ]}>
            <Text style={[styles.stateToggleText, { color: device.is_on ? colors.success : colors.danger }]}>
              {device.is_on ? 'Bật' : 'Tắt'}
            </Text>
          </Pressable>
          <Pressable onPress={() => setDevices(devices.filter(d => d.id !== device.id))} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        </SurfaceCard>
      ))}

      <View style={styles.footerActions}>
        <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.primaryBtnText}>Lưu kịch bản</Text>
          )}
        </Pressable>
      </View>
      
      {activeHome && (
        <DeviceSelectorModal
          visible={showDeviceSelector}
          homeId={activeHome.id}
          onClose={() => setShowDeviceSelector(false)}
          onSelect={handleAddDevice}
          selectedIds={devices.map(d => d.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  nameSection: { marginBottom: 30 },
  nameInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text, height: 40 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  sceneCard: { padding: 30, borderRadius: 24, borderWidth: 1, borderColor: colors.success + '40', backgroundColor: colors.success + '08', alignItems: 'center' },
  sceneIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  sceneTitle: { fontSize: 22, fontWeight: '800', color: colors.success, marginBottom: 8 },
  sceneDesc: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  connector: { alignItems: 'center', height: 40, marginVertical: 8 },
  connectorLine: { width: 2, flex: 1, backgroundColor: colors.borderStrong },
  connectorIcon: { position: 'absolute', bottom: -8, backgroundColor: colors.background },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderRadius: 20,
    marginBottom: 12,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  stateToggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  stateToggleText: { fontSize: 14, fontWeight: '800' },
  footerActions: { marginTop: 40 },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: colors.surface, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});
