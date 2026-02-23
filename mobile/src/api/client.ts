import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';

const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const BASE_URL = __DEV__
  ? `http://${host}:8080/api`
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
