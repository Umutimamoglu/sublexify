import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Globe, Settings2, Bell, Shield, BellRing, User } from 'lucide-react';
import { cn } from '@/utils/cn';

const SettingsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl relative pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Ayarlar</h1>
            </div>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Account Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Hesap</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <SettingsItem icon={User} title="Hesap Bilgileri" subtitle="Kişisel bilgilerinizi güncelleyin" />
                        <SettingsItem icon={BellRing} title="Bildirimler" subtitle="Bildirim tercihlerinizi yönetin" />
                        <SettingsItem icon={Shield} title="Gizlilik" subtitle="Veri paylaşımı ve gizlilik ayarları" />
                    </div>
                </div>

                {/* Preferences Section */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Tercihler</h3>
                    <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                        <SettingsItem icon={Moon} title="Görünüm" subtitle="Açık/Koyu tema ayarı" />
                        <SettingsItem icon={Globe} title="Dil" subtitle="Uygulama dilini değiştirin" />
                        <SettingsItem icon={Settings2} title="Çalışma Ayarları" subtitle="Günlük hedef kelime sayısı (Geliştiriliyor)" />
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
