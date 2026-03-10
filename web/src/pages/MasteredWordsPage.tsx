import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, Star, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProgressService from '@/services/ProgressService';
import { Word } from '@/services/WordListService';

const MasteredWordsPage = () => {
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWords = async () => {
            try {
                const data = await ProgressService.getMasteredWords();
                setWords(data);
            } catch (error) {
                console.error("Failed to fetch mastered words", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWords();
    }, []);

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
                        <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                        Mastered Words
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        You have mastered {words.length} words so far. Keep it up!
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
                                <p className="text-sm text-gray-500 dark:text-gray-400">Mastered</p>
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
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No mastered words yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Study more to build your long-term memory!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasteredWordsPage;
