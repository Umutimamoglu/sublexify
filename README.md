# Sublex Projesi

Bu proje, üç ana bileşenden oluşan tam yığın (full-stack) bir uygulamadır.

## Proje Yapısı

Proje aşağıdaki üç ana uygulamadan oluşmaktadır:

```
sublex/
├── backend/          # Backend API sunucusu
├── web/             # React ile web arayüzü
├── mobile/          # React Native ile mobil uygulama
└── README.md        # Bu dosya (ana proje dokümantasyonu)
```

## Proje Hakkında

### 🎯 Temel Amaç

Sublex, film ve dizi izlerken dil öğrenmeyi kolaylaştıran bir platformdur. Temel çalışma prensibi:

1. **İçerik Seçimi**: Sistemde hazır bulunan veya yeni eklenen içerikler (örn. Mr. Robot S01) arasından seçim yapılır.
2. **AI Destekli Zenginleştirme**: Sistem altyazıları sadece parse etmekle kalmaz, her kelimeyi **AI (OpenAI, Gemini, Anthropic)** kullanarak zenginleştirir:
   - Bağlam içi Türkçe tanım
   - Örnek cümle (ve Türkçe çevirisi)
   - CEFR zorluk seviyesi (A1-C2)
   - Fiil çekimleri ve phrasal verb'ler
3. **Kişiselleştirilmiş Filtreleme**: Sistem senin bildiğin kelimeleri filtreler.
4. **Odaklanmış Öğrenme**: Sadece **bilmediğin kelimeler** gösterilir - o içerikte gerçekten geçen ve senin seviyene uygun olanlar.
5. **Kendi Listeni Oluştur**: Kelimeleri "Biliyorum" olarak işaretleyebilir veya özel listenize ekleyebilirsiniz.

**Sonuç:** Rastgele kelime listeleri yerine, izlediğin yapımda geçen ve senin bilmediğin kelimeleri, AI tarafından oluşturulmuş kaliteli içeriklerle öğrenirsin.

---

### 🏗️ Ana Kavramlar ve Aktörler

#### 1️⃣ Media (Film / Dizi / Bölüm)

Sistemdeki her film, dizi sezonu veya bölümü temsil eder.

#### 2️⃣ Word (Kelime)

Sistemdeki **benzersiz kelimeler** ve bunların AI tarafından üretilmiş detaylı tanımları (`WordDefinition`).

#### 3️⃣ Pipeline & PipelineStatus

Kelimelerin AI zenginleştirme sürecindeki durumunu takip eder (PENDING, PROCESSED, FAILED).

#### 4️⃣ WordList

Kullanıcıların oluşturduğu özel kelime listeleri veya sistem tarafından otomatik oluşturulan (Standard, Unknown) listeler.

#### 5️⃣ User & Progress

Kullanıcının hangi medyada ne kadar ilerlediğini ve hangi kelimeleri öğrendiğini takip eder.

---

### ⚙️ Sistem Nasıl Çalışıyor?

#### 📋 A) İçerik Hazırlama (Admin & Otomasyon)

1. **İçerik Keşfi**: Sistem TMDB entegrasyonu ile film/dizi meta verilerini çeker.
2. **Altyazı Edinme**: **OpenSubtitles API** veya web scraping ile altyazılar otomatik olarak bulunur ve indirilir.
3. **Altyazı İşleme**:
   - Zaman damgaları ve gürültü temizlenir.
   - Kelime frekansları hesaplanır (`MediaWord`).
4. **AI Enrichment Pipeline**:
   - **Sheriff**: Kelimeyi analiz eder ve detayları oluşturur.
   - **Specialist**: Tanım ve örnekleri kontrol eder, gerekirse düzeltir.
   - **Judge**: Son kalite kontrolünü yapar ve onaylar.

#### 👤 B) Kullanıcı Tarafı – Kelime Öğrenme

1. **Kullanıcı Keşfeder**: Popüler veya yeni eklenen medyalar arasından seçim yapar.
2. **Seviye Analizi**: Sistem, kullanıcının o medyada bilmediği kaç kelime olduğunu seviye bazlı (A1, B2 vb.) gösterir.
3. **Listelerle Çalışma**:
   - **Unknown Words List**: O medyada bilmediğin tüm kelimeler.
   - **My Lists**: Kendi oluşturduğun özel listeler.
4. **Çalışma ve Test (Quiz) Modları**:
   - Kelimeleri Liste veya **Flashcard (Kart)** görünümünde çalışma.
   - Otomatik seslendirme (TTS) ile tam liste dinleme seansları.
   - Dinleme, boşluk doldurma ve çoktan seçmeli sorularla desteklenmiş test (Study) modülü ve SRS (Spaced Repetition System) ilerleme takibi.
5. **Etkileşim**: Kelimelere tıklayarak detaylı AI tanımlarını görür, telaffuz dinler veya "Biliyorum" olarak işaretler.

**Formül:**

```
Gösterilecek Kelimeler = (Media Kelimeleri - Kullanıcının Bildikleri) + AI Zenginliği
```

---

## Uygulamalar

### Backend

Backend API sunucusu, veri yönetimi ve iş mantığını sağlar.

**Teknolojiler:**

- Java 25
- Spring Boot
- YAML (konfigürasyon dosyaları)

**Özellikler:**

- 🧠 AI Zenginleştirme Süreci (Sheriff, Specialist, Judge pipeline)
- 🔔 Firebase Cloud Messaging (FCM) entegrasyonu ve Admin Paneli bildirim gönderimi
- 📧 Güvenli e-posta doğrulama ve hesap kurtarma servisleri
- 📊 TMDB ile içerik eşleştirme ve otomatik OpenSubtitles entegrasyonu

**Detaylı bilgi için:** [backend/README.md](./backend/README.md)

### Web

React ile geliştirilmiş web arayüzü, tarayıcı üzerinden erişim sağlar.

**Teknolojiler:**

- React
- TypeScript
- Context API (kullanıcı kimlik doğrulama vb.)
- Zustand (global state yönetimi)

**Özellikler:**

- 🌓 Gelişmiş Ayarlar Menüsü (Dark/Light Mode ve Tema özelleştirmeleri)
- 🌍 Çoklu dil desteği (i18n)
- 🎧 Tercih edilebilir otomatik telaffuz (TTS) ayarları
- 🗂️ Kullanıcı listelerinde **Flashcard Modu**
- 🎬 Medya ve bölümler için "İzlendi" olarak işaretleme sistemi
- 💬 Geri Bildirim ve İçerik Talep sayfaları
- 🎭 Auth (Giriş) ekranlarında hareketli Mascot (Lottie) animasyonları

**Detaylı bilgi için:** [web/README.md](./web/README.md)

### Mobile

React Native ile geliştirilmiş mobil uygulama, iOS ve Android platformlarında çalışır.

**Teknolojiler:**

- React Native (Expo)
- TypeScript
- Context API (kullanıcı kimlik doğrulama vb.)
- Zustand (global state yönetimi)

**Özellikler:**

- 🌓 Gelişmiş UI/UX ve Dark/Light mode desteği
- 🌍 Çoklu dil desteği (i18n) ve Plus Jakarta Sans özel font mimarisi
- 🚀 Animasyonlu (Lottie) Mascot eşliğinde interaktif **Onboarding Tour (Kullanıcı Rehberi)**
- 🔔 Bildirim Kutusu ve ayarlanabilir Anlık Bildirim (Push Notification) tercihleri
- 📸 **Optik Okuyucu** (Kamera/Görsel üzerinden kelime analiz edebilme)
- 🎧 Listelerde duraklatılabilir **Auto-Play TTS** (Otomatik Kelime Seslendirme)
- 🎓 Gelişmiş Study (Test) akışı, SRS takibi ve yüksek çözünürlüklü Recap (Özet) ekranı

**Detaylı bilgi için:** [mobile/README.md](./mobile/README.md)

## Genel Mimari

Her uygulama bağımsız olarak geliştirilmiş ve kendi README dosyasında detaylı kurulum ve kullanım talimatlarına sahiptir. Uygulamalar birbirleriyle API üzerinden iletişim kurarlar.

## Başlangıç

Her bir uygulamanın kurulum ve çalıştırma talimatları için ilgili klasördeki README dosyalarını inceleyiniz:

1. Backend kurulumu ve çalıştırılması için `backend/README.md`
2. Web uygulaması için `web/README.md`
3. Mobil uygulama için `mobile/README.md`

## Geliştirme

Detaylı geliştirme talimatları ve standartları her bir uygulamanın kendi README dosyasında bulunmaktadır.

### Geliştirme İş Akışı

Proje geliştirirken aşağıdaki kurallara uyulmalıdır:

#### 1. Özellik Ekleme

- ✅ Her yeni özellik eklendiğinde ilgili README dosyası güncellenmeli
- ✅ Ana proje README'si gerektiğinde güncellenmelidir

#### 2. Commit Standartları

- ✅ Her özellik tamamlandığında commit yapılmalı
- ✅ Commit mesajları standart formatta olmalı:
  ```
  feat: [özellik açıklaması]
  fix: [düzeltme açıklaması]
  docs: [dokümantasyon değişikliği]
  test: [test ekleme/güncelleme]
  refactor: [kod iyileştirme]
  ```

#### 3. Test Politikası

- ✅ Test edilebilir her özellik mutlaka test edilmelidir
- ✅ Testler ilgili uygulamanın test klasöründe yer almalıdır
- ✅ Commit öncesi testler çalıştırılmalıdır

---

## 📝 Yapılacak İşler / İyileştirmeler (To-Do)

Bu bölümde, projenin mimarisini ve kullanıcı deneyimini geliştirmek için planlanan veya üzerinde çalışılması gereken maddeler yer almaktadır:

### 1. Splash Screen ve App Initialization (İlk Veri Çekme Optimizasyonu)
**Konu:** Uygulama ilk açıldığında temel verilerin ne zaman ve nasıl çekildiği.
- **Mevcut Durum:** 
  Şu anda filmler, diziler ve kelime listeleri (`useMedia`, `useLists`); kullanıcı uygulamayı açıp anasayfa (Discover) veya Listeler sekmesine girdiğinde sayfa bazlı (React Query ile) çekilmektedir. Filmlerin ve dizilerin *içindeki kelimelerin listesi* ise sadece o yapıma tıklanıp detayına (`ListScreen`) girildiğinde yüklenmektedir.
- **Yapılması Gereken (To-Do):** 
  Uygulamanın başlangıcında (henüz Splash Screen ekrandayken veya bir açılış/yükleme ekranındayken) tüm kritik öncelikli verileri (kullanıcının devam eden dizileri, temel listeleri ve app ayarları) tek bir servisten (örn: `/api/app-init`) çekecek bir mekanizma kurulması. Bu sayede kullanıcı ana ekrana düştüğünde hiçbir "Loading" animasyonu görmeyecek ve ekranlar anında dolu olarak açılacaktır.
