import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { PipelineAPI } from '@/services/MediaService';

const JudgeReviewPanel: React.FC = () => {
    const [pendingWords, setPendingWords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const words = await PipelineAPI.getJudgePending();
            setPendingWords(words);
        } catch (err) {
            console.error('Failed to fetch judge pending words', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (wordId: number) => {
        setActionLoading(wordId);
        try {
            await PipelineAPI.approveJudge(wordId);
            setPendingWords(prev => prev.filter(w => w.id !== wordId));
        } catch (err) {
            console.error('Failed to approve', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (wordId: number) => {
        setActionLoading(wordId);
        try {
            await PipelineAPI.rejectJudge(wordId);
            setPendingWords(prev => prev.filter(w => w.id !== wordId));
        } catch (err) {
            console.error('Failed to reject', err);
        } finally {
            setActionLoading(null);
        }
    };

    if (pendingWords.length === 0 && !loading) return null;

    return (
        <div className="bg-white dark:bg-[#161822] border border-orange-200/60 dark:border-orange-800/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    ⚖️ Judge Review
                    <span className="text-sm font-normal text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                        {pendingWords.length} pending
                    </span>
                </h2>
                <button
                    onClick={fetchPending}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingWords.map((word) => (
                        <div key={word.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                        {word.word}
                                    </span>
                                    {word.difficulty && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border
                                            ${word.difficulty === 'C2' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                                                word.difficulty === 'C1' ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' :
                                                    'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                                            {word.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleApprove(word.id)}
                                        disabled={actionLoading === word.id}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading === word.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(word.id)}
                                        disabled={actionLoading === word.id}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading === word.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5" />
                                        )}
                                        Reject
                                    </button>
                                </div>
                            </div>

                            {/* Comparison: Current vs Judge's Verdict */}
                            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                                {/* Current */}
                                <div className="p-4">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Current</h4>
                                    {word.definition ? (
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-900 dark:text-gray-100 font-medium">{word.definition.definition}</p>
                                            <p className="text-gray-500 dark:text-gray-400 italic">{word.definition.turkish}</p>
                                            {word.definition.exampleSentence && (
                                                <p className="text-gray-400 text-xs mt-1">"{word.definition.exampleSentence}"</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic">No definition</p>
                                    )}
                                </div>

                                {/* Judge's Verdict */}
                                <div className="p-4 bg-orange-50/30 dark:bg-orange-900/5">
                                    <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">Judge's Verdict</h4>
                                    {word.judgeVerdict ? (
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-900 dark:text-gray-100 font-medium">{word.judgeVerdict.definition}</p>
                                            <p className="text-gray-500 dark:text-gray-400 italic">{word.judgeVerdict.turkish}</p>
                                            {word.judgeVerdict.exampleSentence && (
                                                <p className="text-gray-400 text-xs mt-1">"{word.judgeVerdict.exampleSentence}"</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic">No verdict</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default JudgeReviewPanel;
