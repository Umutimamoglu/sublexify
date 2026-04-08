const fs = require('fs');

const EMAIL = "theveledrom@gmail.com";
const PASSWORD = "sublex123";
const API_URL = "https://sublexify-production.up.railway.app/api";

const CRITICAL_IDS = [6856, 6975, 6687, 6674, 6629, 6521, 6603, 6398, 6392, 6370, 6391];

async function applyCriticalFixes() {
    console.log("1. Mimar login...");
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const authData = await loginRes.json();
        const token = authData.token;
        console.log("✅ Login OK.");

        // Read the main file
        console.log("2. Dosya okunuyor...");
        const mainData = JSON.parse(fs.readFileSync('/Users/umutimamoglu/sublex/audit_problems_2026-04-01.json', 'utf8'));
        
        const allIds = mainData.map(item => item.id);
        const idsToIgnore = allIds.filter(id => !CRITICAL_IDS.includes(id));

        console.log(`Toplam problem: ${allIds.length}`);
        console.log(`Düzeltilecek olan: ${CRITICAL_IDS.length}`);
        console.log(`Ignore edilecek: ${idsToIgnore.length}`);

        // A. Fix the 11 critical ones
        console.log("\n3. Kritik düzeltmeler gönderiliyor...");
        const fixesData = fs.readFileSync('/Users/umutimamoglu/sublex/audit_fixes_critical.json', 'utf8');
        const fixRes = await fetch(`${API_URL}/admin/words/bulk-fix-definitions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: fixesData
        });
        console.log("Fix Sonucu:", await fixRes.text());

        // B. Ignore the remaining 50
        console.log("\n4. Geriye kalanlar Ignore ediliyor...");
        const resolveRes = await fetch(`${API_URL}/admin/words/audit-resolve`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(idsToIgnore)
        });
        console.log("Ignore Sonucu:", await resolveRes.text());

        // C. Check stats
        console.log("\n📊 Güncel İstatistikler:");
        const statsRes = await fetch(`${API_URL}/admin/words/audit-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await statsRes.json();
        console.log(stats);

    } catch (err) {
        console.error("Hata:", err);
    }
}

applyCriticalFixes();
