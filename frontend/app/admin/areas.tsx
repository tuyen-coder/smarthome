import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import { useHome } from '@/src/context/HomeContext';
import type { Area } from '@/src/types/domain';
import { useEffect } from 'react';

export default function AreasScreen() {
  const { activeHome } = useHome();
  const [areas, setAreas] = useState<Area[]>([]);
  const [name, setName] = useState('');

  const fetchAreas = () => {
    if (activeHome) {
      api.areas(activeHome.id)
        .then(res => {
          setAreas(res);
        })
        .catch(err => {
        });
    }
  };

  useEffect(() => {
    fetchAreas();
  }, [activeHome]);

  const addArea = async () => {
    if (!name.trim() || !activeHome) return;
    try {
      await api.createArea({ name: name.trim(), home_id: activeHome.id });
      fetchAreas();
      setName('');
    } catch (err) {
      console.error(err);
    }
  };

  const removeArea = async (areaId: number) => {
    try {
      await api.deleteArea(areaId);
      fetchAreas();
    } catch (err) {
      console.error(err);
    }
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
                name={(['tv-outline', 'bed-outline', 'restaurant-outline', 'lock-closed-outline'][index % 4]) as never}
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
