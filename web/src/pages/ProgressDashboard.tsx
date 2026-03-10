import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Brain, Target, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressService, { ProgressStats } from '@/services/ProgressService';

const ProgressDashboard = () => {
    const [stats, setStats] = useState<ProgressStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const userId = 1; // Assuming mock user ID for sprint 4

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

    if (!stats) return null;

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-indigo-500" />
                    Learning Progress
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Track your vocabulary mastery and daily goals.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Words Learnt */}
                <button 
                    onClick={() => navigate('/progress/learnt')}
                    className="text-left bg-white dark:bg-[#161822] rounded-3xl p-8 border border-gray-200/60 dark:border-gray-800/60 shadow-lg shadow-blue-500/5 relative overflow-hidden group hover:border-blue-500/60 transition-all cursor-pointer ring-blue-500/20 hover:ring-4 active:scale-[0.98]"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Öğrenilen Kelimeler</p>
                            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalWordsLearnt}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl group-hover:bg-blue-500/20 transition-all">
                            <Brain className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-blue-500 dark:text-blue-400 mt-2 flex items-center gap-1">
                        Click to view list <span className="text-lg">→</span>
                    </div>
                </button>

                {/* Total Words Studied */}
                <button 
                    onClick={() => navigate('/progress/studied')}
                    className="text-left bg-white dark:bg-[#161822] rounded-3xl p-8 border border-gray-200/60 dark:border-gray-800/60 shadow-lg shadow-purple-500/5 relative overflow-hidden group hover:border-purple-500/60 transition-all cursor-pointer ring-purple-500/20 hover:ring-4 active:scale-[0.98]"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Çalışılan Kelimeler</p>
                            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalWordsStudied}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-all">
                            <TrendingUp className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-purple-500 dark:text-purple-400 mt-2 flex items-center gap-1">
                        Click to view list <span className="text-lg">→</span>
                    </div>
                </button>

                {/* High Retention */}
                <button 
                    onClick={() => navigate('/progress/mastered')}
                    className="text-left bg-white dark:bg-[#161822] rounded-3xl p-8 border border-gray-200/60 dark:border-gray-800/60 shadow-lg shadow-emerald-500/5 relative overflow-hidden group hover:border-emerald-500/60 transition-all cursor-pointer ring-emerald-500/20 hover:ring-4 active:scale-[0.98]"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mastered Words (SRS Lv 5+)</p>
                            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.highRetentionWords}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-all">
                            <Target className="w-6 h-6 text-emerald-500" />
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 mt-2 flex items-center gap-1">
                        Click to view list <span className="text-lg">→</span>
                    </div>
                </button>

                {/* Reviews Due Today */}
                <button 
                    onClick={() => navigate('/progress/due')}
                    className="text-left bg-white dark:bg-[#161822] rounded-3xl p-8 border border-gray-200/60 dark:border-gray-800/60 shadow-lg shadow-rose-500/5 relative overflow-hidden group hover:border-rose-500/60 transition-all cursor-pointer ring-rose-500/20 hover:ring-4 active:scale-[0.98]"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all" />
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Reviews Due</p>
                            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{stats.wordsToReviewToday}</h3>
                        </div>
                        <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl group-hover:bg-rose-500/20 transition-all">
                            <CalendarDays className="w-6 h-6 text-rose-500" />
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-rose-500 dark:text-rose-400 mt-2 flex items-center gap-1">
                        Click to view list <span className="text-lg">→</span>
                    </div>
                </button>
            </div>
            
            <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl">
                <h2 className="text-2xl font-bold mb-2">Keep up the great work!</h2>
                <p className="text-indigo-100 max-w-2xl">
                    You have {stats.wordsToReviewToday} words waiting for review. Regular practice is the key to long-term retention. 
                    Head over to your lists and start studying to build your vocabulary!
                </p>
            </div>
        </div>
    );
};

export default ProgressDashboard;
