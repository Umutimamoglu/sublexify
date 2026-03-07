import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, Link } from 'expo-router';
import { apiClient } from '@/src/api/client';
import { ENDPOINTS } from '@/src/api/endpoints';
import { useAuthStore } from '@/src/store/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email ve şifre gerekli');
      return;
    }
    setError('');
    setLoading(true);

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-[#0f1117]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="w-16 h-16 rounded-2xl bg-indigo-600 items-center justify-center mb-4">
              <Text className="text-white text-2xl font-bold">S</Text>
            </View>
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">Sublex</Text>
            <Text className="text-gray-500 dark:text-gray-400 mt-1">Film ve dizilerle İngilizce öğren</Text>
          </View>

          {/* Form */}
          <View className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-6">Giriş Yap</Text>

            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                <Text className="text-red-600 dark:text-red-400 text-sm">{error}</Text>
              </View>
            ) : null}

            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white mb-4"
            />

            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white mb-6"
            />

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 rounded-xl items-center justify-center"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Giriş Yap</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Hesabın yok mu? </Text>
              <Link href="/(auth)/register" className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                Kayıt Ol
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
