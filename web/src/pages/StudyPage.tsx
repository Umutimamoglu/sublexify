import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StudyService, { StudyQuestion, StudyResult } from '@/services/StudyService';
import { Loader2, X, Check, ArrowRight, Volume2 } from 'lucide-react';
import { cn } from '@/utils/cn';

const StudyPage = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    const userId = 1; // sprint 4 auth mock

    const [questions, setQuestions] = useState<StudyQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // answers tracking
    const [results, setResults] = useState<StudyResult[]>([]);
    const [isCurrentAnswered, setIsCurrentAnswered] = useState(false);
    
    // For specific question types
    const [fillInAnswer, setFillInAnswer] = useState('');
    
    useEffect(() => {
        loadBatch();
    }, [listId]);

    const loadBatch = async () => {
        if (!listId) return;
        setLoading(true);
        try {
            const batch = await StudyService.getNextBatch(userId, Number(listId), 10);
            setQuestions(batch);
            setCurrentIndex(0);
            setResults([]);
            setIsCurrentAnswered(false);
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

    const handleNext = async () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setIsCurrentAnswered(false);
            setFillInAnswer('');
        } else {
            // Finish batch
            setSaving(true);
            try {
                await StudyService.processStudyResults(userId, results);
                // After saving, load next batch or go back
                const nextBatch = await StudyService.getNextBatch(userId, Number(listId), 10);
                if (nextBatch.length > 0) {
                    setQuestions(nextBatch);
                    setCurrentIndex(0);
                    setResults([]);
                    setIsCurrentAnswered(false);
                    setFillInAnswer('');
                } else {
                    navigate('/lists');
                }
            } catch (error) {
                console.error("Failed to save results", error);
            } finally {
                setSaving(false);
            }
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
            <div className="w-full max-w-2xl bg-white dark:bg-[#161822] rounded-3xl shadow-xl border border-gray-200/60 dark:border-gray-800/60 p-8 sm:p-12 min-h-[400px] flex flex-col">
                
                {/* Context area based on question type */}
                <div className="mb-10 text-center">
                    <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-6">
                        {currentQ.questionType === 'LISTENING' ? 'Listen & Type' : 'What is this word?'}
                    </h3>
                    
                    {currentQ.questionType === 'LISTENING' ? (
                        <div className="flex flex-col items-center gap-6">
                            <button 
                                onClick={() => playAudio(currentQ.word)}
                                className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200 transition-colors"
                            >
                                <Volume2 className="w-10 h-10" />
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
                            {currentQ.options?.map((opt, i) => (
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

                {/* Feedback & Next Button */}
                {isCurrentAnswered && (
                    <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const isCorrect = results[results.length - 1]?.isCorrect;
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
                )}
            </div>
        </div>
    );
};

export default StudyPage;
