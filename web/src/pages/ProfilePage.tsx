import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { User, Film, MessageCircle, BarChart3, Compass, Settings, LogOut, ChevronRight } from 'lucide-react';
import api from '@/services/api';

// Mocks since these endpoints might not be directly available yet in the same shape
// We will simulate their data for UI completion.
function getCefrBadge(known: number, total: number): { level: string; next: string } {
    const pct = total > 0 ? known / total : 0;
    if (pct >= 0.75) return { level: 'C2', next: 'C2' };
    if (pct >= 0.50) return { level: 'C1', next: 'C2' };
    if (pct >= 0.30) return { level: 'B2', next: 'C1' };
    if (pct >= 0.15) return { level: 'B1', next: 'B2' };
    if (pct >= 0.05) return { level: 'A2', next: 'B1' };
    return { level: 'A1', next: 'A2' };
}

const ProfilePage = () => {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    // In a real scenario, use actual API hooks here.
    const [known, setKnown] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        // Fetch stats mockup
        api.get('/users/1/stats').then(res => {
            if (res.data) {
                setKnown(res.data.totalKnownWords || 450);
                setTotal(res.data.totalWords || 5000);
            }
        }).catch(() => {
            // Mock data fallback for now
            setKnown(450);
            setTotal(5000);
        });
    }, []);

    const handleLogout = () => {
        if (confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?')) {
            clearAuth();
            navigate('/login');
        }
    };

    const progressPct = total > 0 ? Math.min(known / total, 1) : 0;
    const cefr = getCefrBadge(known, total);

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Header */}
            <h1 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-widest text-center mb-8">
                Profil
            </h1>
            <div className="h-px bg-gray-200 dark:bg-gray-800 mb-8" />

            {/* Profile Info */}
            <div className="flex flex-col items-center mb-10">
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <span className="text-white text-3xl font-black">{initials}</span>
                    </div>
                    <div className="absolute -bottom-1 -right-2 bg-indigo-600 border-2 border-white dark:border-[#0f1117] rounded-lg px-2 py-0.5">
                        <span className="text-white text-xs font-black">{cefr.level}</span>
                    </div>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{user?.name || '—'}</h2>
                <p className="text-gray-500 mt-1 text-sm">{user?.email || '—'}</p>
            </div>

            {/* Action Cards */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <button
                    onClick={() => navigate('/profile/media-request')}
                    className="flex-1 bg-white dark:bg-[#161822] border border-teal-500/20 dark:border-teal-500/30 p-5 rounded-3xl flex flex-col items-center hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
                >
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-3">
                        <Film className="w-7 h-7 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">İçerik İste</span>
                    <span className="text-xs font-medium text-gray-500 mt-1 text-center">Film & Dizi tavsiyesi yap</span>
                </button>

                <button
                    onClick={() => navigate('/profile/feedback')}
                    className="flex-1 bg-white dark:bg-[#161822] border border-indigo-500/20 dark:border-indigo-500/30 p-5 rounded-3xl flex flex-col items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3">
                        <MessageCircle className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">Geri Bildirim</span>
                    <span className="text-xs font-medium text-gray-500 mt-1 text-center">Bize yardımcı ol</span>
                </button>
            </div>

            {/* Progress Card */}
            <button
                onClick={() => navigate('/progress')}
                className="w-full bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 p-6 rounded-3xl mb-8 hover:bg-gray-50 dark:hover:bg-[#1c1e2b] transition-colors text-left"
            >
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Kelime Dağarcığı</h3>
                        <p className="text-xs text-gray-500">
                            {cefr.next !== cefr.level ? `${cefr.next} seviyesine ilerliyorsun` : cefr.level}
                        </p>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        {known.toLocaleString()} / {total.toLocaleString()} kelime
                    </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct * 100}%` }}
                    />
                </div>
            </button>

            {/* Settings Links */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Ayarlar</h4>
            <div className="flex flex-col gap-3">
                <SettingsTile
                    icon={<BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label="İlerleme"
                    onClick={() => navigate('/progress')}
                />
                <SettingsTile
                    icon={<Compass className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label="Rehber"
                    onClick={() => navigate('/onboarding')}
                />
                <SettingsTile
                    icon={<Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label="Ayarlar"
                    onClick={() => navigate('/profile/settings')}
                />
                <button
                    onClick={handleLogout}
                    className="flex justify-center items-center gap-2 py-5 mt-4 group"
                >
                    <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-bold text-gray-500 group-hover:text-red-500 tracking-wide transition-colors">ÇIKIŞ YAP</span>
                </button>
            </div>
        </div>
    );
};

function SettingsTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
        >
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                {icon}
            </div>
            <span className="flex-1 text-left font-bold text-gray-900 dark:text-white">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
        </button>
    );
}

export default ProfilePage;
