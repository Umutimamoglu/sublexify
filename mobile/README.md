# Mobile Application

React Native (Expo) ve TypeScript ile geliştirilmiş iOS ve Android mobil uygulaması.

## Teknolojiler

- **React Native** - Cross-platform mobil framework
- **Expo** - Geliştirilmiş geliştirme deneyimi
- **TypeScript** - Type-safe JavaScript
- **Context API** - Kullanıcı kimlik doğrulama ve global state
- **Zustand** - Hafif ve performanslı state yönetimi
- **Expo Router** - File-based routing ve navigasyon
- **Axios** - HTTP client
- **i18next** - Çoklu dil desteği
- **Expo SecureStore** - Güvenli veri saklama

## Özellikler

- 🌓 **Dark/Light Mode** - Sistem temasına uyumlu arayüz.
- 🌍 **Çoklu Dil Desteği** - i18next ile Türkçe ve İngilizce desteği.
- 🔐 **Kimlik Doğrulama** - JWT tabanlı güvenli giriş ve oturum yönetimi.
- ⚡ **Hızlı API Entegrasyonu** - Axios ve özel hook'larla optimize edilmiş veri çekme.
- 📖 **Kelime Listeleri** - Bilinen kelimeler ve medyaya özel bilinmeyenler listesi.
- 🔄 **Offline Desteği** - AsyncStorage ile temel verilerin önbelleğe alınması.

## Proje Yapısı

```
mobile/
├── assets/                   # Görseller, fontlar, vb.
│   ├── images/
│   ├── fonts/
│   └── locales/             # Dil dosyaları
│       ├── en.json
│       └── tr.json
├── app/                     # Expo Router (file-based routing)
│   ├── (tabs)/             # Tab navigation grubu
│   │   ├── index.tsx       # Ana sayfa
│   │   ├── profile.tsx     # Profil sayfası
│   │   └── _layout.tsx     # Tab layout
│   ├── (auth)/             # Auth navigation grubu
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── modal.tsx           # Modal sayfası
│   └── _layout.tsx         # Root layout
├── src/
│   ├── components/          # Yeniden kullanılabilir bileşenler
│   │   ├── common/         # Genel bileşenler (Button, Input, vb.)
│   │   └── features/       # Özelliğe özel bileşenler
│   ├── context/            # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── store/              # Zustand stores
│   │   ├── userStore.ts
│   │   └── appStore.ts
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API servisleri
│   │   ├── api.ts
│   │   └── storage.ts
│   ├── types/              # TypeScript type tanımları
│   ├── utils/              # Yardımcı fonksiyonlar
│   ├── constants/          # Sabitler
│   │   ├── colors.ts
│   │   └── theme.ts
│   ├── i18n/               # i18n konfigürasyonu
│   │   └── config.ts
│   └── App.tsx
├── app.json                # Expo konfigürasyonu
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md               # Bu dosya
```

## Kurulum

### Gereksinimler

- Node.js 20+
- npm veya yarn
- Expo CLI
- iOS: Xcode (Mac için)
- Android: Android Studio

### Adımlar

1. Expo CLI'yi yükleyin (eğer yoksa):

```bash
npm install -g expo-cli
```

2. Bağımlılıkları yükleyin:

```bash
npm install
```

3. Environment dosyasını oluşturun:

```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

4. Uygulamayı başlatın:

```bash
npm start
# veya
expo start
```

5. Expo Go uygulamasını kullanarak QR kodu tarayın veya emulator kullanın:

```bash
# iOS simulator (Mac)
npm run ios

# Android emulator
npm run android
```

## Environment Değişkenleri

`.env` dosyasında şu değişkenleri tanımlayın:

```env
API_BASE_URL=http://localhost:8080/api
APP_NAME=Sublex
```

## State Yönetimi

### Context API Kullanımı

Kimlik doğrulama ve tema gibi global state'ler için Context API kullanılır:

```typescript
// Context kullanımı
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function MyScreen() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // ...
}
```

### Zustand Kullanımı

Kompleks state yönetimi için Zustand kullanılır:

```typescript
// Store kullanımı
import { useUserStore } from "@/store/userStore";

function MyScreen() {
  const { users, fetchUsers, addUser } = useUserStore();
  // ...
}
```

## Çoklu Dil Desteği

i18next ile çoklu dil desteği sağlanır:

```typescript
import { useTranslation } from 'react-i18next';

function MyScreen() {
  const { t, i18n } = useTranslation();

  return (
    <View>
      <Text>{t('welcome')}</Text>
      <Button
        title="Türkçe"
        onPress={() => i18n.changeLanguage('tr')}
      />
    </View>
  );
}
```

## Tema (Dark/Light Mode)

```typescript
import { useTheme } from '@/context/ThemeContext';

function MyScreen() {
  const { theme, colors, toggleTheme } = useTheme();

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>
        Current theme: {theme}
      </Text>
      <Button title="Toggle Theme" onPress={toggleTheme} />
    </View>
  );
}
```

## Navigation (Expo Router)

Expo Router file-based routing kullanır. Klasör yapısı otomatik olarak route'ları oluşturur:

### Örnek Sayfa Yapısı

```typescript
// app/(tabs)/index.tsx
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View>
      <Text>Ana Sayfa</Text>
      <Link href="/profile">Profile'e Git</Link>
    </View>
  );
}
```

### Layout Dosyası

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

### Programatik Navigasyon

```typescript
import { router } from "expo-router";

// Sayfa değiştirme
router.push("/profile");

// Geri gitme
router.back();

// Replace
router.replace("/login");
```

## Scriptler

```bash
# Development sunucusu
npm start
expo start

# iOS simulator
npm run ios

# Android emulator
npm run android

# Web (test amaçlı)
npm run web

# Linting
npm run lint

# Type checking
npm run type-check

# Testler
npm run test
```

## Test

```bash
# Tüm testleri çalıştır
npm run test

# Watch mode
npm run test:watch

# Coverage raporu
npm run test:coverage
```

## Build

### Development Build

```bash
# iOS
expo build:ios

# Android
expo build:android
```

### Production Build (EAS Build)

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Her ikisi
eas build --platform all
```

## Deployment

### App Store (iOS)

```bash
eas build --platform ios
eas submit --platform ios
```

### Google Play Store (Android)

```bash
eas build --platform android
eas submit --platform android
```

## Native Modüller

### Kamera

```typescript
import { Camera } from "expo-camera";
```

### Konum

```typescript
import * as Location from "expo-location";
```

### Bildirimler

```typescript
import * as Notifications from "expo-notifications";
```

### Güvenli Depolama

```typescript
import * as SecureStore from "expo-secure-store";
```

## Geliştirme İş Akışı

### Yeni Özellik Ekleme

1. `app/` klasöründe yeni route dosyası oluşturun
2. Gerekli component'leri oluşturun
3. State yönetimi ekleyin (Context veya Zustand)
4. API entegrasyonu yapın
5. Stil ve tema entegrasyonu
6. Çoklu dil desteği ekleyin
7. Native feature entegrasyonu (gerekirse)
8. Testler yazın
9. README'yi güncelleyin
10. Commit yapın: `feat: [özellik açıklaması]`

### Commit Standartları

- `feat:` - Yeni özellik
- `fix:` - Hata düzeltme
- `docs:` - Dokümantasyon
- `test:` - Test ekleme/güncelleme
- `refactor:` - Kod iyileştirme
- `style:` - Stil değişiklikleri

## Kod Standartları

- ESLint ve Prettier kullanın
- TypeScript strict mode
- Functional components ve hooks kullanın
- Screen/Component başına bir dosya
- Anlamlı değişken ve fonksiyon isimleri
- Platform-specific kod minimize edin
- Accessibility props kullanın

## Performans

- React.memo kullanarak gereksiz render'ları önleyin
- useMemo ve useCallback hook'larını kullanın
- FlatList/SectionList kullanın (ScrollView yerine)
- Image optimize edin
- Bundle size'ı düşük tutun

## Debugging

```bash
# React Native Debugger
npm install -g react-native-debugger

# Expo DevTools
expo start
# Tarayıcıda DevTools'u açın
```

## Sorun Giderme

### Cache temizleme

```bash
expo start -c
```

### Node modules yeniden yükleme

```bash
rm -rf node_modules
npm install
```
