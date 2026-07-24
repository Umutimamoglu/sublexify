import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/src/store/authStore';

function getDevHost(): string {
  // 1. .env overridable
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Try Expo hostUri (LAN IP from Bundler)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip !== '127.0.0.1' && ip !== 'localhost') {
      return `http://${ip}:8080/api`;
    }
  }

  // 3. Physical devices need the actual LAN IP of the computer, emulators use their bridge
  const fallbackIp = Platform.OS === 'android' ? '10.0.2.2' : '192.168.1.102';
  return `http://${fallbackIp}:8080/api`;
}

const BASE_URL = __DEV__
  ? getDevHost()
  : 'https://sublexify-production.up.railway.app/api'; // Railway production URL

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Budget for the two requests that carry the whole media catalogue (/app-init
 * and an unpaginated /media): ~1.2 MB gzipped, and the server has been measured
 * taking over five seconds just to produce it when cold. The default above is
 * sized for the small endpoints and cuts these off mid-download on anything
 * slower than wifi, which surfaces as a "check your connection" error.
 */
export const CATALOGUE_TIMEOUT_MS = 30000;

// Her request'e JWT token ekle
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 (Unauthorized) gelirse ve istekte token varsa auth'u temizle.
// 403 (Forbidden) gelirse oturumu kapatmıyoruz, çünkü bu yetki hatasıdır (session bitmesi değil).
apiClient.interceptors.response.use(
  (res) => {
    return res;
  },
  (err) => {
    const isAuthError = err.response?.status === 401;
    const hasToken = !!err.config?.headers?.Authorization;

    if (isAuthError && hasToken) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(err);
  }
);
