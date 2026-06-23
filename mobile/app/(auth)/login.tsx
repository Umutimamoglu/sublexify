/* ─── app/(auth)/login.tsx ─────────────────────────────────────
   Birleşik auth ekranı — onboarding'in son adımı.
   • Google / Apple  → disabled, "Şu an aktif değil" badge
   • Continue with email → inline form açılır (sign-up / sign-in toggle)
   ──────────────────────────────────────────────────────────────── */
import { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';
import { Text } from '@/src/components/ui/Text';
import { useTranslation } from '@/src/i18n/useTranslation';

// ─── Tema — onboarding ile tutarlı ───────────────────────────
const BG     = '#0B0D12';
const ACCENT = '#2BFF88';
const TEXT_P = '#FFFFFF';
const TEXT_S = '#9BA1AE';

type Mode = 'options' | 'signup' | 'signin';

export default function AuthScreen() {
  const [mode,     setMode]     = useState<Mode>('options');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const emailRef = useRef<RNTextInput>(null);
  const passRef  = useRef<RNTextInput>(null);

  const { setAuth } = useAuthStore();
  const { t } = useTranslation('common');

  // ─── Handlers ─────────────────────────────────────────────
  const handleSignup = async () => {
    if (!email || !password) { setError('Email ve şifre gerekli'); return; }
    if (password.length < 6)  { setError('Şifre en az 6 karakter olmalı'); return; }
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.register, {
        name: email.split('@')[0],
        email,
        password,
      });
      setAuth(res.data.user, res.data.token);
      router.replace('/(tabs)/discover');
    } catch {
      setError(t('auth.emailAlreadyExists'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    if (!email || !password) { setError(t('auth.emailRequired')); return; }
    setError(''); setLoading(true);
    try {
      const res = await apiClient.post(ENDPOINTS.auth.login, { email, password });
      setAuth(res.data.user, res.data.token);
      router.replace('/(tabs)/discover');
    } catch {
      setError(t('auth.wrongCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); };

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* ── Header: geri + segment bar ── */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/onboarding')}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-back" size={26} color={TEXT_P} />
          </TouchableOpacity>
          <View style={s.progressBar}>
            <View style={[s.seg, { backgroundColor: ACCENT }]} />
            <View style={[s.seg, { backgroundColor: ACCENT }]} />
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Scroll body ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Başlık */}
            <Text style={s.heading}>
              <Text style={{ color: ACCENT }}>{t('auth.headingAccent')}{'\n'}</Text>
              {t('auth.heading').replace(t('auth.headingAccent'), '').replace('\n', '')}
            </Text>
            <Text style={s.sub}>
              {t('auth.subtitle').split(t('auth.subtitleBold'))[0]}
              <Text style={{ color: TEXT_P, fontWeight: '700' }}>{t('auth.subtitleBold')}</Text>
              {t('auth.subtitle').split(t('auth.subtitleBold'))[1]}
            </Text>

            {/* ── Sosyal butonlar ── */}
            <View style={s.btnGroup}>

              {/* Google — placeholder */}
              <View>
                <TouchableOpacity style={[s.socialBtn, s.socialDisabled]} disabled activeOpacity={1}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={s.socialTxt}>{t('auth.continueGoogle')}</Text>
                </TouchableOpacity>
                <View style={s.badge}>
                  <Ionicons name="lock-closed" size={10} color="#F59E0B" />
                  <Text style={s.badgeTxt}>Şu an aktif değil</Text>
                </View>
              </View>

              {/* Apple — placeholder */}
              <View>
                <TouchableOpacity style={[s.socialBtn, s.socialDisabled]} disabled activeOpacity={1}>
                  <Ionicons name="logo-apple" size={22} color="#111827" />
                  <Text style={s.socialTxt}>{t('auth.continueApple')}</Text>
                </TouchableOpacity>
                <View style={s.badge}>
                  <Ionicons name="lock-closed" size={10} color="#F59E0B" />
                  <Text style={s.badgeTxt}>Şu an aktif değil</Text>
                </View>
              </View>

              {/* Email — aktif */}
              <TouchableOpacity
                style={s.emailBtn}
                onPress={() => mode === 'options' ? switchMode('signup') : undefined}
                activeOpacity={mode === 'options' ? 0.8 : 1}
              >
                <Text style={s.emailTxt}>{t('auth.continueEmail')}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Email formu (genişler) ── */}
            {mode !== 'options' && (
              <View style={s.form}>
                <Text style={s.formTitle}>
                  {mode === 'signup' ? t('auth.signUpEmail') : t('auth.signInEmail')}
                </Text>

                {!!error && (
                  <View style={s.errorBox}>
                    <Ionicons name="alert-circle" size={14} color="#f87171" />
                    <Text style={s.errorTxt}>{error}</Text>
                  </View>
                )}

                {/* Email */}
                <View style={s.fieldWrap}>
                  <TextInput
                    ref={emailRef}
                    style={s.field}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('auth.emailPlaceholder')}
                    placeholderTextColor={TEXT_S}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
                  />
                </View>

                {/* Şifre */}
                <View style={[s.fieldWrap, { flexDirection: 'row', alignItems: 'center' }]}>
                  <TextInput
                    ref={passRef}
                    style={[s.field, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={t('auth.passwordPlaceholder')}
                    placeholderTextColor={TEXT_S}
                    secureTextEntry={!showPass}
                    returnKeyType="done"
                    onSubmitEditing={mode === 'signup' ? handleSignup : handleSignin}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 8 }}>
                    <Ionicons
                      name={showPass ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={TEXT_S}
                    />
                  </TouchableOpacity>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={s.submitBtn}
                  onPress={mode === 'signup' ? handleSignup : handleSignin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={TEXT_P} />
                    : <Text style={s.submitTxt}>{mode === 'signup' ? t('auth.signUp') : t('auth.signIn')}</Text>}
                </TouchableOpacity>

                {/* Mod geçişi */}
                <TouchableOpacity
                  style={s.switchRow}
                  onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  <Text style={s.switchBase}>
                    {mode === 'signup' ? t('auth.alreadySignedUp') : t('auth.newHere')}
                    <Text style={s.switchLink}>
                      {mode === 'signup' ? t('auth.signInLink') : t('auth.signUpLink')}
                    </Text>
                  </Text>
                </TouchableOpacity>

                {mode === 'signin' && (
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    style={{ alignSelf: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: TEXT_S, fontSize: 13 }}>{t('auth.forgotPassword')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Terms ── */}
            <View style={s.terms}>
              <Text style={s.termsTxt}>
                {t('auth.termsPrefix')}
                <Text style={s.termsLink}>{t('auth.termsLink')}</Text>
                {t('auth.termsAnd')}
                <Text style={s.termsLink}>{t('auth.privacyLink')}</Text>
                {t('auth.termsSuffix')}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  // header
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  progressBar: { flex: 1, flexDirection: 'row', gap: 6 },
  seg:         { flex: 1, height: 4, borderRadius: 2 },

  // body
  scroll:   { paddingHorizontal: 28, paddingBottom: 52 },
  heading:  { color: TEXT_P, fontSize: 30, fontWeight: '900', lineHeight: 38, letterSpacing: -0.5, marginTop: 8, marginBottom: 14 },
  sub:      { color: TEXT_S, fontSize: 15, lineHeight: 23, marginBottom: 36 },

  // social buttons
  btnGroup:      { gap: 0, marginBottom: 4 },
  socialBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F3F4F6', borderRadius: 16, height: 56 },
  socialDisabled:{ opacity: 0.58 },
  socialTxt:     { color: '#111827', fontSize: 16, fontWeight: '600' },

  // "not active" badge
  badge:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, marginBottom: 14 },
  badgeTxt: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },

  // email button
  emailBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1F27', borderRadius: 16, height: 56, borderWidth: 1, borderColor: '#ffffff18', marginTop: 4 },
  emailTxt: { color: TEXT_P, fontSize: 16, fontWeight: '700' },

  // form
  form:      { marginTop: 24 },
  formTitle: { color: TEXT_P, fontSize: 15, fontWeight: '600', marginBottom: 20 },
  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440', borderRadius: 10, padding: 10, marginBottom: 14 },
  errorTxt:  { color: '#f87171', fontSize: 13, flex: 1 },
  fieldWrap: { borderBottomWidth: 1, borderBottomColor: '#ffffff20', marginBottom: 4 },
  field:     { color: TEXT_P, fontSize: 16, paddingVertical: 14 },

  // submit
  submitBtn: { backgroundColor: '#1C1F27', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 28, borderWidth: 1, borderColor: '#ffffff18' },
  submitTxt: { color: TEXT_P, fontSize: 16, fontWeight: '800' },

  // mode switch
  switchRow:  { alignItems: 'center', marginTop: 18 },
  switchBase: { color: TEXT_S, fontSize: 14 },
  switchLink: { color: ACCENT, fontWeight: '700' },

  // terms
  terms:     { marginTop: 36, alignItems: 'center' },
  termsTxt:  { color: TEXT_S, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: TEXT_P, textDecorationLine: 'underline' },
});

/* ═══════════════════════════════════════════════════════════════
   ESKİ LOGIN UI — YORUMA ALINDI
   (email/password logic yukarıda AuthScreen içinde korunuyor)
   ═══════════════════════════════════════════════════════════════

// import { useState, useRef } from 'react';
// import { View, TextInput, TouchableOpacity, ActivityIndicator,
//          KeyboardAvoidingView, Platform, ScrollView, Image,
//          StyleSheet, Dimensions, TextInput as RNTextInput } from 'react-native';
// import { router, Link } from 'expo-router';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { apiClient } from '@/src/api/client';
// import { ENDPOINTS } from '@/src/api/endpoints';
// import { useAuthStore } from '@/src/store/authStore';
// import { Text } from '@/src/components/ui/Text';
//
// export default function LoginScreen() {
//   ... (purple gradient design, separate login card)
// }
*/
