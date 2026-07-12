import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Globe, Settings2, BellRing, Shield, User, Volume2, Check, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, ThemePreference, SupportedLanguage, VoiceGenderPreference } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/services/api';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { clearAuth } = useAuthStore();
    const [isDeleting, setIsDeleting] = useState(false);

    const { 
        themePreference, setThemePreference, 
        language, setLanguage, 
        dailyReviewCount, setDailyReviewCount,
        preferredVoiceGender, setVoiceGender 
    } = useSettingsStore();

    const handleDeleteAccount = async () => {
        if (!window.confirm("Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;
        
        setIsDeleting(true);
        try {
            await api.delete('/auth/account');
            clearAuth();
            navigate('/login');
        } catch (e) {
            console.error("Hesap silinirken hata oluştu:", e);
            alert("Hesap silinirken bir hata oluştu.");
            setIsDeleting(false);
        }
    };

    const handleLanguageChange = (lang: SupportedLanguage) => {
        setLanguage(lang);
        i18n.changeLanguage(lang);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl relative pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('settings.title')}</h1>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Visual & Language Settings */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">{t('settings.sections.preferences', 'Tercihler')}</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        
                        {/* Theme */}
                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0">
                                    <Moon className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">{t('settings.items.appearance.title', 'Tema')}</span>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Uygulama görünümünü seçin</span>
                                </div>
                            </div>
                            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl">
                                {(["light", "dark", "system"] as ThemePreference[]).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setThemePreference(mode)}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize",
                                            themePreference === mode 
                                                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0">
                                    <Globe className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">{t('settings.items.language.title', 'Dil')}</span>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Uygulama arayüz dili</span>
                                </div>
                            </div>
                            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl">
                                {(["en", "tr"] as SupportedLanguage[]).map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => handleLanguageChange(lang)}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all uppercase",
                                            language === lang 
                                                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        {lang === 'en' ? 'English' : 'Türkçe'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Voice Settings */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Seslendirme (TTS)</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0">
                                    <Volume2 className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">Ses Tercihi</span>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Otomatik okuma sesini seçin</span>
                                </div>
                            </div>
                            <div className="flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl">
                                {[
                                    { value: 'system', label: 'Sistem' },
                                    { value: 'female', label: 'Kadın' },
                                    { value: 'male', label: 'Erkek' }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setVoiceGender(opt.value as VoiceGenderPreference)}
                                        className={cn(
                                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                            preferredVoiceGender === opt.value 
                                                ? "bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400" 
                                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    Daha doğal bir deneyim için işletim sisteminizin ayarlarından yüksek kaliteli "Premium" ses paketlerini indirebilirsiniz.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Study Settings */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Çalışma Ayarları</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0">
                                    <Settings2 className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">Günlük Tekrar Hedefi</span>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Her gün tekrar edilecek kelime sayısı</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setDailyReviewCount(Math.max(5, dailyReviewCount - 5))}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    -
                                </button>
                                <span className="font-black text-lg w-6 text-center">{dailyReviewCount}</span>
                                <button 
                                    onClick={() => setDailyReviewCount(Math.min(50, dailyReviewCount + 5))}
                                    className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-8">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 ml-2">Tehlikeli Bölge</h3>
                    <div className="bg-white dark:bg-[#161822] border border-red-200/60 dark:border-red-900/50 rounded-3xl overflow-hidden">
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                    <span className="block font-bold text-gray-900 dark:text-white">Hesabımı Sil</span>
                                    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Tüm ilerlemeniz ve verileriniz kalıcı olarak silinir.</span>
                                </div>
                            </div>
                            <button 
                                onClick={handleDeleteAccount}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl font-bold text-sm bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? "Siliniyor..." : "Sil"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
