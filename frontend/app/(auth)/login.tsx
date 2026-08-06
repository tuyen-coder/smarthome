import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/services/api';
import { colors } from '@/src/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@yolohome.vn');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.glow} />
          <View style={styles.logo}>
            <Ionicons color={colors.primary} name="settings-outline" size={34} />
          </View>
          <Text style={styles.title}>Home Smart</Text>
          <Text style={styles.subtitle}>Control your environment, calmly.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Địa chỉ email</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="name@home.com"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={email}
            />

            <Text style={[styles.label, styles.passwordLabel]}>Mật khẩu</Text>
            <View style={styles.passwordInput}>
              <TextInput
                autoComplete="current-password"
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPassword}
                style={styles.passwordText}
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onPress={() => setShowPassword((value) => !value)}
                style={styles.eyeButton}>
                <Ionicons
                  color={colors.textSubtle}
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                />
              </Pressable>
            </View>

            <Pressable style={styles.forgot}>
              <Text style={styles.link}>Quên mật khẩu?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={loading || !email || !password}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading || !email || !password) && styles.buttonDisabled,
              ]}>
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Thiết bị mới? <Text style={styles.link}>Đăng ký thiết bị</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    right: -100,
    bottom: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primarySoft,
    opacity: 0.7,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  title: {
    marginTop: 18,
    color: colors.text,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: { marginTop: 4, color: colors.textMuted, fontSize: 15 },
  form: { width: '100%', maxWidth: 390, marginTop: 42 },
  label: { marginLeft: 8, marginBottom: 8, color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  passwordLabel: { marginTop: 22 },
  input: {
    height: 58,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    fontSize: 16,
  },
  passwordInput: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: colors.surfaceMuted,
  },
  passwordText: { flex: 1, paddingLeft: 24, color: colors.text, fontSize: 16 },
  eyeButton: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  forgot: { alignSelf: 'flex-end', paddingVertical: 16 },
  link: { color: colors.primary, fontWeight: '700' },
  error: { color: colors.danger, marginBottom: 10, textAlign: 'center' },
  button: {
    height: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: colors.surface, fontWeight: '700', letterSpacing: 1.2 },
  footer: { marginTop: 42, color: colors.textMuted, fontSize: 14 },
});
