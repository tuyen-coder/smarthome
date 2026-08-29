import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '@/src/theme/colors';

type Props = {
  maxPhotos: number;
  photos: string[];
  onChange: (photos: string[]) => void;
};

export function FaceCapture({ maxPhotos, photos, onChange }: Props) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    if (busy || photos.length >= maxPhotos) return;
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.82 });
      if (photo?.uri) onChange([...photos, photo.uri]);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return <ActivityIndicator color={colors.primary} style={styles.loading} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Ionicons color={colors.primary} name="camera-outline" size={34} />
        <Text style={styles.permissionText}>Cần quyền camera để chụp mẫu khuôn mặt.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Cho phép camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.cameraFrame}>
        <CameraView facing="front" ref={camera} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.guide} />
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {photos.length}/{maxPhotos}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={busy || photos.length >= maxPhotos}
          onPress={capture}
          style={[styles.capture, photos.length >= maxPhotos && styles.disabled]}>
          {busy ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Ionicons color={colors.surface} name="camera" size={25} />
          )}
        </Pressable>
        {photos.length ? (
          <Pressable onPress={() => onChange(photos.slice(0, -1))} style={styles.undo}>
            <Ionicons color={colors.primary} name="arrow-undo" size={21} />
            <Text style={styles.undoText}>Chụp lại</Text>
          </Pressable>
        ) : null}
      </View>

      {photos.length ? (
        <View style={styles.previews}>
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.preview} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { height: 320 },
  permission: { minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 14 },
  permissionText: { color: colors.textMuted, textAlign: 'center' },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  permissionButtonText: { color: colors.surface, fontWeight: '700' },
  cameraFrame: {
    height: 360,
    overflow: 'hidden',
    borderRadius: 26,
    backgroundColor: colors.text,
  },
  guide: {
    position: 'absolute',
    top: 42,
    bottom: 42,
    left: '20%',
    right: '20%',
    borderWidth: 3,
    borderRadius: 120,
    borderColor: colors.surface,
  },
  counter: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primaryPressed,
  },
  counterText: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  actions: { minHeight: 76, alignItems: 'center', justifyContent: 'center' },
  capture: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 4,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primary,
  },
  disabled: { opacity: 0.4 },
  undo: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 10,
  },
  undoText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  previews: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  preview: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
});
