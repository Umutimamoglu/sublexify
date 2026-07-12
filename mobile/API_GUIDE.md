# Sublex Mobile — Backend API Guide

Mobile platform geliştirme rehberi. Tüm API endpoint'leri, request/response formatları ve veri modelleri.

**Base URL:** `http://{SERVER_IP}:8080/api`

---

## Veri Modelleri

### Word

```json
{
  "id": 123,
  "word": "chemistry",
  "language": "en",
  "difficulty": "B2",
  "isEnriched": true,
  "isProperNoun": false,
  "definition": {
    "word": "chemistry",
    "difficulty": "B2",
    "meanings": [
      {
        "pos": "noun",
        "definition": "Kimya; maddelerin yapısını inceleyen bilim dalı",
        "example": "She studied chemistry at university. / Üniversitede kimya okudu."
      }
    ],
    "phrasal_verbs": [],
    "verb_forms": null
  }
}
```

### Media

```json
{
  "id": 1,
  "title": "Friends - Pilot",
  "type": "EPISODE",
  "language": "en",
  "imdbId": "tt0583459",
  "tmdbId": 85271,
  "totalWords": 1245,
  "overview": "Monica and the gang...",
  "posterUrl": "https://image.tmdb.org/...",
  "backdropUrl": "https://image.tmdb.org/...",
  "seasonNumber": 1,
  "episodeNumber": 1,
  "voteAverage": 8.2,
  "knownWordPercentage": 45.5,
  "difficultyLevel": "B1",
  "levelCounts": {
    "A1": 120,
    "A2": 200,
    "B1": 350,
    "B2": 400,
    "C1": 150,
    "C2": 25
  }
}
```

### WordListDTO

```json
{
  "id": 1,
  "name": "Oxford 5000",
  "createdAt": "2025-01-15T10:00:00Z",
  "totalWords": 4955,
  "unknownWords": 4014,
  "levelCounts": {
    "A1": 764,
    "A2": 932,
    "B1": 1055,
    "B2": 1403,
    "C1": 792,
    "C2": 9
  }
}
```

---

## 0. App Init API — `/api/app-init`

### Açılış verisi (aggregate, tek istek)

```
GET /api/app-init
```

Auth opsiyonel: JWT yoksa sadece `media` + `frequentWords` dolu döner (onboarding prefetch), JWT varsa tüm alanlar. Hata veren bölüm `null` gelir.

**Response:**

```json
{
  "media": "Media[]",
  "frequentWords": "Word[] (page 0, size 50)",
  "continueLearning": "Media[] | null",
  "lists": "WordListDTO[] | null",
  "userStatistics": { "totalKnownWords": 941, "totalWords": 15640 },
  "knownWords": "Word[] | null",
  "watchedMediaIds": "number[] | null",
  "progressStats": "ProgressStatsDTO | null"
}
```

Mobile kullanımı: `src/api/appInit.ts` → `prefetchAppInit(queryClient)` — yanıtı React Query cache'ine yazar.

---

## 1. Media API — `/api/media`

### Tüm medya listesi

```
GET /api/media?userId={userId}
```

**Response:** `Media[]`

### Continue Learning

```
GET /api/media/continue-learning?userId={userId}&limit={limit}
```

**Response:** `Media[]` — Kullanıcının en son çalıştığı medyalar

### Medya detayı

```
GET /api/media/{id}?userId={userId}
```

**Response:** `Media`

### Medya kelimeleri

```
GET /api/media/{id}/words?userId={userId}&onlyUnknown={boolean}
```

**Response:**

```json
{
  "mediaId": 1,
  "totalWords": 1245,
  "levelCounts": { "A1": 120, "A2": 200, ... },
  "words": [
    {
      "id": 123,
      "word": "chemistry",
      "difficulty": "B2",
      "definition": { ... },
      "frequency": 5,
      "isKnown": false
    }
  ]
}
```

### Altyazı indir

```
GET /api/media/{id}/download-subtitles
```

**Response:** `text/plain` — SRT dosya içeriği

### Kelime JSON indir

```
GET /api/media/{id}/words/download?onlyUnknown={bool}&userId={userId}
```

**Response:** `application/json` — İndirilebilir JSON dosyası

---

## 2. Words API — `/api/words`

### Kelime ara

```
GET /api/words/search?q={query}&language=en&userId={userId}
```

**Response:** `Word[]`

### Kelime detayı

```
GET /api/words/{id}?userId={userId}
```

**Response:** `Word`

### En sık kelimeler

```
GET /api/words/frequent?language=en&limit={limit}&userId={userId}
```

**Response:** `Word[]`

### Kelime biliyorum işaretle

```
POST /api/words/{id}/mark-known?userId={userId}
```

**Response:** `200 OK`

### Toplu kelime biliyorum işaretle (tek istek)

```
POST /api/words/mark-known/batch
Content-Type: application/json
Body: [123, 456, 789]
```

**Response:** `200 OK` — N paralel istek yerine tek transaction. Auth zorunlu.

### Kelime bilmiyorum işaretle (geri al)

```
DELETE /api/words/{id}/mark-known?userId={userId}
```

**Response:** `200 OK`

---

## 3. Word Lists API — `/api/lists`

### Kullanıcı listeleri

```
GET /api/lists
```

**Response:** `WordListDTO[]`

### Standart listeler (Oxford 5000, Top Verbs vb.)

```
GET /api/lists/standard
```

**Response:** `WordListDTO[]`

### Liste detayı

```
GET /api/lists/{id}
```

**Response:** `WordListDTO`

### Liste kelimeleri

```
GET /api/lists/{id}/words?onlyUnknown={boolean}
```

**Response:**

```json
{
  "list": { "id": 1, "name": "Oxford 5000", ... },
  "words": [
    { "id": 123, "word": "chemistry", "difficulty": "B2", "isKnown": false, "frequency": 5, ... }
  ],
  "totalWords": 4955,
  "unknownWords": 4014,
  "levelCounts": { "A1": 764, ... }
}
```

### Yeni liste oluştur

```
POST /api/lists
Content-Type: text/plain
Body: "My Custom List"
```

**Response:** `WordListDTO`

### Listeye kelime ekle

```
POST /api/lists/{listId}/words/{wordId}
```

**Response:** `200 OK`

### Listeden kelime çıkar

```
DELETE /api/lists/{listId}/words/{wordId}
```

**Response:** `200 OK`

### Medya bilinmeyen kelimelerinden liste oluştur

```
POST /api/lists/generate/unknown?mediaId={mediaId}
```

**Response:** `WordListDTO`

### Mevcut listeden bilinmeyen kelime alt-listesi oluştur

```
POST /api/lists/{id}/generate/unknown
```

**Response:** `WordListDTO`

---

## 4. User API — `/api/user`

### Bilinen kelimeler

```
GET /api/user/known-words?userId={userId}
```

**Response:** `Word[]`

### Öğrenme istatistikleri

```
GET /api/user/statistics?userId={userId}
```

**Response:**

```json
{
  "totalKnownWords": 941,
  "totalWords": 15640
}
```

---

## 5. Admin API — `/api/admin`

> [!WARNING]
> Admin endpoint'leri mobilde normalde kullanılmaz. Sadece referans amaçlı.

### Media Yönetimi

| Method   | Endpoint                                              | Açıklama                          |
| -------- | ----------------------------------------------------- | --------------------------------- |
| `POST`   | `/api/admin/media/batch-upload`                       | Toplu altyazı yükleme (multipart) |
| `DELETE` | `/api/admin/media/{id}`                               | Medya sil                         |
| `GET`    | `/api/admin/media/tmdb/search?query={q}`              | TMDB dizi ara                     |
| `GET`    | `/api/admin/media/tmdb/movie/search?query={q}`        | TMDB film ara                     |
| `GET`    | `/api/admin/media/tmdb/series/{id}`                   | TMDB dizi detay                   |
| `GET`    | `/api/admin/media/tmdb/series/{id}/season/{s}`        | TMDB sezon detay                  |
| `POST`   | `/api/admin/media/scrape?imdbId={id}`                 | YTS scrape                        |
| `POST`   | `/api/admin/scrape-episode-api?imdbId&season&episode` | OpenSubtitles API scrape          |
| `POST`   | `/api/admin/scrape-movie-api?tmdbId&imdbId`           | Film altyazı scrape               |

### AI Enrichment Pipeline

| Method | Endpoint                                        | Açıklama                |
| ------ | ----------------------------------------------- | ----------------------- |
| `POST` | `/api/admin/pipeline/start?size={n}`            | Pipeline başlat         |
| `POST` | `/api/admin/pipeline/trusted?size={n}`          | Trusted enrichment      |
| `POST` | `/api/admin/pipeline/media/{id}/start?size={n}` | Media-specific pipeline |
| `GET`  | `/api/admin/pipeline/status`                    | Pipeline durumu         |
| `GET`  | `/api/admin/pipeline/failures`                  | Hatalar                 |

### Kelime Yönetimi

| Method | Endpoint                                                                          | Açıklama             |
| ------ | --------------------------------------------------------------------------------- | -------------------- |
| `GET`  | `/api/admin/enriched?page&size&date&needsReEnrichment&isVerified&isJudgeApproved` | Enriched kelimeler   |
| `GET`  | `/api/admin/enriched/dates?language=en`                                           | Enrichment tarihleri |
| `GET`  | `/api/admin/enriched/download?...`                                                | JSON export          |
| `POST` | `/api/admin/enriched/approve-batch`                                               | Toplu onaylama       |
| `GET`  | `/api/admin/stats/word-count`                                                     | Toplam kelime sayısı |
| `POST` | `/api/admin/consolidate-roots`                                                    | Root consolidation   |

### Liste Seeding

| Method | Endpoint                              | Açıklama         |
| ------ | ------------------------------------- | ---------------- |
| `POST` | `/api/admin/lists/seed/defaults`      | Default listeler |
| `POST` | `/api/admin/lists/seed/oxford`        | Oxford 5000      |
| `POST` | `/api/admin/lists/seed/verbs-curated` | Top Verbs        |
| `POST` | `/api/admin/lists/seed/adjectives`    | Top Adjectives   |
| `POST` | `/api/admin/lists/seed/adverbs`       | Top Adverbs      |
| `POST` | `/api/admin/lists/seed/phrasal-verbs` | Phrasal Verbs    |

---

## Mobile İçin Önerilen Ekran → API Eşleştirmesi

```
┌─────────────────────────────────────────────────┐
│  Ana Sayfa / Discover                           │
│  ├─ GET /api/media/continue-learning            │
│  ├─ GET /api/media                              │
│  └─ GET /api/lists/standard                     │
├─────────────────────────────────────────────────┤
│  Media Detay                                    │
│  ├─ GET /api/media/{id}                         │
│  ├─ GET /api/media/{id}/words                   │
│  ├─ POST /api/words/{id}/mark-known             │
│  └─ POST /api/lists/generate/unknown            │
├─────────────────────────────────────────────────┤
│  Kelime Listeleri                               │
│  ├─ GET /api/lists                              │
│  ├─ GET /api/lists/{id}/words                   │
│  ├─ POST /api/lists                             │
│  └─ POST /api/lists/{id}/words/{wordId}         │
├─────────────────────────────────────────────────┤
│  Flip Card Öğrenme                              │
│  ├─ GET /api/words/{id}                         │
│  ├─ POST /api/words/{id}/mark-known             │
│  └─ DELETE /api/words/{id}/mark-known           │
├─────────────────────────────────────────────────┤
│  Profil / İstatistik                            │
│  ├─ GET /api/user/known-words                   │
│  └─ GET /api/user/statistics                    │
└─────────────────────────────────────────────────┘
```

> [!NOTE]
> **Auth:** Şu an `userId=1L` hardcoded. Mobile'da JWT auth eklenecek (Sprint 4 planında).
