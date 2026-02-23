# Sublex Mobile — Claude Rehberi

## Proje Nedir?
Dizi ve film altyazılarından kelime öğreten bir dil öğrenme uygulaması.
Backend: Spring Boot 4 (Java 25) + PostgreSQL — `localhost:8080/api`
Web: React 19 + Vite + Tailwind (ayrı klasör)
Mobile: **bu klasör** — React Native + Expo 54

---

## Tech Stack

| Katman | Araç |
|---|---|
| Framework | React Native 0.81.5 + Expo 54 |
| Routing | Expo Router 6 (file-based) |
| Styling | NativeWind v4 (Tailwind CSS v3) |
| State | Zustand 5 + AsyncStorage persist |
| API | Axios + React Query (@tanstack/react-query) |
| i18n | i18next + react-i18next + expo-localization |
| Language | TypeScript (strict) |

---

## Klasör Yapısı

```
mobile/
├── app/                     # Sadece Expo Router route'ları
│   ├── _layout.tsx          # Root: tüm provider'lar (GestureHandler > i18n > QueryClient > Theme > Auth)
│   ├── index.tsx            # Auth gate → /(tabs)/discover
│   ├── (auth)/              # login.tsx, register.tsx
│   ├── (tabs)/              # discover, vocabulary, lists, profile
│   ├── media/[id].tsx       # Media detay (tab dışı)
│   └── word/[id].tsx        # Kelime detay (tab dışı)
│
└── src/
    ├── theme/               # tokens.ts (TEK KAYNAK), lightTheme, darkTheme
    ├── context/             # ThemeContext, AuthContext
    ├── store/               # settingsStore (tema+dil), authStore (user+token)
    ├── i18n/                # index.ts, useTranslation.ts, locales/en+tr
    ├── api/                 # client.ts (axios), queryClient.ts, queries/
    ├── types/               # api.ts (backend DTO'ları)
    ├── components/
    │   ├── ui/              # Text, Card, Button, DifficultyBadge
    │   └── layout/          # ScreenWrapper (tablet-aware)
    └── hooks/               # useResponsive.ts
```

---

## Kritik Kurallar

- **Tek kaynak:** Renkler/fontlar/spacing → `src/theme/tokens.ts`. Başka yerde ham değer yok.
- **Styling:** NativeWind `className` kullan. Inline style sadece dinamik değerler için (örn: DifficultyBadge rengi runtime'da belirleniyor).
- **Tailwind dinamik class yasak:** `className={`text-${color}`}` çalışmaz. Sabit class map kullan.
- **Import path:** Her zaman `@/src/...` alias kullan.
- **Route dosyaları:** `app/` klasörüne business logic koyma — sadece screen component'ı.
- **Expo Go:** AsyncStorage kullanıyoruz (MMKV değil) → Expo Go ile test edilebilir.
- **Android emulator:** API base URL `10.0.2.2:8080` (localhost değil) → `src/api/client.ts`'de Platform.OS kontrolü var.

---

## Yeni Dil Eklemek

1. `src/i18n/locales/<kod>/` klasörü oluştur (5 JSON: common, discover, vocabulary, lists, profile)
2. `src/i18n/index.ts`'e import ve resources'a ekle
3. `SUPPORTED_LANGUAGES` array'ine ekle
4. `src/store/settingsStore.ts`'deki `SupportedLanguage` tipine ekle

---

## i18n Namespace'leri

| Namespace | Kullanım yeri |
|---|---|
| `common` | Tab label'ları, butonlar, hatalar, zorluk seviyeleri |
| `discover` | Dizi/film browse ekranı |
| `vocabulary` | Kelime listesi ekranı |
| `lists` | Kelime listeleri ekranı |
| `profile` | Ayarlar, tema, dil |

---

## Dark Mode

ThemeContext hem Zustand (persist) hem NativeWind `setColorScheme`'i çağırır.
`dark:` prefix'li Tailwind class'ları otomatik çalışır.
Tercih: `'system' | 'light' | 'dark'` → AsyncStorage'da saklanır.

---

## Test Komutu

```bash
npx expo start --clear   # Cache temizleyerek başlat (config değişikliklerinde)
npx expo start           # Normal başlatma
```

---

## Görevler

### ✅ Tamamlanan
- [x] Proje altyapısı (Expo Router, TypeScript, path alias)
- [x] Paket kurulumu (Zustand, AsyncStorage, React Query, Axios, i18next, NativeWind)
- [x] Theme sistemi (tokens.ts → lightTheme + darkTheme + ThemeContext)
- [x] NativeWind v4 entegrasyonu (babel, metro, tailwind config)
- [x] Dark mode (sistem + manuel toggle, NativeWind entegreli)
- [x] i18n (EN + TR, 5 namespace, MMKV yerine AsyncStorage)
- [x] Store'lar (settingsStore + authStore — AsyncStorage persist)
- [x] Auth context (AuthContext + useAuth hook)
- [x] Navigation skeleton (4 tab + auth flow)
- [x] API katmanı (Axios client + React Query + tüm query/mutation hook'ları)
- [x] UI primitives (Text, Card, Button, DifficultyBadge, ScreenWrapper)
- [x] useResponsive hook (tablet/phone breakpoint)

### 🔲 Sıradaki Görevler

> ⚠️ **Auth en sona bırakılacak.** Önce tüm ekranlar ve özellikler tamamlanacak, auth en son implement edilecek.

#### Auth (EN SON)
- [ ] Login ekranı (form, validation, API call)
- [ ] Register ekranı
- [ ] Auth gate aktif et (şu an direkt discover'a yönlendiriyor)

#### Discover Ekranı
- [ ] Media listesi (useMedia hook ile)
- [ ] MediaCard component (poster, başlık, kelime sayısı)
- [ ] Arama/filtreleme (film/dizi/tümü)
- [ ] Media detay ekranı (`app/media/[id].tsx`)

#### Vocabulary Ekranı
- [ ] Bilinen kelimeler listesi (useKnownWords)
- [ ] Arama
- [ ] DifficultyBadge ile filtreleme

#### Lists Ekranı
- [ ] Liste görüntüleme (useLists)
- [ ] Liste oluşturma (useCreateList)

#### Kelime Detay
- [ ] `app/word/[id].tsx` ekranı
- [ ] Tanım, örnekler, phrasal verbs gösterimi
- [ ] "Biliyorum" butonu (useMarkKnown)

#### Profile Ekranı
- [ ] İstatistikler (useUserStats)
- [ ] Çıkış yap butonu

#### Genel
- [ ] Loading/error state'leri için ortak component'lar
- [ ] Boş state component'ı (EmptyState)
- [ ] app.json: slug/scheme "mobile" → "sublex" olarak güncelle
