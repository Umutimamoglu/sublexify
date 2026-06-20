import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';
import { Text } from '@/src/components/ui/Text';


const { width: SW, height: SH } = Dimensions.get('window');
const CODE_LENGTH = 6;

export default function ResetPasswordScreen() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocused] = useState<'pass' | 'confirm' | null>(null);

  const digitRefs = useRef<(TextInput | null)[]>([]);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => { digitRefs.current[0]?.focus(); }, []);

  const handleDigitChange = (index: number, value: string) => {
    const v = value.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < CODE_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus();
    } else if (v && index === CODE_LENGTH - 1) {
      passRef.current?.focus();
    }
  };

  const handleDigitKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleReset = async () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) { setError('Lütfen 6 haneli kodu tam gir'); return; }
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return; }
    if (password !== passwordConfirm) { setError('Şifreler eşleşmiyor'); return; }
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.resetPassword, { code, newPassword: password });
      setAuth(res.data.user, res.data.token);
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)/discover'), 1800);
    } catch {
      setError('Geçersiz veya süresi dolmuş kod. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <LinearGradient colors={['#06071a', '#0d1040', '#140d35']} style={StyleSheet.absoluteFill} />
        <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
        <Text style={[styles.sectionLabel, { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 20 }]}>Şifre Değiştirildi!</Text>
        <Text style={styles.tagline}>Giriş yapılıyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#06071a', '#0d1040', '#140d35']} style={StyleSheet.absoluteFill} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoShadow}>
              <Image
                source={require('../../assets/images/sublexify_transparent.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Şifre Sıfırla</Text>
            <Text style={styles.tagline}>Emailine gelen 6 haneli kodu gir</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Doğrulama Kodu</Text>
            <Text style={styles.cardSubtitle}>Email'ine gönderilen kodu gir 🔐</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* OTP digit inputs */}
            <View style={styles.otpRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { digitRefs.current[i] = el; }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : {},
                  ]}
                  value={digit}
                  onChangeText={(v) => handleDigitChange(i, v)}
                  onKeyPress={({ nativeEvent }) => handleDigitKeyPress(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                  selectionColor="#6366f1"
                />
              ))}
            </View>

            {/* New Password */}
            <Text style={styles.sectionLabel}>Yeni Şifre</Text>
            <View style={[styles.inputWrap, focusedField === 'pass' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'pass' ? '#818cf8' : '#6b7280'} style={styles.inputIcon} />
              <TextInput
                ref={passRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="En az 6 karakter"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPass}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.sectionLabel}>Şifre Tekrar</Text>
            <View style={[styles.inputWrap, focusedField === 'confirm' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'confirm' ? '#818cf8' : '#6b7280'} style={styles.inputIcon} />
              <TextInput
                ref={confirmRef}
                style={styles.input}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="Şifreyi tekrar gir"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleReset}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <TouchableOpacity onPress={handleReset} disabled={loading} activeOpacity={0.85} style={styles.btnOuter}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Şifreyi Sıfırla</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Yeni kod mı lazım? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/forgot-password')}>
                <Text style={styles.footerLink}>Tekrar Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06071a' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: SW * 0.8, height: SW * 0.8, top: -SW * 0.25, left: -SW * 0.2, backgroundColor: '#4f46e540' },
  orb2: { width: SW * 0.6, height: SW * 0.6, bottom: SH * 0.1, right: -SW * 0.2, backgroundColor: '#7c3aed30' },

  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  logoArea: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  logoShadow: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  logoImg: { width: 62, height: 62 },
  appName: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  tagline: { color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center' },

  card: { backgroundColor: '#ffffff0d', borderRadius: 24, borderWidth: 1, borderColor: '#ffffff15', padding: 24 },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { color: '#6b7280', fontSize: 13, marginBottom: 20 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  otpBox: { width: 44, height: 54, borderRadius: 12, backgroundColor: '#ffffff08', borderWidth: 1.5, borderColor: '#ffffff15', color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  otpBoxFilled: { borderColor: '#6366f1', backgroundColor: '#6366f120' },

  sectionLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff15', borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 14 },
  inputWrapFocused: { borderColor: '#6366f1', backgroundColor: '#6366f110' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn: { padding: 4 },

  btnOuter: { marginTop: 8, borderRadius: 14, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#818cf8', fontSize: 14, fontWeight: '700' },
});
