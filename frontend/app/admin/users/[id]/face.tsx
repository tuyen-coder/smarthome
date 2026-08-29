import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { FaceCapture } from '@/components/face/FaceCapture';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { FaceProfile } from '@/src/types/domain';

export default function FaceEnrollmentScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = Number(params.id);
  const [photos, setPhotos] = useState<string[]>([]);
  const [profile, setProfile] = useState<FaceProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.faceProfile(userId).then(setProfile).catch(() => undefined);
  }, [userId]);

  const enroll = async () => {
    setSaving(true);
    setMessage('');
    try {
      const result = await api.enrollFace(userId, photos);
      setProfile(result);
      setPhotos([]);
      setMessage('Đăng ký khuôn mặt thành công.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể đăng ký khuôn mặt');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await api.deleteFaceProfile(userId);
      setProfile(null);
      setMessage('Đã xóa dữ liệu khuôn mặt.');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Không thể xóa dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Đăng ký khuôn mặt</Text>
      </View>

      <Text style={styles.description}>
        Chụp 3 ảnh: nhìn thẳng, hơi quay trái và hơi quay phải. Ảnh gốc không được lưu trên
        máy chủ.
      </Text>

      {profile ? (
        <SurfaceCard style={styles.profile}>
          <Ionicons color={colors.success} name="checkmark-circle" size={28} />
          <View style={styles.flex}>
            <Text style={styles.profileTitle}>Đã có hồ sơ khuôn mặt</Text>
            <Text style={styles.profileText}>{profile.sample_count} mẫu • YuNet + SFace</Text>
          </View>
          <Pressable disabled={saving} onPress={remove} style={styles.deleteButton}>
            <Ionicons color={colors.danger} name="trash-outline" size={20} />
          </Pressable>
        </SurfaceCard>
      ) : null}

      <FaceCapture maxPhotos={3} onChange={setPhotos} photos={photos} />

      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        disabled={photos.length < 3 || saving}
        onPress={enroll}
        style={[styles.submit, (photos.length < 3 || saving) && styles.disabled]}>
        {saving ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Ionicons color={colors.surface} name="scan" size={21} />
        )}
        <Text style={styles.submitText}>{profile ? 'Đăng ký lại' : 'Lưu khuôn mặt'}</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { paddingBottom: 44 },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 6, color: colors.primary, fontSize: 22, fontWeight: '700' },
  description: { marginBottom: 18, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    backgroundColor: colors.successSoft,
  },
  profileTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  profileText: { marginTop: 3, color: colors.textMuted, fontSize: 12 },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: 12, color: colors.primary, textAlign: 'center', fontSize: 13 },
  submit: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  submitText: { color: colors.surface, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
