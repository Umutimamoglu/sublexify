import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { User, Film, MessageCircle, BarChart3, Compass, Settings, LogOut, ChevronRight, Loader2, Crown } from 'lucide-react';
import api from '@/services/api';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();

    // In a real scenario, use actual API hooks here.
    const [known, setKnown] = useState(0);
    const [total, setTotal] = useState(0);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        // Fetch actual user stats
        setStatsLoading(true);
        api.get('/user/statistics').then(res => {
            if (res.data) {
                setKnown(res.data.totalKnownWords || 0);
                setTotal(res.data.totalWords || 5000);
            }
        }).catch(() => {
            // Mock data fallback if stats fail
            setKnown(450);
            setTotal(5000);
        }).finally(() => {
            setStatsLoading(false);
        });
    }, []);

    const handleLogout = () => {
        if (confirm(t('profile.logout_confirm'))) {
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
                {t('profile.title')}
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
                    <span className="font-extrabold text-gray-900 dark:text-white">{t('profile.request_content')}</span>
                    <span className="text-xs font-medium text-gray-500 mt-1 text-center">{t('profile.suggest_content')}</span>
                </button>

                <button
                    onClick={() => navigate('/profile/feedback')}
                    className="flex-1 bg-white dark:bg-[#161822] border border-indigo-500/20 dark:border-indigo-500/30 p-5 rounded-3xl flex flex-col items-center hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
                >
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-3">
                        <MessageCircle className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-extrabold text-gray-900 dark:text-white">{t('profile.feedback')}</span>
                    <span className="text-xs font-medium text-gray-500 mt-1 text-center">{t('profile.help_us')}</span>
                </button>
            </div>

            {/* Progress Card */}
            {statsLoading ? (
                <div className="w-full bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 p-6 rounded-3xl mb-8">
                    <div className="flex justify-between items-end mb-3">
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                            <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800/60 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full w-0 bg-teal-500/30 rounded-full animate-pulse" />
                    </div>
                </div>
            ) : (
            <button
                onClick={() => navigate('/lists?id=-1')}
                className="w-full bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 p-6 rounded-3xl mb-8 hover:bg-gray-50 dark:hover:bg-[#1c1e2b] transition-colors text-left"
            >
                <div className="flex justify-between items-end mb-3">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('profile.vocabulary')}</h3>
                        <p className="text-xs text-gray-500">
                            {cefr.next !== cefr.level ? t('profile.progressing_towards', { next: cefr.next }) : cefr.level}
                        </p>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        {t('profile.words_progress', { known: known.toLocaleString(), total: total.toLocaleString() })}
                    </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct * 100}%` }}
                    />
                </div>
            </button>
            )}

            {/* Membership row */}
            <button
                onClick={() => navigate('/profile/membership')}
                className={`w-full flex items-center gap-4 px-5 py-4 mb-8 rounded-2xl border transition-all group ${user?.isPremium
                    ? 'bg-gradient-to-r from-amber-50 to-white dark:from-amber-900/10 dark:to-[#161822] border-amber-300/50 dark:border-amber-500/25'
                    : 'bg-white dark:bg-[#161822] border-gray-200/60 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user?.isPremium
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
                    <Crown className="w-5 h-5" />
                </div>
                <span className="flex-1 text-left font-bold text-gray-900 dark:text-white">Üyelik</span>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${user?.isPremium
                    ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
                    : 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {user?.isPremium ? 'Premium' : 'Ücretsiz'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
            </button>

            {/* Settings Links */}
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">{t('profile.settings')}</h4>
            <div className="flex flex-col gap-3">
                <SettingsTile
                    icon={<BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label={t('profile.progress')}
                    onClick={() => navigate('/progress')}
                />
                <SettingsTile
                    icon={<Compass className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label={t('profile.guide')}
                    onClick={() => navigate('/onboarding')}
                />
                <SettingsTile
                    icon={<Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                    label={t('profile.settings')}
                    onClick={() => navigate('/profile/settings')}
                />
                <button
                    onClick={handleLogout}
                    className="flex justify-center items-center gap-2 py-5 mt-4 group"
                >
                    <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                    <span className="text-sm font-bold text-gray-500 group-hover:text-red-500 tracking-wide transition-colors">{t('profile.logout')}</span>
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
