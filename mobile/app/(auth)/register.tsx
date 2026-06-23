/* ─── app/(auth)/register.tsx ──────────────────────────────────
   Kayıt akışı artık login.tsx içindeki birleşik AuthScreen'de.
   Bu route buraya gelirse oraya yönlendirir.
   ──────────────────────────────────────────────────────────────── */
import { Redirect } from 'expo-router';

export default function RegisterScreen() {
  return <Redirect href="/(auth)/login" />;
}

/* ═══════════════════════════════════════════════════════════════
   ESKİ REGISTER UI — YORUMA ALINDI
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
// export default function RegisterScreen() {
//   ... (ayrı kayıt kartı, mor gradient tasarım)
// }
*/
