const fs = require('fs');

const EMAIL = "theveledrom@gmail.com";
const PASSWORD = "sublex123";
const API_URL = "https://sublexify-production.up.railway.app/api";

const PROPER_NOUN_IDS = [
  7040, 7037, 7024, 7020, 6987, 6979, 6960, 6956, 6948, 6941, 
  6914, 6890, 6889, 6885, 6884, 6883, 6882, 6881, 6868, 6861, 
  6857, 6852, 6844, 6843, 6842, 6650, 6637, 6630, 6618
];

async function resolveProperNouns() {
    console.log("1. Giriş yapılıyor...");
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) {
            console.error("Giriş başarısız!", await loginRes.text());
            return;
        }

        const authData = await loginRes.json();
        const token = authData.token;
        console.log("✅ Giriş başarılı.");

        console.log(`2. ${PROPER_NOUN_IDS.length} özel isim/kısaltma audit listesinden temizleniyor...`);
        const resolveRes = await fetch(`${API_URL}/admin/words/audit-resolve`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(PROPER_NOUN_IDS)
        });

        const result = await resolveRes.text();
        if (resolveRes.ok) {
            console.log("✅ BAŞARILI:", result);
        } else {
            console.error("❌ Hata:", result);
        }

    } catch (err) {
        console.error("Hata:", err);
    }
}

resolveProperNouns();
