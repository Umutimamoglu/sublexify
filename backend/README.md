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
- **Spring Boot 3.x** - Enterprise düzeyinde backend framework
- **Spring Data JPA** - ORM ve veritabanı işlemleri
- **Spring Security** - JWT tabanlı kimlik doğrulama
- **PostgreSQL** - İlişkisel veritabanı
- **YAML** - Konfigürasyon dosyaları
- **Swagger/OpenAPI** - API dokümantasyonu
- **Maven** - Dependency management

## Domain Model

### 🎬 Media
Film, dizi sezonu veya bölümü temsil eder.

**Alanlar:**
- `id`: Benzersiz kimlik
- `title`: Başlık (örn. "Mr. Robot S01")
- `imdbId`: IMDb ID (opsiyonel)
- `type`: MOVIE, SEASON, EPISODE
- `createdAt`: Oluşturulma zamanı

### 📝 Word
Sistemdeki benzersiz kelimeler.

**Alanlar:**
- `id`: Benzersiz kimlik
- `word`: Kelime (normalize edilmiş, küçük harf)
- `language`: Dil kodu (örn. "en", "tr")

### 🔗 MediaWord
Media ile Word arasındaki ilişki ve frekans bilgisi.

**Alanlar:**
- `id`: Benzersiz kimlik
- `mediaId`: Media referansı
- `wordId`: Word referansı
- `count`: Bu kelime bu media'da kaç kez geçti

### 👤 User
Kullanıcı hesapları.

**Alanlar:**
- `id`: Benzersiz kimlik
- `email`: Email (unique)
- `password`: Şifrelenmiş şifre (BCrypt)
- `name`: Kullanıcı adı
- `createdAt`: Kayıt tarihi

### ✅ UserKnownWord
Kullanıcının bildiği kelimeler.

**Alanlar:**
- `id`: Benzersiz kimlik
- `userId`: User referansı
- `wordId`: Word referansı
- `markedAt`: İşaretlenme zamanı

## Proje Yapısı

```
backend/
├── src/
│   ├── main/
│   │   ├── java/com/sublex/
│   │   │   ├── controller/          # REST API endpoints
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── MediaController.java
│   │   │   │   ├── WordController.java
│   │   │   │   └── AdminController.java
│   │   │   ├── service/             # İş mantığı
│   │   │   │   ├── SubtitleProcessingService.java
│   │   │   │   ├── MediaService.java
│   │   │   │   ├── WordService.java
│   │   │   │   └── UserService.java
│   │   │   ├── repository/          # Veri erişim katmanı
│   │   │   │   ├── MediaRepository.java
│   │   │   │   ├── WordRepository.java
│   │   │   │   ├── MediaWordRepository.java
│   │   │   │   ├── UserRepository.java
│   │   │   │   └── UserKnownWordRepository.java
│   │   │   ├── model/               # Entity modelleri
│   │   │   │   ├── Media.java
│   │   │   │   ├── Word.java
│   │   │   │   ├── MediaWord.java
│   │   │   │   ├── User.java
│   │   │   │   └── UserKnownWord.java
│   │   │   ├── dto/                 # Data Transfer Objects
│   │   │   │   ├── MediaDTO.java
│   │   │   │   ├── WordFrequencyDTO.java
│   │   │   │   ├── LoginRequest.java
│   │   │   │   └── SubtitleUploadRequest.java
│   │   │   ├── config/              # Konfigürasyon
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── SwaggerConfig.java
│   │   │   │   └── CorsConfig.java
│   │   │   ├── exception/           # Exception handling
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   └── CustomExceptions.java
│   │   │   └── util/                # Yardımcı sınıflar
│   │   │       ├── SubtitleParser.java
│   │   │       └── JwtUtil.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       └── application-prod.yml
│   └── test/
│       └── java/                    # Test sınıfları
├── pom.xml
└── README.md
```

## API Endpoint'leri

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/register` | Yeni kullanıcı kaydı |
| POST | `/login` | Giriş yap, JWT token al |
| POST | `/refresh` | Token yenile |

### 🎬 Media (`/api/media`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Tüm media listesi |
| GET | `/{id}` | Media detayı |
| GET | `/{id}/words` | Media'daki kullanıcının bilmediği kelimeler |

### 📝 Words (`/api/words`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/mark-known` | Kelimeyi biliyorum olarak işaretle |
| DELETE | `/unmark/{wordId}` | İşareti kaldır |
| GET | `/known` | Kullanıcının bildiği tüm kelimeler |

### 👨‍💼 Admin (`/api/admin`)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/media` | Yeni media oluştur |
| POST | `/media/{id}/subtitle` | Altyazı yükle ve işle |
| DELETE | `/media/{id}` | Media sil |

## Altyazı İşleme Akışı

### SubtitleProcessingService

1. **Dosya Upload**: .srt veya .zip dosyası alınır
2. **Parse İşlemi**:
   - Zaman damgaları temizlenir (`00:01:23,456 --> 00:01:25,789`)
   - HTML etiketleri kaldırılır (`<i>`, `<b>`, vb.)
   - Noktalama işaretleri temizlenir
   - Satır numaraları atlanır
3. **Kelime Çıkarma**:
   - Her satır kelimelere bölünür
   - Kelimeler normalize edilir (küçük harf)
   - Stop words (a, an, the, vb.) filtrelenebilir
4. **Frekans Hesaplama**:
   - Her kelimenin kaç kez geçtiği sayılır
5. **Veritabanı Kayıt**:
   - Kelimeler `Word` tablosuna eklenir (eğer yoksa)
   - Frekanslar `MediaWord` tablosuna kaydedilir

**Örnek:**
```java
@Service
public class SubtitleProcessingService {
    public void processSubtitle(Long mediaId, MultipartFile file) {
        // 1. Parse subtitle
        List<String> lines = parseSubtitleFile(file);
        
        // 2. Extract words
        Map<String, Integer> wordFrequency = new HashMap<>();
        for (String line : lines) {
            String[] words = cleanAndSplit(line);
            for (String word : words) {
                wordFrequency.merge(word, 1, Integer::sum);
            }
        }
        
        // 3. Save to database
        saveWordFrequencies(mediaId, wordFrequency);
    }
}
```

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
  expiration: 86400000  # 24 saat

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

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `DB_USERNAME` | PostgreSQL kullanıcı adı | - |
| `DB_PASSWORD` | PostgreSQL şifresi | - |
| `JWT_SECRET` | JWT secret key | - |
| `SERVER_PORT` | Sunucu portu | 8080 |

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
