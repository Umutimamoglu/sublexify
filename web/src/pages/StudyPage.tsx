import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import StudyService, { StudyQuestion, StudyResult } from '@/services/StudyService';
import { Word } from '@/services/WordListService';
import { Loader2, X, Check, ArrowRight, Volume2, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import WordCard from '@/components/features/WordCard';

const StudyPage = () => {
    const { listId } = useParams<{ listId: string }>();
    const [searchParams] = useSearchParams();
    const typesParam = searchParams.get('types');
    const sizeParam = searchParams.get('size') || '10';
    const navigate = useNavigate();
    const userId = 1; // sprint 4 auth mock

    const [questions, setQuestions] = useState<StudyQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // answers tracking
    const [results, setResults] = useState<(StudyResult & { skipped?: boolean })[]>([]);
    const [isCurrentAnswered, setIsCurrentAnswered] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isRecap, setIsRecap] = useState(false);
    
    // For Word Card
    const [fullWordInfo, setFullWordInfo] = useState<Word | null>(null);
    const [loadingWordInfo, setLoadingWordInfo] = useState(false);
    
    // For specific question types
    const [fillInAnswer, setFillInAnswer] = useState('');
    
    const handleNextRef = useRef<() => void>(null);
    
    const handleToggleInfo = async () => {
        if (showInfo) {
            setShowInfo(false);
            return;
        }
        
        setShowInfo(true);
        const currentQ = questions[currentIndex];
        if (!fullWordInfo || fullWordInfo.id !== currentQ.wordId) {
            setLoadingWordInfo(true);
            try {
                const data = await StudyService.getWord(userId, currentQ.wordId);
                setFullWordInfo(data);
            } catch (error) {
                console.error("Failed to fetch full word info", error);
            } finally {
                setLoadingWordInfo(false);
            }
        }
    };
    
    useEffect(() => {
        loadBatch();
    }, [listId]);

    useEffect(() => {
        handleNextRef.current = handleNext;
    });

    const loadBatch = async () => {
        if (!listId) return;
        setLoading(true);
        try {
            const batch = await StudyService.getNextBatch(userId, Number(listId), Number(sizeParam), typesParam ? typesParam.split(',') : undefined);
            setQuestions(batch);
            setCurrentIndex(0);
            setResults([]);
            setIsCurrentAnswered(false);
            setShowInfo(false);
            setFillInAnswer('');
        } catch (error) {
            console.error("Failed to load study batch", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (isCorrect: boolean) => {
        if (isCurrentAnswered) return;
        
        setIsCurrentAnswered(true);
        const currentQ = questions[currentIndex];
        
        setResults(prev => [...prev, {
            wordId: currentQ.wordId,
            isCorrect
        }]);
    };

    const handleSkip = () => {
        if (isCurrentAnswered) return;
        
        setIsCurrentAnswered(true);
        const currentQ = questions[currentIndex];
        
        setResults(prev => [...prev, {
            wordId: currentQ.wordId,
            isCorrect: false,
            skipped: true
        }]);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsCurrentAnswered(false);
            setShowInfo(false);
            setFillInAnswer('');
        } else {
            // Show recap screen instead of auto-loading next
            setIsRecap(true);
        }
    };

    const finishBatch = async () => {
        setSaving(true);
        try {
            await StudyService.processStudyResults(userId, results);
            const nextBatch = await StudyService.getNextBatch(userId, Number(listId), Number(sizeParam), typesParam ? typesParam.split(',') : undefined);
            if (nextBatch.length > 0) {
                setQuestions(nextBatch);
                setCurrentIndex(0);
                setResults([]);
                setIsCurrentAnswered(false);
                setShowInfo(false);
                setIsRecap(false);
                setFillInAnswer('');
            } else {
                navigate('/lists');
            }
        } catch (error) {
            console.error("Failed to save results", error);
        } finally {
            setSaving(false);
        }
    };

    const playAudio = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h2 className="text-2xl font-bold mb-4">You have reviewed all due words!</h2>
                <button onClick={() => navigate('/lists')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">Back to Lists</button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    if (isRecap) {
        const correctCount = results.filter(r => r.isCorrect).length;
        const total = results.length;
        const percentage = Math.round((correctCount / total) * 100) || 0;
        let message = "İyi İş Çıkardın!";
        let emoji = "👍";
        if (percentage >= 90) { message = "Mükemmel!"; emoji = "🏆"; }
        else if (percentage >= 70) { message = "Çok İyi!"; emoji = "🌟"; }
        else if (percentage < 50) { message = "Daha Fazla Pratik Yapmalısın"; emoji = "💪"; }

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex flex-col items-center py-10 px-4 overflow-hidden relative">
                {/* Confetti effect background for high scores */}
                {percentage >= 70 && (
                    <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent animate-pulse" />
                )}
                
                <div className="w-full max-w-2xl bg-white dark:bg-[#161822] rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 z-10">
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-4xl mb-4 shadow-inner">
                        {emoji}
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{message}</h2>
                    <p className="text-gray-500 mb-8 font-medium">Bu çalışma seansındaki performansın</p>

                    <div className="flex gap-4 w-full mb-8">
                        <div className="flex-1 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-3xl p-6 text-center border border-indigo-100 dark:border-indigo-500/20 transition-transform hover:scale-105">
                            <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{percentage}%</div>
                            <div className="text-xs font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">Başarı Oranı</div>
                        </div>
                        <div className="flex-1 bg-emerald-50/80 dark:bg-emerald-500/10 rounded-3xl p-6 text-center border border-emerald-100 dark:border-emerald-500/20 transition-transform hover:scale-105">
                            <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 mb-2">{correctCount}</div>
                            <div className="text-xs font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest">Doğru Kelime</div>
                        </div>
                        <div className="flex-1 bg-amber-50/80 dark:bg-amber-500/10 rounded-3xl p-6 text-center border border-amber-100 dark:border-amber-500/20 transition-transform hover:scale-105">
                            <div className="text-5xl font-black text-amber-600 dark:text-amber-400 mb-2">+{correctCount * 10}</div>
                            <div className="text-xs font-black text-amber-400 dark:text-amber-500 uppercase tracking-widest">XP Kazanıldı</div>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-3 mb-8 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {questions.map((q, idx) => {
                            const result = results[idx];
                            if (!result) return null;
                            const isSkipped = result.skipped;
                            const isCorrect = result.isCorrect;

                            return (
                                <div key={q.wordId} className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border",
                                    isSkipped ? "bg-amber-50/50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/20" :
                                    isCorrect ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20" :
                                    "bg-rose-50/50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/20"
                                )}>
                                    <div>
                                        <div className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                            {q.word}
                                            <span className="text-[10px] bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded uppercase">{q.pos}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{q.definition}</div>
                                    </div>
                                    <div className="shrink-0 ml-4">
                                        {isSkipped ? <ArrowRight className="w-6 h-6 text-amber-500" /> :
                                         isCorrect ? <Check className="w-6 h-6 text-emerald-500" /> :
                                         <X className="w-6 h-6 text-rose-500" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={finishBatch}
                        disabled={saving}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-lg rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30 hover:scale-105"
                    >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : "Çalışmaya Devam Et"}
                        {!saving && <ArrowRight className="w-6 h-6" />}
                    </button>
                    
                    <button
                        onClick={() => navigate('/lists')}
                        className="mt-4 w-full py-4 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                    >
                        Listelere Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0f1117] flex flex-col items-center py-10 px-4">
            {/* Header */}
            <div className="w-full max-w-2xl flex items-center justify-between mb-8">
                <button onClick={() => navigate('/lists')} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg">
                    <X className="w-6 h-6" />
                </button>
                <div className="flex-1 mx-4 bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                    />
                </div>
                <span className="font-medium text-gray-500">{currentIndex + 1} / {questions.length}</span>
            </div>

            {/* Quiz Card */}
            <div className="w-full max-w-2xl bg-white dark:bg-[#161822] rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8 min-h-[300px] flex flex-col transition-all">
                
                {!showInfo && (
                    <>
                        {/* Context area based on question type */}
                        <div className="mb-8 text-center">
                            <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-4">
                                {currentQ.questionType === 'LISTENING' ? 'Listen & Type' : 'What is this word?'}
                            </h3>
                            
                            {currentQ.questionType === 'LISTENING' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <button 
                                        onClick={() => playAudio(currentQ.word)}
                                        className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200 transition-colors"
                                    >
                                        <Volume2 className="w-8 h-8" />
                                    </button>
                                    <p className="text-gray-500">Click to listen to the word</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
                                        {currentQ.definition}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Answer Area */}
                        <div className="mt-auto">
                            {currentQ.questionType === 'MULTIPLE_CHOICE' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentQ.choices?.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAnswer(opt === currentQ.word)}
                                            disabled={isCurrentAnswered}
                                            className={cn(
                                                "p-4 rounded-xl text-lg font-medium transition-all text-center border-2",
                                                isCurrentAnswered
                                                    ? opt === currentQ.word
                                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                                        : "bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-800/50 dark:border-gray-800"
                                                    : "bg-white border-gray-200 text-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:bg-[#161822] dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
                                            )}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {(currentQ.questionType === 'FILL_IN_THE_BLANKS' || currentQ.questionType === 'LISTENING') && (
                                <div className="flex flex-col gap-4">
                                    <input
                                        type="text"
                                        value={fillInAnswer}
                                        onChange={(e) => setFillInAnswer(e.target.value)}
                                        disabled={isCurrentAnswered}
                                        placeholder="Type the word..."
                                        className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:outline-none p-4 disabled:opacity-50"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && fillInAnswer.trim() && !isCurrentAnswered) {
                                                handleAnswer(fillInAnswer.toLowerCase().trim() === currentQ.word.toLowerCase());
                                            }
                                        }}
                                    />
                                    {!isCurrentAnswered && (
                                        <button
                                            onClick={() => handleAnswer(fillInAnswer.toLowerCase().trim() === currentQ.word.toLowerCase())}
                                            disabled={!fillInAnswer.trim()}
                                            className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                        >
                                            Check
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!isCurrentAnswered && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            onClick={handleSkip}
                            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            Pass
                        </button>
                    </div>
                )}

                {isCurrentAnswered && (
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const lastResult = results[results.length - 1];
                                    const isCorrect = lastResult?.isCorrect;
                                    const isSkipped = lastResult?.skipped;
                                    
                                    if (isSkipped) {
                                        return (
                                            <>
                                                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                    <ArrowRight className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className="text-xl font-bold text-amber-600 block">Passed</span>
                                                    <span className="text-sm font-medium text-gray-500">The answer was: <span className="text-indigo-500 font-bold">{currentQ.word}</span></span>
                                                </div>
                                            </>
                                        );
                                    }
                                    
                                    return isCorrect ? (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                <Check className="w-6 h-6" />
                                            </div>
                                            <span className="text-xl font-bold text-emerald-600">Correct!</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                                <X className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <span className="text-xl font-bold text-rose-600 block">Incorrect</span>
                                                <span className="text-sm font-medium text-gray-500">The answer was: <span className="text-indigo-500 font-bold">{currentQ.word}</span></span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                            
                            <button
                                onClick={handleNext}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (currentIndex === questions.length - 1 ? 'Finish' : 'Next')}
                                {!saving && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Word Chip */}
                        <div 
                            onClick={handleToggleInfo}
                            className="bg-white dark:bg-[#161822] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer rounded-2xl p-4 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                <span className="text-lg font-bold text-gray-900 dark:text-white shrink-0">{currentQ.word}</span>
                                {currentQ.definition && (
                                    <span className="text-gray-500 dark:text-gray-400 truncate text-sm">
                                        {currentQ.definition}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleToggleInfo(); }}
                                className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-4 transition-colors", showInfo ? "bg-indigo-500 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500")}
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Expandable Word Info Block */}
                        {showInfo && (
                            <div className="mt-4 animate-in slide-in-from-top-2 relative z-10 w-full max-w-[400px] mx-auto">
                                {loadingWordInfo ? (
                                    <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 h-80">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                    </div>
                                ) : fullWordInfo ? (
                                    <WordCard
                                        id={fullWordInfo.id}
                                        word={fullWordInfo.word}
                                        frequency={fullWordInfo.frequency || 0}
                                        isKnown={fullWordInfo.isKnown || false}
                                        definition={fullWordInfo.definition}
                                        difficulty={fullWordInfo.difficulty}
                                        onToggleKnown={(id, currentStatus) => setFullWordInfo({ ...fullWordInfo, isKnown: !currentStatus })}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 h-80">
                                        Failed to load word details.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyPage;
