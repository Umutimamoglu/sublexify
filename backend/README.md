# Backend API

Sublex platformunun backend API sunucusu. Film ve dizi altyazılarından kelime analizi yaparak kullanıcılara kişiselleştirilmiş kelime listeleri sunar.

## 🎯 Amaç

Bu backend servisi şu görevleri yerine getirir:

1. **Altyazı İşleme**: .srt dosyalarını parse ederek kelimeleri çıkarır ve frekans hesaplar
2. **Kelime Yönetimi**: Benzersiz kelimeleri saklar ve media ilişkilerini yönetir
3. **Kullanıcı Yönetimi**: Kimlik doğrulama ve kullanıcı verilerini yönetir
4. **Kişiselleştirilmiş Filtreleme**: Her kullanıcının bildiği kelimeleri filtreleyerek sadece bilmediklerini döner

## Teknolojiler

- **Java 25** - Modern Java özellikleri ile geliştirilmiş
- **Spring Boot 4.x** - En güncel Spring Boot sürümü
- **AI Clients**: Gemini (Google), Anthropic (Claude), OpenAI entegrasyonları
- **Subtitle Scraping**: Jsoup (Web scraping) ve OpenSubtitles API
- **Annotation Processing**: Lombok (Kod sadeleştirme)
- **Spring Data JPA & PostgreSQL** - Veri yönetimi (Optimizasyon: Kritik tablolarda 22 adet Index yapılandırması)
- **Spring Security & JWT** - Kimlik doğrulama
- **Gzip Compression** - API yanıtlarında veri sıkıştırma ile 5-7x daha az ağ kullanımı

## Domain Model (Yeni Eklenenler)

### 🤖 WordDefinition

Kelimenin AI tarafından üretilmiş detaylı sözlük karşılığı.

**Alanlar:**

- `difficulty`: A1-C2 seviyesi
- `definitions`: POS bazlı tanımlar (JSON)
- `examples`: Örnek cümleler ve çevirileri (JSON)
- `phrasalVerbs`: İlgili phrasal verb'ler

### 📋 WordList

Kullanıcıların veya sistemin oluşturduğu kelime listeleri.

- `Standard`: Herkesin erişebildiği (Oxford 3000 vb.)
- `User`: Kullanıcının kendi oluşturdukları
- `Unknown`: Bir medyadan çıkarılan bilmediğin kelimeler

### 📈 UserMediaProgress

Kullanıcının bir filmi/diziyi ne kadarını "öğrendiğini" takip eder.

## Proje Yapısı (Gelişmiş Servisler)

```
backend/
├── service/
│   ├── ai/                # AI Sağlayıcıları (Gemini, Anthropic, OpenAI)
│   ├── pipeline/          # AI Enrichment Hattı (Sheriff, Specialist, Judge)
│   ├── scraper/           # Altyazı Scraper'lar (OpenSubtitles, TMDB)
│   ├── AuditService.java  # Sistem loglama ve denetleme
│   ├── WordAnalysisService.java # Dilbilimsel analiz
│   └── WordListService.java # Liste yönetimi
```

## AI Enrichment Pipeline

Bu backend'in en kritik parçası, kelimeleri anlamlı verilere dönüştüren 3 aşamalı AI hattıdır:

1. **Sheriff (Şerif)**: Kelimeyi ilk analiz eden, tanım ve örnekleri oluşturan ana ajan. (Kısa ve tek kelimelik agresif çeviri kısıtlamalarına sahip prompt mimarisi)
2. **Specialist (Uzman)**: Şerif'in ürettiği veriyi dilbilgisi ve doğallık açısından kontrol eden ajan. (`gpt-5.4-mini` destekli yüksek hız)
3. **Judge (Hakim)**: Son kalite kontrolünü yapan ve veritabanına kaydı onaylayan ajan.

## Altyazı Edinme ve İşleme

Sistem sadece yüklenen dosyaları değil, internetteki altyazıları da otomatik bulur:

1. **YTS & OpenSubtitles Scraping**: Popüler kaynaklardan altyazı linklerini çeker.
2. **TMDB Integration**: Film afişi, türü ve oyuncu bilgilerini otomatik eşleştirir.
3. **SubtitleParser**: SRT ve ASS formatlarını yüksek doğrulukla işler (reklamları ve gürültüleri filtreler).

## API Endpoint'leri (Genişletilmiş)

### 📋 Word Lists (`/api/lists`)

- `GET /api/lists`: Kullanıcının tüm listeleri
- `GET /api/lists/standard`: Sistem listeleri
- `POST /api/lists`: Yeni liste oluştur
- `POST /api/lists/{id}/words/{wordId}`: Listeye kelime ekle

### 👨‍💼 Admin & Pipeline (`/api/admin`)

- `POST /api/admin/pipeline/process`: Bekleyen kelimeleri işle
- `GET /api/admin/pipeline/stats`: Pipeline durumunu gör
- `POST /api/admin/media/scrape`: Altyazıları internetten çek

## Kişiselleştirilmiş Kelime Filtreleme

### WordService

Kullanıcının bilmediği kelimeleri döndürmek için:

```sql
SELECT w.*, mw.count
FROM media_word mw
JOIN word w ON mw.word_id = w.id
WHERE mw.media_id = ?
  AND w.id NOT IN (
    SELECT word_id
    FROM user_known_word
    WHERE user_id = ?
  )
ORDER BY mw.count DESC
```

## Kurulum

### Gereksinimler

- Java 25 JDK
- Maven 3.9+
- PostgreSQL 15+

### Adımlar

1. **Bağımlılıkları yükleyin:**

```bash
mvn clean install
```

2. **PostgreSQL veritabanı oluşturun:**

```sql
CREATE DATABASE sublex;
```

3. **Konfigürasyon dosyasını düzenleyin:**

```bash
cp src/main/resources/application.yml.example src/main/resources/application.yml
```

4. **application.yml'i düzenleyin:**

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/sublex
    username: your_username
    password: your_password
```

5. **Uygulamayı çalıştırın:**

```bash
mvn spring-boot:run
```

API `http://localhost:8080` adresinde çalışacaktır.

## Konfigürasyon

`src/main/resources/application.yml`:

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/sublex
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect

  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000 # 24 saat

logging:
  level:
    com.sublex: DEBUG
```

## Test

### Unit Testler

```bash
mvn test
```

### Integration Testler

```bash
mvn verify
```

## API Dokümantasyonu

Swagger UI: `http://localhost:8080/swagger-ui.html`

## Ortam Değişkenleri

| Değişken      | Açıklama                 | Varsayılan |
| ------------- | ------------------------ | ---------- |
| `DB_USERNAME` | PostgreSQL kullanıcı adı | -          |
| `DB_PASSWORD` | PostgreSQL şifresi       | -          |
| `JWT_SECRET`  | JWT secret key           | -          |
| `SERVER_PORT` | Sunucu portu             | 8080       |

## Production Build

```bash
mvn clean package -DskipTests
java -jar target/sublex-backend-1.0.0.jar
```

## Docker

```bash
docker build -t sublex-backend .
docker run -p 8080:8080 \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e JWT_SECRET=your-secret \
  sublex-backend
```

## Geliştirme İş Akışı

1. Domain model/entity oluştur
2. Repository interface tanımla
3. Service katmanını implement et
4. DTO'ları oluştur
5. Controller endpoint'lerini ekle
6. Unit ve integration testler yaz
7. Swagger annotationları ekle
8. README'yi güncelle
9. Commit yap: `feat: [özellik açıklaması]`

## Güvenlik

- ✅ JWT tabanlı kimlik doğrulama
- ✅ BCrypt şifre hashleme
- ✅ CORS konfigürasyonu
- ✅ Request validation
- ✅ SQL injection koruması (JPA)
- ✅ XSS koruması
