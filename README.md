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

## Geliştirme Kuralları (Development Guidelines)

**Kritik Kural - UI Eşitliği (Parity):** 
Mobil uygulamada (mobile) yapılan herhangi bir kullanıcı arayüzü (UI) veya özellik güncellemesi, **mutlaka** web platformuna (web) da birebir yansıtılmalıdır. İki platform arasında görsel ve işlevsel farklılık/eksiklik olmamalıdır.

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
**Konu:** Uygulama ilk açıldığında temel verilerin ne zaman ve nasıl çekildiği ve Yavaş İnternet/Beyaz Ekran sorununun çözümü.
- **Mevcut Durum:** 
  Şu anda filmler, diziler ve kelime listeleri (`useMedia`, `useLists`); kullanıcı uygulamayı açıp anasayfa (Discover) veya Listeler sekmesine girdiğinde sayfa bazlı çekilmektedir. Filmlerin ve dizilerin *içindeki kelimelerin listesi* ise sadece o yapıma tıklanıp detayına girildiğinde yüklenmektedir. İnternet kötü olduğunda veya backend yavaş yanıt verdiğinde anasayfa uzun süre **beyaz ekran** olarak kalabilmektedir.
- **Yapılması Gereken (To-Do):** 
  * **Onboarding Prefetching (Ön Yükleme):** Kullanıcı uygulamayı ilk indirdiğinde 6-7 sayfalık "Onboarding" (Tanıtım) ekranlarını okurken, arka planda gizlice bir `/api/app-init` servisinin çağrılması.
  * Bu servis sayesinde kullanıcı tanıtımı bitirip ana ekrana geçene kadar (15-20 saniye içinde) tüm kritik öncelikli veriler (popüler filmler, kullanıcının listeleri vb.) indirilmiş ve hazır bekletilmiş olacak.
  * **Temel Amaç:** İnternet yavaş bile olsa, kullanıcı anasayfaya düştüğünde hiçbir "Loading" animasyonu veya rahatsız edici beyaz ekran görmeden anında dolu bir ekranla karşılaşmasını sağlamak.

### 2. AsyncStorage / Cache Stratejisi ve Performans Optimizasyonu

**Konu:** Mobil uygulamada hangi veriler cihazda (AsyncStorage) saklanıyor, hangileri saklanmıyor ve gereksiz API çağrıları nerede oluşuyor.

#### A) Şu An AsyncStorage'da Saklanan Veriler (Mevcut Durum)
| Dosya | Saklanan Veri | Mekanizma |
|-------|--------------|-----------|
| `authStore.ts` | Token, kullanıcı bilgileri, onboarding durumu | Zustand + `persist` |
| `settingsStore.ts` | Tema, dil, ses tercihleri, palet | Zustand + `persist` |
| `streakStore.ts` | Günlük seri (streak) sayacı | Zustand + `persist` |
| `guidedFlowStore.ts` | Rehber akışı tamamlandı mı? | Manuel `AsyncStorage.setItem` |
| `tourStore.ts` | Discover tour tamamlandı mı? | Manuel `AsyncStorage.setItem` |
| `vocabTourStore.ts` | Vocabulary tour tamamlandı mı? | Manuel `AsyncStorage.setItem` |
| `listsTourStore.ts` | Lists tour tamamlandı mı? | Manuel `AsyncStorage.setItem` |
| `exploreTourStore.ts` | Explore tour tamamlandı mı? | Manuel `AsyncStorage.setItem` |
| `ListScreen.tsx` | Play/View/Quiz hint gösterildi mi? | Manuel `AsyncStorage.setItem` |
| `useListPreferences.ts` | Liste görünüm tercihleri (sıralama, gruplama) | Manuel `AsyncStorage` |
| `i18n/index.ts` | Seçili uygulama dili | Manuel `AsyncStorage` |

#### B) AsyncStorage'da Saklanmayan Ama Saklanması Gereken Veriler (Performans Açıkları)

1. **React Query Cache Persistence YOK**
   - **Sorun:** `queryClient` ayarlarında `gcTime: 24 saat` tanımlı ama `persistQueryClient` (AsyncStorage'a yazma) kullanılmamış. Uygulama kapatılıp açıldığında tüm cache sıfırdan çekiliyor.
   - **Çözüm:** `@tanstack/react-query-persist-client` + `createAsyncStoragePersister` entegrasyonu yapılmalı. Bu sayede medya listesi, kelime listeleri gibi veriler uygulama kapansa bile tekrar açıldığında cache'den gelir, boş beyaz ekran gösterilmez.

2. **Kullanıcı Bilinen Kelimeler (`knownWords`) Her Seferinde Sunucudan Çekiliyor**
   - **Sorun:** `useKnownWords()` hook'unda `staleTime` tanımlı değil (varsayılan 5 dk). Kelime sayısı arttıkça (örn. 500+ kelime) her 5 dk'da bir tüm liste tekrar çekiliyor. Yavaş internette bu ciddi gecikmeye neden olur.
   - **Çözüm:** Bilinen kelimeler AsyncStorage'da da tutulmalı ve sunucu ile delta (fark) senkronizasyonu yapılmalı.

3. **`useLists()` Hook'unda `staleTime` Tanımsız**
   - **Sorun:** Kullanıcının kelime listeleri için `staleTime` belirtilmemiş (varsayılan 5 dk). Listeler nadiren değişir ama her ekran geçişinde potansiyel olarak yeniden çekilebilir.
   - **Çözüm:** `staleTime: 1000 * 60 * 15` (15 dakika) veya daha uzun yapılmalı.

4. **`useListDetail()` Hook'unda Cache Yok**
   - **Sorun:** Bir kelime listesinin detayı (içindeki tüm kelimeler) her girişte sunucudan tekrar çekiliyor. Eğer listede 200+ kelime varsa ve internet yavaşsa bu ciddi bir gecikme yaratır.
   - **Çözüm:** Liste detayları için en az `staleTime: 1000 * 60 * 10` (10 dakika) eklenmeli.

5. **`useMediaWords()` Hook'unda Cache Yok**
   - **Sorun:** Bir film/dizideki kelimelere her girildiğinde sunucudan tekrar çekiliyor. Kelime sayısı yüksekse (500-2000) ve internet yavaşsa ciddi bekleme süresi oluşur.
   - **Çözüm:** `staleTime: 1000 * 60 * 15` eklenmeli; kelimeler nadiren değişir.

6. **`useMediaDetail()` Hook'unda Cache Yok**
   - **Sorun:** Film/dizi detayı her seferinde sunucudan çekiliyor. Bu veri neredeyse hiç değişmez.
   - **Çözüm:** `staleTime: 1000 * 60 * 30` (30 dakika) veya daha uzun yapılmalı.

7. **`useSeriesEpisodes()` Hook'unda Cache Yok**
   - **Sorun:** Bir dizinin bölüm listesi her girişte yeniden çekiliyor. Bu veri hiç değişmez.
   - **Çözüm:** `staleTime: Infinity` veya çok uzun bir süre yapılmalı.

8. **`useContinueLearning()` Her Focus'ta Yeniden Çekiliyor**
   - **Sorun:** `staleTime: 0` + `useFocusEffect` ile her ekrana dönüşte sunucuya istek atılıyor. Tablar arası hızlı geçişlerde gereksiz yük oluşturur.
   - **Çözüm:** `staleTime: 1000 * 60 * 2` (2 dakika) yapılmalı, `useFocusEffect` içindeki zoraki refetch kaldırılmalı.

9. **DiscoverScreen'de `useFocusEffect` ile Gereksiz Refetch**
   - **Sorun:** `refetchLists()` ve `refetchContinue()` her focus'ta zoraki çağrılıyor. React Query'nin kendi stale/refetch mekanizması varken bu gereksiz sunucu yükü oluşturur.
   - **Çözüm:** `staleTime` değerleri düzgün ayarlanırsa `useFocusEffect` refetch'leri kaldırılabilir.

10. **`useUserStats()` Hook'unda Cache Yok**
    - **Sorun:** Kullanıcı istatistikleri (toplam bilinen kelime sayısı vb.) her seferinde sunucudan çekiliyor.
    - **Çözüm:** `staleTime: 1000 * 60 * 5` (5 dakika) eklenmeli.

11. **`useMarkKnownBatch()` Paralel İstek Patlaması**
    - **Sorun:** Toplu "biliyorum" işaretlemede her kelime için ayrı bir `Promise.all` API çağrısı yapılıyor. 20 kelime = 20 paralel HTTP isteği. Yavaş internette bazıları timeout olabilir.
    - **Çözüm:** Backend'e toplu `/api/words/mark-known-batch` endpoint'i eklenmeli, tek bir istekle işlenmeli.

#### C) Öncelik Sıralaması
| Öncelik | İş | Etki |
|---------|-----|------|
| **P0 - Kritik** | React Query Persistence (cache'i AsyncStorage'a yaz) | Uygulama kapanıp açılınca beyaz ekran sorunu tamamen çözülür |
| **P0 - Kritik** | `useMediaWords`, `useListDetail` staleTime ekle | Yavaş internette liste/film detayları anında görünür |
| **P1 - Yüksek** | `useContinueLearning` staleTime > 0 yap, gereksiz refetch kaldır | Tab geçişlerinde gereksiz API çağrıları engellenir |
| **P1 - Yüksek** | Bilinen kelimeler delta sync | Büyük veri transferi azalır |
| **P2 - Orta** | `useMarkKnownBatch` tek endpoint | Ağ yükü 20x azalır |
| **P2 - Orta** | Diğer hook'lara staleTime ekle | Genel performans iyileşir |

### 3. TTS (Otomatik Seslendirme) Arka Plan ve Sessiz Mod Sorunları

**Konu:** Kelime listelerinde "Çal" butonuna basıldığında başlayan otomatik seslendirme (Auto-Play TTS) özelliğinin iki kritik sorunu var.

#### Sorun 1: Arka Plana Atılınca veya Ekran Kapanınca TTS Duruyor
- **Mevcut Durum:** Kullanıcı seslendirmeyi başlatıp telefonun ekranını kapatırsa veya uygulamayı arka plana atarsa (örn. başka bir uygulamaya geçerse), seslendirme tamamen duruyor ve kaldığı yerden devam etmiyor.
- **Beklenen Davranış:** Tıpkı bir podcast veya müzik uygulaması gibi, ekran kapalıyken veya uygulama arka plandayken seslendirme devam etmeli. Kilit ekranında oynatma kontrolleri (duraklat/devam) görünmeli.
- **Teknik Çözüm Önerisi:**
  * `expo-av` yerine veya yanında `react-native-track-player` gibi bir arka plan ses kütüphanesi entegre edilmeli.
  * iOS için `Info.plist`'te `UIBackgroundModes: ["audio"]` ayarı aktif edilmeli.
  * Android için Foreground Service ile ses çalma desteği sağlanmalı.
  * Alternatif: TTS motorundan gelen sesleri birer ses dosyasına (buffer) dönüştürüp `TrackPlayer` kuyruğuna eklemek.

#### Sorun 2: Telefon Sessiz Moddayken (Mute Switch) Ses Çalmıyor
- **Mevcut Durum:** iPhone'un yan tarafındaki fiziksel sessiz (mute) anahtarı açıkken, uygulama içindeki tüm TTS sesleri ve telaffuz sesleri tamamen susturuluyor. Kullanıcı sesli çalışma yapamıyor.
- **Beklenen Davranış:** Sessiz mod açık olsa bile, kullanıcı uygulama içinde bilinçli olarak "Çal" butonuna bastıysa sesin çalması gerekir (Spotify, YouTube gibi medya uygulamalarının davranışı).
- **Teknik Çözüm Önerisi:**
  * iOS'ta `AVAudioSession` kategori ayarının `ambient` yerine `playback` olarak değiştirilmesi gerekiyor. Bu, sessiz anahtarını bypass eder.
  * Expo'da bu ayar `expo-av`'nin `Audio.setAudioModeAsync({ playsInSilentModeIOS: true })` fonksiyonu ile yapılabilir.
  * Android'de zaten medya ses kanalı (STREAM_MUSIC) kullanıldığı için bu sorun genellikle oluşmaz.

### 4. UI Akıcılığı, Performans ve Modernizasyon (Animasyonlar, Butonlar, Listeler)

**Konu:** Uygulamanın hissiyatını (feel) daha modern, akıcı ve premium hale getirmek için yapılması gereken teknik güncellemeler.

#### A) `FlatList` Yerine `FlashList` (Shopify) Kullanımı
- **Mevcut Durum:** Uygulama genelinde (`ListScreen`, `VocabularyScreen`, `DiscoverScreen`, `MediaDetailScreen` vb.) listeleme için standart React Native `FlatList` kullanılıyor. 
- **Sorun:** Özellikle kullanıcının listesinde veya bir filmde 200+ kelime olduğunda, kaydırma sırasında FPS düşüşleri (kasmalar) ve bellek (RAM) şişmesi yaşanıyor.
- **Çözüm:** Tüm uzun listeler Shopify'ın `@shopify/flash-list` kütüphanesine geçirilmeli. Cell-recycling (hücre geri dönüşümü) sayesinde 5x daha akıcı kaydırma (60/120 FPS) sağlanır.

#### B) `TouchableOpacity` Yerine Modern `Pressable` + Reanimated (Haptic Feedback)
- **Mevcut Durum:** Uygulamadaki butonlar, kartlar ve tıklanabilir alanların %90'ında standart `TouchableOpacity` kullanılmış.
- **Sorun:** Sadece opaklık değişimi modern bir hissiyat vermiyor. Kullanıcı etkileşimi zayıf hissettiriyor. Ayrıca buton hit (tıklama) alanları (`hitSlop`) yetersiz bırakılmış.
- **Çözüm:** 
  1. Standart `TouchableOpacity` yerine React Native'in `Pressable` bileşeni (veya `react-native-gesture-handler`'ın tıklama bileşenleri) kullanılmalı.
  2. Tıklamalarda küçülme/büyüme animasyonları (`react-native-reanimated` ile scale animasyonları) eklenmeli.
  3. Buton tıklamalarında (özellikle listeye ekleme, kelimeyi öğrendim işaretleme gibi aksiyonlarda) `expo-haptics` ile hafif titreşim (haptic feedback) verilmeli.

#### C) Görsel (Image) Optimizasyonu
- **Mevcut Durum:** Uygulama genelinde React Native'in kendi `<Image>` componenti kullanılmış.
- **Sorun:** Film ve dizi posterlerinin yüklendiği sayfalarda (`DiscoverScreen`, `ExploreScreen`) listeler kaydırıldıkça resimler bellekte yer kaplıyor ve eski resimlerin renderlanması sorun yaratıyor.
- **Çözüm:** `expo-image` kütüphanesine geçilmeli. Disk ve memory caching (önbellekleme) sayesinde resimler anında yüklenir ve bellek taşması önlenir.

#### D) Flashcard ve Guided Flow Optimizasyonu
- **Mevcut Durum:** Rehber akışında (Guided Flow) ve kart çevirme animasyonlarında (`FlashCard.tsx`) Reanimated kullanılsa da, kartın içeriğindeki render yükü (iç içe ScrollView'lar, çok fazla bileşen) ağır olduğu için jest/kaydırma anlarında droplar olabiliyor.
- **Çözüm:** 
  1. Kart çevirme (flip) animasyonu sadece kart yüzeyi değiştiğinde tetiklenmeli, React render döngüsünden tamamen bağımsız (worklet) çalıştırılmalı.
  2. Kartların arka planları için modern UI blur efektleri (Glassmorphism, `expo-blur`) ve hafif gölgeler eklenebilir.
