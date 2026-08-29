import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';

import { colors } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import type { Device } from '@/src/types/domain';

type DeviceSelectorModalProps = {
  visible: boolean;
  homeId: number;
  onClose: () => void;
  onSelect: (device: Device) => void;
  selectedIds: number[];
};

export function DeviceSelectorModal({ visible, homeId, onClose, onSelect, selectedIds }: DeviceSelectorModalProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && homeId) {
      loadDevices();
    }
  }, [visible, homeId]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const data = await api.devices(homeId);
      // Lọc bỏ các thiết bị là cảm biến (sensor) vì không thể điều khiển (bật/tắt) cảm biến
      const actuators = data.filter(d => d.category !== 'sensor');
      setDevices(actuators);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn thiết bị</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {isLoading ? (
            <Text style={styles.loadingText}>Đang tải thiết bị...</Text>
          ) : (
            <ScrollView style={styles.list}>
              {devices.length === 0 ? (
                <Text style={styles.emptyText}>Không tìm thấy thiết bị nào.</Text>
              ) : (
                devices.map((device) => {
                  const isSelected = selectedIds.includes(device.id);
                  return (
                    <Pressable
                      key={device.id}
                      style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
                      onPress={() => {
                        if (!isSelected) {
                          onSelect(device);
                          onClose();
                        }
                      }}>
                      <View style={[styles.iconWrap, isSelected && { backgroundColor: colors.primary }]}>
                        <Ionicons 
                          name={device.type === 'light' ? 'bulb-outline' : 'hardware-chip-outline'} 
                          size={24} 
                          color={isSelected ? colors.surface : colors.primary} 
                        />
                      </View>
                      <View style={styles.flex}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceType}>{device.type}</Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 4 },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: 20 },
  list: { marginBottom: 20 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.background, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  deviceItemSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  deviceName: { fontSize: 16, fontWeight: '700', color: colors.text },
  deviceType: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
