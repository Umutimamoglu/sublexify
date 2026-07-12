# Sublex Web Interface

React, TypeScript ve Vite ile geliştirilmiş, Sublex platformunun kullanıcı ve admin arayüzüdür.

## 🚀 Özellikler

- **Gelişmiş Admin Paneli**: Medya ekleme, altyazı yükleme, AI pipeline takibi ve içerik yönetimi.
- **Medya Keşfetme**: Tüm film ve dizilerin listelendiği, filtreleme ve arama yapılabilen ana sayfa.
- **Medya Detay & Analiz**: Bir içeriğe girmeden önce seviye bazlı (A1-C2) kelime dağılımını görme.
- **Kişisel Listeler**: "Biliyorum" dediğin kelimeler ve özel oluşturduğun listelerin yönetimi.
- **İnteraktif Kelime Kartları**: AI tarafından üretilmiş tanımlar, örnek cümleler ve çeviriler.
- **Havuz (Vocabulary) Alıştırma Modu**: Öğrenilen kelimeler üzerinde Quiz/Flashcard pratiği yapma.
- **Otomatik Seslendirme (TTS)**: Kelime listelerinde İngilizce/Türkçe/Örnek Cümle olarak kesintisiz otomatik dinleme.
- **Yönlendirici İlerleme Banner'ı (Guided Flow)**: Kullanıcının izleme öncesi hazırlık yüzdesini ölçen akıllı uyarı sistemi.
- **Sıradaki Bölüm Barı**: Dizilerde kalınan yerden devam etmeyi sağlayan akıllı, sabit alt panel.
- **Gelişmiş Çalışma Özeti (Study Recap)**: Quiz seansı bitiminde XP ve başarı oranını emoji/animasyonla sunan özet ekranı.
- **Çoklu Dil & Tema**: Dark/Light mode ve Türkçe/İngilizce dil desteği.
- **Uygulama Turu (Onboarding)**: İlk kez giren kullanıcılar için 5 adımlık interaktif tanıtım turu.

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
