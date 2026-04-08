const fs = require('fs');

// KULLANICI BİLGİLERİNİ BURAYA GİRİN:
const EMAIL = "theveledrom@gmail.com"; // Admin email adresiniz
const PASSWORD = "sublex123"; // Admin şifreniz

const API_URL = "https://sublexify-production.up.railway.app/api";

async function applyFixes() {
    console.log("1. Giriş yapılıyor...");
    
    try {
        // 1. Giriş yap ve token al
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) {
            console.error("Giriş başarısız! Lütfen email ve şifrenizi kontrol edin.", await loginRes.text());
            return;
        }

        const authData = await loginRes.json();
        const token = authData.token;
        console.log("✅ Başarıyla giriş yapıldı, token alındı.");

        // 2. JSON dosyasını oku
        console.log("2. Düzeltme dosyası okunuyor...");
        const fixesData = fs.readFileSync('/Users/umutimamoglu/sublex/audit_fixes.json', 'utf8');
        
        // 3. Düzeltmeleri gönder
        console.log("3. Düzeltmeler Railway'e gönderiliyor...");
        const fixRes = await fetch(`${API_URL}/admin/words/bulk-fix-definitions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: fixesData
        });

        const fixResult = await fixRes.text();
        
        if (fixRes.ok) {
            console.log("✅ BAŞARILI:", fixResult);
            
            // 4. İstatistikleri kontrol et
            console.log("\n📊 Güncel İstatistikler:");
            const statsRes = await fetch(`${API_URL}/admin/words/audit-stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const stats = await statsRes.json();
            console.log(stats);
            console.log("\nİşlem tamamlandı! Web panelinden kontrol edebilirsiniz.");
        } else {
            console.error("❌ Hata oluştu:", fixResult);
        }

    } catch (err) {
        console.error("Beklenmeyen bir hata oluştu:", err);
    }
}

applyFixes();
