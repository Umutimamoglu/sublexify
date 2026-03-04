# Sublex Web Interface

React, TypeScript ve Vite ile geliştirilmiş, Sublex platformunun kullanıcı ve admin arayüzüdür.

## 🚀 Özellikler

- **Gelişmiş Admin Paneli**: Medya ekleme, altyazı yükleme, AI pipeline takibi ve içerik yönetimi.
- **Medya Keşfetme**: Tüm film ve dizilerin listelendiği, filtreleme ve arama yapılabilen ana sayfa.
- **Medya Detay & Analiz**: Bir içeriğe girmeden önce seviye bazlı (A1-C2) kelime dağılımını görme.
- **Kişisel Listeler**: "Biliyorum" dediğin kelimeler ve özel oluşturduğun listelerin yönetimi.
- **İnteraktif Kelime Kartları**: AI tarafından üretilmiş tanımlar, örnek cümleler ve çeviriler.
- **Çoklu Dil & Tema**: Dark/Light mode ve Türkçe/İngilizce dil desteği.

## 🛠️ Teknolojiler

- **React 18** & **TypeScript**
- **Vite** (Hızlı development ve build)
- **Zustand** (Global state yönetimi)
- **Axios** (API iletişimi)
- **React Router** (Sayfa navigasyonu)
- **CSS Modules** (Scope'lanmış stiller)

## 📁 Sayfa Yapısı

- `LandingPage`: Karşılama ve özellik tanıtımı.

* `BrowsePage`: Tüm içeriklerin listelendiği keşif sayfası.
* `MediaDetailPage`: Bir filmin/bölümün kelimelerinin analiz edildiği ana çalışma sayfası.
* `UserListsPage`: Kullanıcının özel listelerini yönettiği alan.
* `AdminPage`: İçerik yükleme ve AI sistemini yönetme merkezi.

## 🔨 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- npm veya yarn

### Adımlar

1. Bağımlılıkları yükleyin:

```bash
npm install
```

2. Geliştirme sunucusunu başlatın:

```bash
npm run dev
```

3. Production build oluşturun:

```bash
npm run build
```

## 🌐 API Bağlantısı

Web uygulaması `backend` servisiyle konuşur. API URL ayarları `.env` dosyası üzerinden veya development sırasında `vite.config.ts` proxy ayarlarıyla yönetilir.

Varsayılan Backend URL: `http://localhost:8080`
