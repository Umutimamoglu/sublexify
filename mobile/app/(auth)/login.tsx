import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet,
  Dimensions, TextInput as RNTextInput,
} from 'react-native';
import { router, Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';

const { width: SW, height: SH } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [focusedField, setFocused] = useState<'email' | 'pass' | null>(null);
  const passRef = useRef<RNTextInput>(null);
  const setAuth = useAuthStore((s) => s.setAuth);
  const insets  = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) { setError('Email ve şifre gerekli'); return; }
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.login, { email, password });
      setAuth(res.data.user, res.data.token);
      router.replace('/(tabs)/discover');
    } catch {
      setError('Email veya şifre hatalı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#06071a', '#0d1040', '#140d35']} style={StyleSheet.absoluteFill} />

      {/* Decorative orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo area */}
          <View style={styles.logoArea}>
            <View style={styles.logoShadow}>
              <Image
                source={require('../../assets/images/sublexify_transparent.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>Sublexify</Text>
            <Text style={styles.tagline}>Film ve dizilerle İngilizce öğren</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Giriş Yap</Text>
            <Text style={styles.cardSubtitle}>Hesabına hoş geldin 👋</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={[styles.inputWrap, focusedField === 'email' && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={18} color={focusedField === 'email' ? '#818cf8' : '#6b7280'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email adresin"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passRef.current?.focus()}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrap, focusedField === 'pass' && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focusedField === 'pass' ? '#818cf8' : '#6b7280'} style={styles.inputIcon} />
              <TextInput
                ref={passRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Şifren"
                placeholderTextColor="#4b5563"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* CTA */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85} style={styles.btnOuter}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Giriş Yap</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Hesabın yok mu? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Kayıt Ol</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06071a' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: SW * 0.8, height: SW * 0.8, top: -SW * 0.25, left: -SW * 0.2, backgroundColor: '#4f46e540', },
  orb2: { width: SW * 0.6, height: SW * 0.6, bottom: SH * 0.1, right: -SW * 0.2, backgroundColor: '#7c3aed30', },

  logoArea:   { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoShadow: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  logoImg:    { width: 70, height: 70 },
  appName:    { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  tagline:    { color: '#6b7280', fontSize: 14, marginTop: 6 },

  card:        { backgroundColor: '#ffffff0d', borderRadius: 24, borderWidth: 1, borderColor: '#ffffff15', padding: 24, backdropFilter: 'blur(20px)' },
  cardTitle:   { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSubtitle:{ color: '#6b7280', fontSize: 14, marginBottom: 24 },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  inputWrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff15', borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 14 },
  inputWrapFocused: { borderColor: '#6366f1', backgroundColor: '#6366f110' },
  inputIcon:        { marginRight: 10 },
  input:            { flex: 1, color: '#fff', fontSize: 15 },
  eyeBtn:           { padding: 4 },

  btnOuter: { marginTop: 8, borderRadius: 14, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  btn:      { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  btnText:  { color: '#fff', fontSize: 16, fontWeight: '800' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#818cf8', fontSize: 14, fontWeight: '700' },
});
