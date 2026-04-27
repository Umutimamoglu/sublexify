import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Info, Target, Book, PenTool, Zap, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressService, { ProgressStats } from '@/services/ProgressService';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/utils/cn';

const helpData = [
    { icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', label: 'Bugün Tekrar Edilecek', text: 'Spaced repetition (aralıklı tekrar) algoritmasıyla bugün çalışman gereken kelimeler.' },
    { icon: Book, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'Öğrenilen Kelimeler', text: 'Hedef seviyeye ulaşmış, kalıcı hafızaya aktardığın kelimelerin toplam sayısı.' },
    { icon: PenTool, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', label: 'Çalışılan Kelimeler', text: 'Bugüne kadar havuzdan seçip en az bir kez pratik yaptığın tüm kelimeler.' },
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
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={() => navigate('/profile')}
                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">İlerleme</h1>
                <button 
                    onClick={() => setHelpVisible(true)}
                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    <Info className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
            </div>

            {!hasData ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <span className="text-6xl mb-6">📊</span>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Henüz İlerleme Yok</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed text-sm">
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
                <div className="space-y-8 pb-10">
                    {/* Hero Ring - Total Learnt */}
                    <div className="flex flex-col items-center">
                        <div className="relative w-44 h-44 rounded-full p-2 mb-4 bg-gradient-to-br from-blue-400 to-purple-600 shadow-2xl shadow-purple-500/20">
                            <div className="w-full h-full rounded-full bg-white dark:bg-[#161822] flex flex-col items-center justify-center">
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-purple-600 tracking-tighter">
                                    {stats?.totalWordsLearnt ?? 0}
                                </span>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Öğrenilen</span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs text-center">
                            Hedef seviyeye ulaşmış ve kalıcı hafızana başarıyla aktarılmış kelimelerin toplam sayısı.
                        </p>
                    </div>

                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">İstatistikler</h3>
                    
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Due Today */}
                        <StatCard
                            icon={Target} color="text-rose-500" bg="bg-rose-500/10" glow="bg-rose-500"
                            value={dailyCount}
                            title="Bugün Tekrar"
                            desc={`${dailyCount} kelime tekrar vakti geldi.`}
                            onClick={() => navigate('/progress/due')}
                        />
                        {/* Total Learnt */}
                        <StatCard
                            icon={Book} color="text-blue-500" bg="bg-blue-500/10" glow="bg-blue-500"
                            value={stats.totalWordsLearnt}
                            title="Öğrenilen"
                            desc="Hafızanızda kalıcı hale gelen."
                            onClick={() => navigate('/progress/learnt')}
                        />
                        {/* Total Studied */}
                        <StatCard
                            icon={PenTool} color="text-purple-500" bg="bg-purple-500/10" glow="bg-purple-500"
                            value={stats.totalWordsStudied}
                            title="Çalışılan"
                            desc="Pratiği yapılmış toplam kelime."
                            onClick={() => navigate('/progress/studied')}
                        />
                        {/* Difficult */}
                        <StatCard
                            icon={Zap} color="text-amber-500" bg="bg-amber-500/10" glow="bg-amber-500"
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
                    <div className="relative w-full max-w-sm bg-white dark:bg-[#1C1C2E] rounded-3xl shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-bottom-8">
                        <div className="w-10 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mx-auto my-3" />
                        <div className="px-6 pb-8 max-h-[80vh] overflow-y-auto">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Ne anlama gelir?</h2>
                            <div className="space-y-6">
                                {helpData.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                                                <item.icon className={cn('w-4.5 h-4.5', item.color)} />
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white text-base">{item.label}</span>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
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
    icon: Icon, value, title, desc, color, bg, glow, onClick 
}: { 
    icon: any; value: number; title: string; desc: string; color: string; bg: string; glow: string; onClick: () => void; 
}) {
    return (
        <button 
            onClick={onClick}
            className="relative w-full flex flex-col bg-white dark:bg-[#1C1C2E] p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-white/5 transition-all hover:shadow-lg focus:ring-4 outline-none text-left overflow-hidden group"
        >
            {/* Glow Blob */}
            <div className={cn("absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.08] dark:opacity-[0.12] blur-xl transition-opacity group-hover:opacity-[0.15] dark:group-hover:opacity-20", glow)} />

            <div className={cn("w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 mb-3 relative z-10", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            
            <div className="relative z-10 w-full pr-4">
                <span className={cn("text-[32px] sm:text-[34px] font-black block leading-none mb-1.5 tracking-tight", color)}>{value}</span>
                <span className="font-bold text-gray-900 dark:text-white text-[13px] block truncate">{title}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-1 leading-snug line-clamp-2">{desc}</span>
            </div>

            <div className="absolute top-4 right-4 text-gray-300 dark:text-gray-600">
                <ChevronRight className="w-4 h-4" />
            </div>
        </button>
    );
}

export default ProgressDashboard;
