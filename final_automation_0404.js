const fs = require('fs');
const EMAIL = "theveledrom@gmail.com";
const PASSWORD = "sublex123";
const API_URL = "https://sublexify-production.up.railway.app/api";

const PROPER_IDS = [
  7974, 7966, 7962, 7960, 7949, 7946, 7943, 7941,
  7934, 7865, 7858, 7856, 7851, 7849, 7844, 7839,
  7837, 7825, 7776, 7750, 7728, 7787
];

const FIXES = [
  {
    id: 8259,
    definition: {
      difficulty: "Unknown",
      meanings: [{ definition: "Hatalı veya anlamsız altyazı parçası; İngilizce bir kelime değil.", example: "N/A", pos: "unknown" }],
      phrasal_verbs: [], verb_forms: null, word: "iare"
    }
  },
  {
    id: 7988,
    definition: {
      difficulty: "C1",
      meanings: [{ definition: "Davranışları yönlendiren genel ilke, ahlaki kural veya özdeyiş.", example: "He lives by a strict maxim.", pos: "noun" }],
      phrasal_verbs: [], verb_forms: null, word: "maxim"
    }
  },
  {
    id: 7985,
    definition: {
      difficulty: "B2",
      meanings: [{ definition: "Yunan mitolojisinde yeraltı dünyası ve ölülerin tanrısı; yeraltı diyarı, cehennem.", example: "The lord of Hades.", pos: "noun" }],
      phrasal_verbs: [], verb_forms: null, word: "hades"
    }
  },
  {
    id: 7501,
    clearRootWord: true,
    definition: {
      difficulty: "B1",
      meanings: [{ definition: "'backup' (yedek) isminin iyelik (-'s) almış hali veya 'backup is' kısaltması.", example: "The backup's ready.", pos: "noun" }],
      phrasal_verbs: [], verb_forms: null, word: "backup's"
    }
  },
  {
    id: 7510,
    definition: {
      difficulty: "B2",
      meanings: [
        { definition: "Çok küçük, ufak.", example: "A wee bit.", pos: "adjective" },
        { definition: "İşemek, çiş yapmak.", example: "He weed on the floor.", pos: "verb" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "weeing", v1: "wee", v2: "weed", v3: "weed" }, word: "wee"
    }
  },
  {
    id: 7303,
    definition: {
      difficulty: "A1",
      meanings: [
        { definition: "'change' (değiştirmek) fiilinin 3. tekil şahıs çekimi.", example: "He changes his mind.", pos: "verb" },
        { definition: "'change' (değişiklik) isminin çoğulu.", example: "We made some changes.", pos: "noun" }
      ],
      phrasal_verbs: [], verb_forms: { ing: "changing", v1: "change", v2: "changed", v3: "changed" }, word: "changes"
    }
  },
  {
    id: 7204,
    definition: {
      difficulty: "Unknown",
      meanings: [{ definition: "Bozuk veya eksik altyazı kelimesi ('recruit' kelimesinin kırpılması olabilir).", example: "N/A", pos: "unknown" }],
      phrasal_verbs: [], verb_forms: null, word: "recru"
    }
  }
];

async function runAll() {
  console.log("1. Mimar Login...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const token = (await loginRes.json()).token;

  // A. Özel isim işaretle
  console.log(`2. ${PROPER_IDS.length} kelime The Proper Noun (Özel İsim) olarak veritabanında işaretleniyor...`);
  // Not: mark-proper-noun diye bir endpoint var demiştik AdminController'da
  const pRes = await fetch(`${API_URL}/admin/words/mark-proper-noun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(PROPER_IDS)
  });
  console.log("Proper Nouns Sonuç:", await pRes.text());

  // B. 7 Kelimeyi Düzelt
  console.log(`\n3. ${FIXES.length} adet kritik hatalı tanım baştan yazılıyor...`);
  const fRes = await fetch(`${API_URL}/admin/words/bulk-fix-definitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(FIXES)
  });
  console.log("Düzeltme Sonuç:", await fRes.text());

  // C. Geri kalanları Resolve (Yoksay) yap
  console.log("\n4. Dosyadaki geriye kalan 73 doğru çeviri Teftiş Panosu'ndan Ignore ediliyor...");
  const data = JSON.parse(fs.readFileSync('audit_problems_2026-04-04 (1).json', 'utf8'));
  const allIds = data.map(d => d.id);
  const handledIds = [...PROPER_IDS, ...FIXES.map(f => f.id)];
  const ignoreIds = allIds.filter(id => !handledIds.includes(id));
  
  const iRes = await fetch(`${API_URL}/admin/words/audit-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(ignoreIds)
  });
  console.log("Ignore Sonuç:", await iRes.text());
}

runAll();
