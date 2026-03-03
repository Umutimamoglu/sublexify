import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/src/store/authStore';

function getDevHost(): string {
  const hostUri = Constants.expoConfig?.hostUri; // "192.168.x.x:8081" on real device
  if (hostUri) return hostUri.split(':')[0];
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

const BASE_URL = __DEV__
  ? `http://${getDevHost()}:8080/api`
  : 'https://api.sublex.app/api'; // production URL

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Her request'e JWT token ekle
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 gelirse auth'u temizle
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(err);
  }
);
