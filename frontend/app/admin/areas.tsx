import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { demoAreas } from '@/src/data/demo';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

export default function AreasScreen() {
  const [areas, setAreas] = useState(demoAreas);
  const [name, setName] = useState('');

  const addArea = async () => {
    if (!name.trim()) return;
    const fallback = {
      id: Date.now(),
      name: name.trim(),
      description: 'Khu vực mới',
      created_at: new Date().toISOString(),
    };
    const area = await api.createArea({ name: name.trim() }).catch(() => fallback);
    setAreas((items) => [...items, area]);
    setName('');
  };

  const removeArea = async (areaId: number) => {
    setAreas((items) => items.filter((item) => item.id !== areaId));
    await api.deleteArea(areaId).catch(() => undefined);
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Quản lý khu vực</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          onChangeText={setName}
          onSubmitEditing={addArea}
          placeholder="Tên khu vực mới"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={name}
        />
        <Pressable onPress={addArea} style={styles.addButton}>
          <Ionicons color={colors.surface} name="add" size={25} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>KHU VỰC TRONG NHÀ</Text>
      <View style={styles.list}>
        {areas.map((area, index) => (
          <SurfaceCard key={area.id} style={styles.card}>
            <View style={styles.icon}>
              <Ionicons
                color={colors.primary}
                name={['tv-outline', 'bed-outline', 'restaurant-outline', 'lock-closed-outline'][index] as never}
                size={23}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{area.name}</Text>
              <Text style={styles.description}>{area.description ?? 'Chưa có mô tả'}</Text>
            </View>
            <Pressable onPress={() => removeArea(area.id)} style={styles.delete}>
              <Ionicons color={colors.danger} name="trash-outline" size={19} />
            </Pressable>
          </SurfaceCard>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: 58, flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 6, color: colors.primary, fontSize: 23, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  input: { flex: 1, height: 54, paddingHorizontal: 20, borderRadius: 27, color: colors.text, backgroundColor: colors.surface },
  addButton: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sectionTitle: { marginTop: 30, marginBottom: 14, marginLeft: 5, color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  list: { gap: 14 },
  card: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 13 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  name: { color: colors.text, fontWeight: '700' },
  description: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  delete: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
