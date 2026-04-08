const fs = require('fs');
const EMAIL = "theveledrom@gmail.com";
const PASSWORD = "sublex123";
const API_URL = "https://sublexify-production.up.railway.app/api";

// 129 Proper Noun -> direkt Ignore
const PROPER_IDS = [9832, 9782, 9726, 9725, 9712, 9705, 9670, 9627, 9600, 9578, 9529, 9345, 9338, 9336, 9324, 9322, 9316, 9311, 9297, 9270, 9264, 9258, 9247, 9232, 9223, 9167, 9158, 9152, 9142, 9131, 9129, 9128, 9126, 9091, 9087, 9080, 9077, 9065, 9061, 9041, 9040, 9034, 9028, 9010, 8995, 8993, 8985, 8982, 8957, 8952, 8942, 8906, 8902, 8881, 8873, 8870, 8865, 8862, 8826, 8818, 8813, 8803, 8794, 8780, 8768, 8739, 8721, 8709, 8708, 8707, 8700, 8696, 8694, 8691, 8684, 8672, 8666, 8659, 8654, 8652, 8644, 8639, 8634, 8622, 8620, 8617, 8616, 8605, 8597, 8564, 8543, 8542, 8538, 8535, 8533, 8529, 8526, 8525, 8519, 8514, 8509, 8503, 8492, 8484, 8431, 8427, 8416, 7974, 7966, 7962, 7960, 7949, 7946, 7943, 7941, 7934, 7865, 7858, 7856, 7851, 7849, 7844, 7839, 7837, 7825, 7787, 7776, 7750, 7728];

// 5 kelime -> Proper Noun olarak işaretle
const MARK_PROPER_IDS = [9081, 8153, 7903, 7883, 7876]; // mercedes, stella, multiversity, armstrong, hitler

// 6 kelime -> Düzelt
const FIXES = [
  {
    id: 9096, clearRootWord: true,
    definition: {
      difficulty: "B1",
      meanings: [
        { definition: "Bir ilişkinin veya evliliğin sona ermesi; ayrılık.", example: "Their breakup was unexpected. (Ayrılıkları beklenmedikti.)", pos: "noun" },
        { definition: "Bir şeyin parçalara ayrılması veya dağılması.", example: "The breakup of the Soviet Union. (Sovyetler Birliği'nin dağılması.)", pos: "noun" }
      ],
      phrasal_verbs: [], verb_forms: null, word: "breakup"
    }
  },
  {
    id: 8145,
    definition: {
      difficulty: "C1",
      meanings: [
        { definition: "Yağmur ve karın karışık yağması; sulu kar, karla karışık yağmur.", example: "It was sleeting heavily this morning. (Bu sabah şiddetli sulu kar yağıyordu.)", pos: "noun" },
        { definition: "Sulu kar yağmak.", example: "It started to sleet on our way home. (Eve dönerken sulu kar yağmaya başladı.)", pos: "verb" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "sleeting", v1: "sleet", v2: "sleeted", v3: "sleeted" }, word: "sleet"
    }
  },
  {
    id: 8125,
    definition: {
      difficulty: "B2",
      meanings: [
        { definition: "Atı yönlendirmek için kullanılan uzun deri veya kumaş şerit; dizgin.", example: "He pulled on the reins to stop the horse. (Atı durdurmak için dizginleri çekti.)", pos: "noun" },
        { definition: "Bir şeyi veya birini kontrol altına almak, sınırlamak; dizginlemek, frenlemek.", example: "We need to rein in our spending. (Harcamalarımızı dizginlememiz gerekiyor.)", pos: "verb" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "reining", v1: "rein", v2: "reined", v3: "reined" }, word: "rein"
    }
  },
  {
    id: 8702, clearRootWord: true,
    definition: {
      difficulty: "B2",
      meanings: [
        { definition: "'drive' (sürmek) fiilinin 3. hâli (past participle); sürmüş, sürülmüş.", example: "I have driven this car for years. (Bu arabayı yıllardır sürdüm.)", pos: "verb" },
        { definition: "Güçlü bir motivasyona veya azme sahip; hırslı, kararlı.", example: "She is a very driven person. (O çok azimli bir insan.)", pos: "adjective" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "driving", v1: "drive", v2: "drove", v3: "driven" }, word: "driven"
    }
  },
  {
    id: 8612, clearRootWord: true,
    definition: {
      difficulty: "A2",
      meanings: [
        { definition: "'serve' (servis yapmak) fiilinin -ing hâli.", example: "She is serving the customers. (Müşterilere servis yapıyor.)", pos: "verb" },
        { definition: "Yemek veya içecekten bir kişiye ayrılan miktar; porsiyon.", example: "One serving of pasta is enough. (Bir porsiyon makarna yeterli.)", pos: "noun" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "serving", v1: "serve", v2: "served", v3: "served" }, word: "serving"
    }
  },
  {
    id: 8844, clearRootWord: true,
    definition: {
      difficulty: "A2",
      meanings: [
        { definition: "Buz ile soğutulmuş veya buzlu; soğuk servis edilen.", example: "I'd like an iced coffee, please. (Buzlu bir kahve istiyorum, lütfen.)", pos: "adjective" },
        { definition: "Üzeri şekerli süsleme (krema) ile kaplanmış (pasta, kek).", example: "She made an iced cake for the party. (Parti için kremalı bir pasta yaptı.)", pos: "adjective" }
      ],
      phrasal_verbs: [], verb_forms: null, word: "iced"
    }
  }
];

// Ignore edilecek normal kelimeler (çevirisi doğru olanlar + argo/uydurma)
const IGNORE_NORMAL_IDS = [
  9339, 9295, 9156, 9102, // swept, germ, sdh, heights
  9017, 9002, 8992, 8923, // ha, cake-y, bam, un-floopy
  8825, 8704, 8606, 8598, // not-not, doy, bracket-y, joints
  8591, 8539, 8496, 8478, // tony, stairs, hanging, movie's
  8472, 8430, 8415, 8411, // hasn't, deactivated, anyone's, bottoms
  8406, 7881,             // dad's, astro-pleasure
  8611                    // hitting
];

async function run() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const token = (await loginRes.json()).token;
  console.log("✅ Login OK\n");

  // 1. 129 Proper Noun -> Ignore
  console.log(`1. ${PROPER_IDS.length} Proper Noun Ignore ediliyor...`);
  const p1 = await fetch(`${API_URL}/admin/words/audit-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(PROPER_IDS)
  });
  console.log("Sonuç:", await p1.text());

  // 2. 5 kelime -> Proper Noun olarak işaretle
  console.log(`\n2. ${MARK_PROPER_IDS.length} kelime Proper Noun olarak işaretleniyor...`);
  const p2 = await fetch(`${API_URL}/admin/words/mark-proper-noun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(MARK_PROPER_IDS)
  });
  console.log("Sonuç:", await p2.text());

  // 3. 6 kelime -> Düzelt
  console.log(`\n3. ${FIXES.length} kelime düzeltiliyor...`);
  const p3 = await fetch(`${API_URL}/admin/words/bulk-fix-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(FIXES)
  });
  console.log("Sonuç:", await p3.text());

  // 4. Geri kalan normal kelimeler -> Ignore
  console.log(`\n4. ${IGNORE_NORMAL_IDS.length} normal kelime Ignore ediliyor...`);
  const p4 = await fetch(`${API_URL}/admin/words/audit-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(IGNORE_NORMAL_IDS)
  });
  console.log("Sonuç:", await p4.text());

  // 5. Stats
  console.log("\n📊 Güncel istatistikler:");
  const stats = await fetch(`${API_URL}/admin/words/audit-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(await stats.json());
}

run();
