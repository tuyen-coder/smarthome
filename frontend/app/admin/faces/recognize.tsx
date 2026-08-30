import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/common/AppScreen';
import { SurfaceCard } from '@/components/common/SurfaceCard';
import { FaceCapture } from '@/components/face/FaceCapture';
import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';
import type { FaceRecognition } from '@/src/types/domain';

export default function FaceRecognitionScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [result, setResult] = useState<FaceRecognition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const recognize = async () => {
    if (!photos[0]) return;
    setBusy(true);
    setError('');
    try {
      setResult(await api.recognizeFace(photos[0]));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể nhận diện khuôn mặt');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons color={colors.primary} name="arrow-back" size={23} />
        </Pressable>
        <Text style={styles.title}>Kiểm tra nhận diện</Text>
      </View>

      <Text style={styles.description}>
        Chức năng này chỉ kiểm tra danh tính, chưa gửi lệnh mở khóa vì chưa có chống giả mạo.
      </Text>
      <FaceCapture
        maxPhotos={1}
        onChange={(next) => {
          setPhotos(next);
          setResult(null);
        }}
        photos={photos}
      />

      {result ? (
        <SurfaceCard style={[styles.result, result.recognized ? styles.success : styles.unknown]}>
          <Ionicons
            color={result.recognized ? colors.success : colors.warning}
            name={result.recognized ? 'person-circle' : 'help-circle'}
            size={34}
          />
          <View style={styles.flex}>
            <Text style={styles.resultTitle}>{result.user_name ?? 'Không xác định'}</Text>
            <Text style={styles.resultText}>
              Độ tương đồng:{' '}
              {result.similarity == null
                ? 'N/A'
                : `${(result.similarity * 100).toFixed(1)}%`}
            </Text>
          </View>
        </SurfaceCard>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        disabled={!photos.length || busy}
        onPress={recognize}
        style={[styles.submit, (!photos.length || busy) && styles.disabled]}>
        {busy ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Ionicons color={colors.surface} name="scan" size={21} />
        )}
        <Text style={styles.submitText}>Nhận diện</Text>
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
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  success: { backgroundColor: colors.successSoft },
  unknown: { backgroundColor: colors.warningSoft },
  resultTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  resultText: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  error: { marginTop: 14, color: colors.danger, textAlign: 'center' },
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
