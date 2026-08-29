import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import { AppHeader } from '@/components/common/AppHeader';
import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { useHome } from '@/src/context/HomeContext';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { Automation } from '@/src/types/domain';

function describe(automation: Automation) {
  if (automation.trigger.type === 'time') return 'Mỗi ngày lúc ' + automation.trigger.value;
  if (automation.trigger.type === 'scene') return 'Kích hoạt thủ công';
  if (automation.trigger.metric === 'temperature') {
    return `Khi nhiệt độ ${automation.trigger.operator === '>' ? 'lớn hơn' : automation.trigger.operator === '<' ? 'nhỏ hơn' : 'bằng'} ${automation.trigger.value}°C`;
  }
  return 'Điều kiện tùy chỉnh';
}

function getIcon(automation: Automation) {
  if (automation.trigger.type === 'time') return 'time-outline';
  if (automation.trigger.type === 'scene') return 'color-palette-outline';
  if (automation.trigger.metric) return 'thermometer-outline';
  return 'git-branch-outline';
}

export default function AutomationsScreen() {
  const { activeHome, activeHomeRole, isLoading: homeLoading } = useHome();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  const hasPermission = activeHomeRole === 'owner' || activeHomeRole === 'admin';

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

  useFocusEffect(
    useCallback(() => {
      if (!homeLoading) {
        fetchAutomations();
      }
    }, [activeHome, homeLoading])
  );

  const toggle = async (automation: Automation) => {
    if (!hasPermission) return;
    const enabled = !automation.enabled;
    setAutomations((items) =>
      items.map((item) => (item.id === automation.id ? { ...item, enabled } : item)),
    );
    await api.toggleAutomation(automation.id, enabled).catch(() => {
      setAutomations((items) =>
        items.map((item) => (item.id === automation.id ? { ...item, enabled: !enabled } : item)),
      );
    });
  };

  const handleDelete = (automation: Automation) => {
    if (!hasPermission) return;
    Alert.alert('Xóa kịch bản', `Bạn có chắc muốn xóa "${automation.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAutomation(automation.id);
            setAutomations(items => items.filter(i => i.id !== automation.id));
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể xóa kịch bản');
          }
        }
      }
    ]);
  };

  const handleSelectTemplate = (type: string) => {
    setShowTemplateModal(false);
    router.push({
      pathname: '/automations/[id]',
      params: { id: 'new', template: type },
    });
  };

  const runScene = (automation: Automation) => {
    if (!hasPermission) return;
    Alert.alert(
      'Kích hoạt kịch bản',
      `Bạn có muốn thực hiện kịch bản "${automation.name}" ngay bây giờ không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Thực hiện', 
          style: 'default', 
          onPress: async () => {
            try {
              await api.executeAutomation(automation.id);
              Alert.alert('Thành công', 'Kịch bản đã được kích hoạt!');
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể kích hoạt kịch bản');
            }
          } 
        }
      ]
    );
  };

  return (
    <AppScreen>
      <AppHeader />
      
      {!hasPermission && !homeLoading && (
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionCard}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.danger} />
            <Text style={styles.permissionTitle}>Không có quyền truy cập</Text>
            <Text style={styles.permissionText}>
              Chỉ Chủ nhà (Owner) hoặc Quản trị viên (Admin) mới có quyền sử dụng và thiết lập kịch bản tự động hóa.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Tự động hóa</Text>
          <Text style={styles.subtitle}>Thiết lập kịch bản thông minh cho ngôi nhà.</Text>
        </View>
        <Pressable 
          onPress={() => hasPermission && setShowTemplateModal(true)} 
          style={[styles.addButton, !hasPermission && styles.disabledButton]}
        >
          <Ionicons color={colors.surface} name="add" size={25} />
        </Pressable>
      </View>

      <SurfaceCard style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Ionicons color={colors.primary} name="timer-outline" size={28} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.summaryTitle}>Kịch bản đang hoạt động</Text>
          <Text style={styles.summaryText}>
            {automations.filter((item) => item.enabled).length} trong {automations.length} quy tắc đã bật
          </Text>
        </View>
      </SurfaceCard>

      <Text style={styles.sectionTitle}>Kịch bản của bạn</Text>
      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.loadingText}>Đang tải kịch bản...</Text>
          </View>
        ) : automations.length === 0 ? (
          <SurfaceCard style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có kịch bản nào. Bấm [+] để thêm.</Text>
          </SurfaceCard>
        ) : (
          automations.map((automation) => {
            const isScene = automation.trigger.type === 'scene';
            
            return (
              <Pressable
                key={automation.id}
                onPress={() =>
                  hasPermission &&
                  router.push({
                    pathname: '/automations/[id]',
                    params: { id: String(automation.id), template: isScene ? 'scene' : (automation.trigger.type === 'time' ? 'time' : 'sensor') },
                  })
                }>
                <SurfaceCard style={styles.card}>
                  <View style={[styles.ruleIcon, automation.enabled && styles.ruleIconEnabled]}>
                    <Ionicons
                      color={automation.enabled ? colors.primary : colors.textMuted}
                      name={getIcon(automation)}
                      size={23}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.ruleName}>{automation.name}</Text>
                    <Text style={styles.ruleDescription}>{describe(automation)}</Text>
                  </View>
                  
                  <View style={styles.actionsGroup}>
                    {isScene ? (
                      <Pressable onPress={() => hasPermission && runScene(automation)} style={[styles.runButton, !hasPermission && styles.disabledButton]}>
                        <Ionicons name="play" size={14} color={colors.surface} />
                        <Text style={styles.runButtonText}>Chạy</Text>
                      </Pressable>
                    ) : (
                      <Switch
                        disabled={!hasPermission}
                        ios_backgroundColor={colors.borderStrong}
                        onValueChange={() => toggle(automation)}
                        thumbColor={colors.surface}
                        trackColor={{ false: colors.borderStrong, true: colors.primary }}
                        value={automation.enabled}
                      />
                    )}
                    <Pressable onPress={() => hasPermission && handleDelete(automation)} style={[styles.deleteButton, !hasPermission && { opacity: 0.5 }]}>
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Template Selection Modal */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn kịch bản mẫu</Text>
              <Pressable onPress={() => setShowTemplateModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <TouchableOpacity style={styles.templateCard} onPress={() => handleSelectTemplate('time')}>
              <View style={[styles.templateIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="time-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.templateName}>Hẹn giờ thiết bị</Text>
                <Text style={styles.templateDesc}>Bật/tắt thiết bị vào một thời điểm cụ thể hằng ngày</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.templateCard} onPress={() => handleSelectTemplate('sensor')}>
              <View style={[styles.templateIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="thermometer-outline" size={26} color={colors.danger} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.templateName}>Theo cảm biến môi trường</Text>
                <Text style={styles.templateDesc}>Kích hoạt khi nhiệt độ hoặc độ ẩm đạt mức chỉ định</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.templateCard} onPress={() => handleSelectTemplate('scene')}>
              <View style={[styles.templateIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="color-palette-outline" size={26} color={colors.success} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.templateName}>Ngữ cảnh một chạm</Text>
                <Text style={styles.templateDesc}>Điều khiển nhiều thiết bị cùng lúc bằng một nút bấm</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  subtitle: { maxWidth: 260, marginTop: 4, color: colors.textMuted, lineHeight: 20 },
  addButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 24, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryLight },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  summaryTitle: { color: colors.primaryPressed, fontWeight: '700', fontSize: 16 },
  summaryText: { marginTop: 3, color: colors.primary, fontSize: 14 },
  sectionTitle: { marginTop: 30, marginBottom: 14, color: colors.text, fontSize: 20, fontWeight: '700' },
  list: { gap: 14, paddingBottom: 40 },
  card: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  ruleIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  ruleIconEnabled: { backgroundColor: colors.primarySoft },
  ruleName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  ruleDescription: { marginTop: 4, color: colors.textMuted, fontSize: 13 },
  actionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  runButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, gap: 4, shadowColor: colors.success, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  runButtonText: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  deleteButton: { padding: 6 },
  loadingContainer: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 8, color: colors.textMuted, fontSize: 14 },
  emptyCard: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  closeBtn: { padding: 4 },
  templateCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  templateIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  templateName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  templateDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  permissionOverlay: { position: 'absolute', top: 120, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionCard: { backgroundColor: colors.surface, padding: 32, borderRadius: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: colors.border },
  permissionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 16, marginBottom: 12, textAlign: 'center' },
  permissionText: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  disabledButton: { opacity: 0.5, backgroundColor: colors.surfaceMuted },
});
