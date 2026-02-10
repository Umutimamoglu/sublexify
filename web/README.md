# Web Application

React ve TypeScript ile geliştirilmiş modern web arayüzü.

## Teknolojiler

- **React** - UI kütüphanesi
- **TypeScript** - Type-safe JavaScript
- **Context API** - Kullanıcı kimlik doğrulama ve global state
- **Zustand** - Hafif ve performanslı state yönetimi
- **React Router** - Sayfa yönlendirme
- **Axios** - HTTP client
- **i18next** - Çoklu dil desteği

## Özellikler

- 🌓 **Dark/Light Mode** - Kullanıcı tercihine göre tema
- 🌍 **Çoklu Dil Desteği** - i18n ile uluslararasılaştırma
- 🔐 **Kimlik Doğrulama** - Context API ile JWT auth
- ⚡ **Performanslı State Yönetimi** - Zustand ile optimize edilmiş
- 📱 **Responsive Design** - Tüm cihazlarda uyumlu
- ♿ **Erişilebilirlik** - WCAG standartlarına uygun

## Proje Yapısı

```
web/
├── public/
│   └── locales/              # Dil dosyaları
│       ├── en/
│       │   └── translation.json
│       └── tr/
│           └── translation.json
├── src/
│   ├── components/           # Yeniden kullanılabilir bileşenler
│   │   ├── common/          # Genel bileşenler (Button, Input, vb.)
│   │   ├── layout/          # Layout bileşenleri (Header, Footer, vb.)
│   │   └── features/        # Özelliğe özel bileşenler
│   ├── pages/               # Sayfa bileşenleri
│   ├── context/             # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── store/               # Zustand stores
│   │   ├── userStore.ts
│   │   └── appStore.ts
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API servisleri
│   │   └── api.ts
│   ├── types/               # TypeScript type tanımları
│   ├── utils/               # Yardımcı fonksiyonlar
│   ├── styles/              # Global stiller ve tema
│   │   ├── theme.ts
│   │   └── global.css
│   ├── i18n/                # i18n konfigürasyonu
│   │   └── config.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md                # Bu dosya
```

## Kurulum

### Gereksinimler

- Node.js 20+
- npm veya yarn

### Adımlar

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment dosyasını oluşturun:
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

3. Development sunucusunu başlatın:
```bash
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır.

## Environment Değişkenleri

`.env` dosyasında şu değişkenleri tanımlayın:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=Sublex
```

## State Yönetimi

### Context API Kullanımı

Kimlik doğrulama ve tema gibi global state'ler için Context API kullanılır:

```typescript
// Context kullanımı
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // ...
}
```

### Zustand Kullanımı

Kompleks state yönetimi için Zustand kullanılır:

```typescript
// Store kullanımı
import { useUserStore } from '@/store/userStore';

function MyComponent() {
  const { users, fetchUsers, addUser } = useUserStore();
  // ...
}
```

## Çoklu Dil Desteği

i18next ile çoklu dil desteği sağlanır:

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('tr')}>
        Türkçe
      </button>
    </div>
  );
}
```

## Tema (Dark/Light Mode)

```typescript
import { useTheme } from '@/context/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

## Scriptler

```bash
# Development sunucusu
npm run dev

# Production build
npm run build

# Build önizleme
npm run preview

# Linting
npm run lint

# Type checking
npm run type-check

# Testler
npm run test

# Test coverage
npm run test:coverage
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

## Production Build

```bash
npm run build
```

Build dosyaları `dist/` klasöründe oluşturulur.

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# dist/ klasörünü Netlify'a yükleyin
```

## Geliştirme İş Akışı

### Yeni Özellik Ekleme

1. Gerekli component'leri oluşturun
2. State yönetimi ekleyin (Context veya Zustand)
3. API entegrasyonu yapın
4. Stil ve tema entegrasyonu
5. Çoklu dil desteği ekleyin
6. Testler yazın
7. README'yi güncelleyin
8. Commit yapın: `feat: [özellik açıklaması]`

### Commit Standartları

- `feat:` - Yeni özellik
- `fix:` - Hata düzeltme
- `docs:` - Dokümantasyon
- `test:` - Test ekleme/güncelleme
- `refactor:` - Kod iyileştirme
- `style:` - CSS/stil değişiklikleri

## Kod Standartları

- ESLint ve Prettier kullanın
- TypeScript strict mode
- Functional components ve hooks kullanın
- Component başına bir dosya
- Anlamlı değişken ve fonksiyon isimleri
