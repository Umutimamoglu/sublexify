import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Globe, Settings2, Bell, Shield, BellRing, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useTranslation } from 'react-i18next';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                {/* Account Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">{t('settings.sections.account')}</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <SettingsItem icon={User} title={t('settings.items.account_info.title')} subtitle={t('settings.items.account_info.subtitle')} />
                        <SettingsItem icon={BellRing} title={t('settings.items.notifications.title')} subtitle={t('settings.items.notifications.subtitle')} />
                        <SettingsItem icon={Shield} title={t('settings.items.privacy.title')} subtitle={t('settings.items.privacy.subtitle')} />
                    </div>
                </div>

                {/* Preferences Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">{t('settings.sections.preferences')}</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <SettingsItem icon={Moon} title={t('settings.items.appearance.title')} subtitle={t('settings.items.appearance.subtitle')} />
                        <SettingsItem icon={Globe} title={t('settings.items.language.title')} subtitle={t('settings.items.language.subtitle')} />
                        <SettingsItem icon={Settings2} title={t('settings.items.study_settings.title')} subtitle={t('settings.items.study_settings.subtitle')} />
                    </div>
                </div>
            </div>
        </div>
    );
};

function SettingsItem({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) {
    return (
        <button className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-colors">
                <Icon className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div className="flex-1">
                <span className="block font-bold text-gray-900 dark:text-white">{title}</span>
                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</span>
            </div>
        </button>
    );
}

export default SettingsPage;
