const EMAIL = "theveledrom@gmail.com";
const PASSWORD = "sublex123";
const API_URL = "https://sublexify-production.up.railway.app/api";

const PROPER_NOUN_IDS = [
  8450, 8442, 8372, 8365, 8361, 8334, 8332, 8308, 8293, 8272, 
  8267, 8264, 8262, 8244, 8242, 7714, 7713, 7710, 7659, 7620, 
  7589, 7540, 7507, 7473, 7471, 7439, 7419, 7388, 7384, 7381, 
  7331, 7324, 7312, 7294, 7292, 7277, 7275, 7229, 7227, 7222, 
  7221, 7219, 7218, 7213, 7211, 7199, 7188, 7185, 7146, 7134, 
  7118, 7106, 6936, 6935, 6931, 6930, 6924, 6923
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

        console.log(`2. ${PROPER_NOUN_IDS.length} özel isim/kısaltma audit listesinden (Ignored olarak) temizleniyor...`);
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
