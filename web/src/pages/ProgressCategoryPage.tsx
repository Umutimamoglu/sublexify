import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, AlertCircle, Volume2, TrendingUp, Brain, CalendarDays } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ProgressService from '@/services/ProgressService';
import { Word } from '@/services/WordListService';

type CategoryType = 'learnt' | 'studied' | 'due' | 'difficult';

const CATEGORY_CONFIG = {
    learnt: {
        title: 'Öğrenilen Kelimeler',
        description: 'Tüm öğrenme havuzundaki kelimeler.',
        emptyTitle: 'Henüz kelime yok',
        icon: Brain,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        fill: '',
        fetch: ProgressService.getLearntWords
    },
    studied: {
        title: 'Çalışılan Kelimeler',
        description: 'En az bir kere test ettiğin kelimeler.',
        emptyTitle: 'Henüz çalışılan kelime yok',
        icon: TrendingUp,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        fill: '',
        fetch: ProgressService.getStudiedWords
    },
    difficult: {
        title: 'Zorlandığımız Kelimeler',
        description: 'Çok sık karşılaştığın ama henüz öğrenemediğin kelimeler.',
        emptyTitle: 'Zorluk bulmaya hazır mısın?',
        icon: AlertCircle,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        fill: '',
        fetch: ProgressService.getDifficultWords
    },
    due: {
        title: 'Reviews Due',
        description: 'Kelimeler tekrar edilmeyi bekliyor.',
        emptyTitle: 'Tekrar yok',
        icon: CalendarDays,
        color: 'text-rose-500',
        bgColor: 'bg-rose-500/10',
        fill: '',
        fetch: ProgressService.getDueWords
    }
};

const ProgressCategoryPage = () => {
    const { category } = useParams<{ category: CategoryType }>();
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const config = CATEGORY_CONFIG[category as CategoryType];

    useEffect(() => {
        if (!config) {
            navigate('/progress', { replace: true });
            return;
        }

        const fetchWords = async () => {
            setLoading(true);
            try {
                const data = await config.fetch();
                setWords(data);
            } catch (error) {
                console.error(`Failed to fetch ${category} words`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, [category, config, navigate]);

    const playAudio = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!config) return null;

    const Icon = config.icon;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Icon className={`w-8 h-8 ${config.color} ${config.fill}`} />
                        {config.title}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {category === 'difficult' ? `${words.length} zorlu kelime bulunuyor.` : `${words.length} kelime bulunuyor.`}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {words.map((word) => (
                    <div 
                        key={word.id}
                        className="bg-white dark:bg-[#161822] p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 hover:border-indigo-500/30 transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold uppercase">
                                {word.difficulty}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{word.word}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{config.title}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => playAudio(word.word)}
                            className="p-2 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl text-indigo-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Volume2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}

                {words.length === 0 && (
                    <div className="col-span-full py-20 text-center flex flex-col items-center">
                        <div className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}>
                            <Icon className={`w-10 h-10 ${config.color}`} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{config.emptyTitle || 'Henüz kelime yok'}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                            {config.description} Çalışmaya başlayarak bu listeyi doldurabilirsiniz!
                        </p>
                        <button
                            onClick={() => navigate('/lists')}
                            className={`mt-8 px-8 py-3 rounded-2xl font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg ${config.color.replace('text-', 'bg-')}`}
                        >
                            Kelimeleri Çalış →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressCategoryPage;
