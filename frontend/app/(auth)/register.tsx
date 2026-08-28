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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.register({ name: name.trim(), email: email.trim(), password });
      // Sau khi đăng ký thành công, điều hướng về trang đăng nhập
      router.replace('/(auth)/login');
    } catch (reason: any) {
      setError(reason.message || 'Đăng ký thất bại');
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
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons color={colors.primary} name="arrow-back" size={24} />
            </Pressable>
            <View style={styles.logo}>
              <Ionicons color={colors.primary} name="person-add-outline" size={28} />
            </View>
          </View>
          
          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>Bắt đầu trải nghiệm nhà thông minh</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              onChangeText={setName}
              placeholder="Nguyễn Văn A"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={name}
            />

            <Text style={[styles.label, styles.marginTop]}>Địa chỉ email</Text>
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

            <Text style={[styles.label, styles.marginTop]}>Mật khẩu</Text>
            <View style={styles.passwordInput}>
              <TextInput
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              disabled={loading || !email || !password || !name}
              onPress={submit}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                (loading || !email || !password || !name) && styles.buttonDisabled,
              ]}>
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.buttonText}>ĐĂNG KÝ</Text>
              )}
            </Pressable>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 36,
    backgroundColor: colors.background,
  },
  glow: {
    position: 'absolute',
    right: -100,
    top: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primarySoft,
    opacity: 0.7,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  title: {
    alignSelf: 'flex-start',
    marginTop: 18,
    color: colors.text,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: { alignSelf: 'flex-start', marginTop: 4, color: colors.textMuted, fontSize: 15 },
  form: { width: '100%', maxWidth: 390, marginTop: 42 },
  label: { marginLeft: 8, marginBottom: 8, color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  marginTop: { marginTop: 22 },
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
  error: { color: colors.danger, marginTop: 10, textAlign: 'center' },
  button: {
    height: 58,
    marginTop: 32,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: colors.surface, fontWeight: '700', letterSpacing: 1.2 },
});
