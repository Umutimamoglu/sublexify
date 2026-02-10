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

1. **İzlediğin içerik**'in altyazısı Sublex'e yüklenir (örn. Mr. Robot S01)
2. Sistem altyazıyı **otomatik analiz eder** ve tüm kelimeleri frekanslarıyla birlikte çıkarır
3. **Sen giriş yaptığında**, sistem senin bildiğin kelimeleri filtreler
4. Sadece **bilmediğin kelimeler** gösterilir - o içerikte gerçekten geçen kelimeler
5. Kelimelere tıklayarak "**biliyorum**" işaretlersin ve bir daha gösterilmez

**Sonuç:** Rastgele kelime listeleri yerine, izlediğin yapımda geçen ve senin bilmediğin kelimeleri öğrenirsin.

---

### 🏗️ Ana Kavramlar ve Aktörler

#### 1️⃣ Media (Film / Dizi / Bölüm)

Sistemdeki her film, dizi sezonu veya bölümü temsil eder.

**Örnekler:**
- Inception (2010)
- Mr. Robot – Season 1
- Mr. Robot – S01E03

Her Media kaydı ID, isim, IMDb ID gibi bilgileri içerir.

#### 2️⃣ Word (Kelime)

Sistemdeki **benzersiz kelimeler**. Her kelime sadece bir kez saklanır.

**Örnekler:**
- "computer"
- "hack"
- "society"

Bir kelime birçok farklı Media'da geçebilir.

#### 3️⃣ MediaWord (İlişki Tablosu)

**"Bu kelime, bu yapımda kaç kez geçti?"** sorusunun cevabı.

**Örnek:**
- Media: Mr. Robot S01
- Word: "hack"
- Count: 37

#### 4️⃣ User (Kullanıcı)

Email ve şifre ile giriş yapan kullanıcılar.

#### 5️⃣ UserKnownWord (Bilinen Kelimeler)

**Her kullanıcının bildiği kelimelerin** kişisel listesi.

**Örnek:**
- User: Umut
- Word: "hack"
- → Umut bu kelimeyi biliyor

Bu bilgi tamamen kişiseldir; farklı kullanıcılar farklı kelimeler bilir.

---

### ⚙️ Sistem Nasıl Çalışıyor?

#### 📋 A) Admin Tarafı – Altyazı Hazırlama

1. **Admin panele giriş** yapar
2. **Yeni Media oluşturur** (örn. Mr. Robot S01)
3. **Altyazı dosyası yükler** (.srt veya .zip içinde .srt)
4. **Sistem otomatik işleme başlar:**
   - Zaman damgalarını temizler (`00:01:23,456 --> 00:01:25,789`)
   - HTML etiketlerini kaldırır (`<i>hello</i>` → `hello`)
   - Noktalama işaretlerini temizler (`"Hello, world!"` → `Hello world`)
   - Cümleleri kelimelere böler
   - Küçük/büyük harf normalize eder (`Hello` = `hello`)
   - **Frekans hesaplar:** Her kelimeden kaç tane geçtiğini sayar
5. **Sonuç:**
   - `Word` tablosunda kelimeler
   - `MediaWord` tablosunda frekanslar

Bu işlem **bir kere yapılır** ve Media hazır hale gelir.

#### 👤 B) Kullanıcı Tarafı – Kelime Öğrenme

1. **Kullanıcı giriş yapar**
2. **Media listesinden** bir yapım seçer (örn. Mr. Robot S01)
3. **Sistem şu adımları gerçekleştirir:**
   - `MediaWord` üzerinden tüm kelimeleri ve frekanslarını çeker
   - `UserKnownWord` tablosuna bakarak kullanıcının bildiği kelimeleri filtreler
   - **Sadece bilmediği kelimeleri** gösterir
4. **Kullanıcı ekranda görür:**
   ```
   society – 23 kez
   vulnerable – 7 kez
   encryption – 4 kez
   ```
5. **"Biliyorum" butonuna tıklar:**
   - Sistem `UserKnownWord`'e kelimeyi ekler
   - Kelime UI'dan anında kaybolur
6. **Bir sonraki sefer:**
   - O kelime artık görünmez

**Formül:**
```
Gösterilecek Kelimeler = Media Kelimeleri - Kullanıcının Bildikleri
```

---

## Uygulamalar

### Backend
Backend API sunucusu, veri yönetimi ve iş mantığını sağlar.

**Teknolojiler:**
- Java 25
- Spring Boot
- YAML (konfigürasyon dosyaları)

**Detaylı bilgi için:** [backend/README.md](./backend/README.md)

### Web
React ile geliştirilmiş web arayüzü, tarayıcı üzerinden erişim sağlar.

**Teknolojiler:**
- React
- TypeScript
- Context API (kullanıcı kimlik doğrulama vb.)
- Zustand (global state yönetimi)

**Özellikler:**
- 🌓 Dark/Light mode desteği
- 🌍 Çoklu dil desteği (i18n)

**Detaylı bilgi için:** [web/README.md](./web/README.md)

### Mobile
React Native ile geliştirilmiş mobil uygulama, iOS ve Android platformlarında çalışır.

**Teknolojiler:**
- React Native (Expo)
- TypeScript
- Context API (kullanıcı kimlik doğrulama vb.)
- Zustand (global state yönetimi)

**Özellikler:**
- 🌓 Dark/Light mode desteği
- 🌍 Çoklu dil desteği (i18n)

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

