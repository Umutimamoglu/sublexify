import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Info, X, Target, Book, PenTool, Zap, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressService, { ProgressStats } from '@/services/ProgressService';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/utils/cn';

const helpData = [
    { icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', label: 'Bugün Tekrar Edilecek', text: 'Spaced repetition (aralıklı tekrar) algoritmasıyla bugün çalışman gereken kelimeler.' },
    { icon: Book, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', label: 'Öğrenilen Kelimeler', text: 'Hedef seviyeye ulaşmış, kalıcı hafızaya aktardığın kelimelerin toplam sayısı.' },
    { icon: PenTool, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', label: 'Çalışılan Kelimeler', text: 'Bugüne kadar havuzdan seçip en az bir kez pratik yaptığın tüm kelimeler.' },
    { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Zorlandıklarım', text: 'Pratiklerde sürekli yanlış yaptığın veya takıldığın kelimeler kümesi.' },
];

const ProgressDashboard = () => {
    const [stats, setStats] = useState<ProgressStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [helpVisible, setHelpVisible] = useState(false);
    const navigate = useNavigate();

    // Note: use actual authenticated user id
    const userId = 1; 

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await ProgressService.getStats(userId);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch progress stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    const hasData = stats && (stats.totalWordsLearnt > 0 || stats.totalWordsStudied > 0 || stats.difficultWords > 0);
    const dailyReviewCount = 20; // Default until web settings store is implemented
    const dailyCount = stats ? Math.min(dailyReviewCount, stats.wordsToReviewToday) : 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button 
                    onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">İlerleme</h1>
                <button 
                    onClick={() => setHelpVisible(true)}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <Info className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
            </div>
            
            <div className="h-px bg-gray-200/60 dark:bg-gray-800/60 mb-8" />

            {!hasData ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <span className="text-6xl mb-6">📊</span>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Henüz İlerleme Yok</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
                        Çalışacağın kelimeleri havuzdan ve listelerden çalışmaya başladıkça istatistiklerin burada belirecek.
                    </p>
                    <button
                        onClick={() => navigate('/lists')}
                        className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
                    >
                        Listelere Git
                    </button>
                </div>
            ) : (
                /* Stats */
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">İstatistikler</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Due Today */}
                        <StatCard
                            icon={Target} color="text-rose-500" bg="bg-rose-50 dark:bg-rose-500/10" border="border-rose-100 dark:border-rose-500/20 hover:border-rose-300 dark:hover:border-rose-500/40 focus:ring-rose-500/20"
                            value={dailyCount}
                            title="Bugün Tekrar"
                            desc={`${dailyCount} kelime tekrar vakti geldi.`}
                            onClick={() => navigate('/progress/due')}
                        />
                        {/* Total Learnt */}
                        <StatCard
                            icon={Book} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" border="border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40 focus:ring-indigo-500/20"
                            value={stats.totalWordsLearnt}
                            title="Öğrenilen"
                            desc="Hafızanızda kalıcı hale gelen."
                            onClick={() => navigate('/progress/learnt')}
                        />
                        {/* Total Studied */}
                        <StatCard
                            icon={PenTool} color="text-fuchsia-500" bg="bg-fuchsia-50 dark:bg-fuchsia-500/10" border="border-fuchsia-100 dark:border-fuchsia-500/20 hover:border-fuchsia-300 dark:hover:border-fuchsia-500/40 focus:ring-fuchsia-500/20"
                            value={stats.totalWordsStudied}
                            title="Çalışılan"
                            desc="Pratiği yapılmış toplam kelime."
                            onClick={() => navigate('/progress/studied')}
                        />
                        {/* Difficult */}
                        <StatCard
                            icon={Zap} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" border="border-amber-100 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40 focus:ring-amber-500/20"
                            value={stats.difficultWords}
                            title="Zorlandıklarım"
                            desc="Dikkat etmeniz gereken kelimeler."
                            onClick={() => navigate('/progress/difficult')}
                        />
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {helpVisible && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setHelpVisible(false)} />
                    <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-3xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-bottom-8">
                        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto my-3" />
                        <div className="px-6 pb-8 max-h-[80vh] overflow-y-auto">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Ne anlama gelir?</h2>
                            <div className="space-y-6">
                                {helpData.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bg)}>
                                                <item.icon className={cn('w-4 h-4', item.color)} />
                                            </div>
                                            <span className="font-extrabold text-gray-900 dark:text-white text-base">{item.label}</span>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed pl-11">
                                            {item.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function StatCard({ 
    icon: Icon, value, title, desc, color, bg, border, onClick 
}: { 
    icon: any; value: number; title: string; desc: string; color: string; bg: string; border: string; onClick: () => void; 
}) {
    return (
        <button 
            onClick={onClick}
            className={cn("w-full flex items-center gap-4 bg-white dark:bg-[#161822] p-5 rounded-3xl border transition-all hover:shadow-lg focus:ring-4 outline-none text-left", border)}
        >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div className="flex-1 min-w-0">
                <span className={cn("text-2xl font-black block leading-none mb-1", color)}>{value}</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm block truncate">{title}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 max-w-[200px] leading-tight break-words">{desc}</span>
            </div>
        </button>
    );
}

export default ProgressDashboard;
