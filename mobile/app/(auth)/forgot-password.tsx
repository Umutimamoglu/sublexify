import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { Text } from '@/src/components/ui/Text';


const { width: SW, height: SH } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    if (!email.trim()) { setError('Email adresi gerekli'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post(ENDPOINTS.auth.forgotPassword, { email: email.trim().toLowerCase() });
    } catch {
      // Always show success for security
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#06071a', '#0d1040', '#140d35']} style={StyleSheet.absoluteFill} />
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.successIcon]}>
            <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>Email Gönderildi!</Text>
          <Text style={styles.successDesc}>
            {email} adresine 6 haneli kod gönderildi.{'\n'}Kodu 15 dakika içinde kullan.
          </Text>
          <TouchableOpacity
            style={styles.btnOuter}
            onPress={() => router.push('/(auth)/reset-password')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
              <Text style={styles.btnText}>Kodu Gir</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={styles.footerLink}>← Geri dön</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.appName}>Şifremi Unuttum</Text>
            <Text style={styles.tagline}>Email adresine sıfırlama kodu göndereceğiz</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Email Adresin</Text>
            <Text style={styles.cardSubtitle}>Kayıtlı email adresini gir 📧</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
              <Ionicons name="mail-outline" size={18} color={focused ? '#818cf8' : '#6b7280'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor="#4b5563"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity onPress={handleSend} disabled={loading} activeOpacity={0.85} style={styles.btnOuter}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.btnText}>Kod Gönder</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Şifreni hatırladın mı? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Giriş Yap</Text>
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

  logoArea: { alignItems: 'center', marginBottom: 40, marginTop: 20 },
  logoShadow: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#ffffff10', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  logoImg: { width: 70, height: 70 },
  appName: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  tagline: { color: '#6b7280', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  card: { backgroundColor: '#ffffff0d', borderRadius: 24, borderWidth: 1, borderColor: '#ffffff15', padding: 24 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { color: '#6b7280', fontSize: 14, marginBottom: 24 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', borderWidth: 1, borderColor: '#ef444440', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 13, flex: 1 },

  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff15', borderRadius: 14, paddingHorizontal: 14, height: 52, marginBottom: 14 },
  inputWrapFocused: { borderColor: '#6366f1', backgroundColor: '#6366f110' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15 },

  btnOuter: { marginTop: 8, borderRadius: 14, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  btn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#6b7280', fontSize: 14 },
  footerLink: { color: '#818cf8', fontSize: 14, fontWeight: '700' },

  successIcon: { alignItems: 'center', marginBottom: 24 },
  successTitle: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  successDesc: { color: '#6b7280', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
});
