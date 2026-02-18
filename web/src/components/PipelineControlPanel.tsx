import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Play, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { PipelineAPI } from '@/services/MediaService';
import type { PipelineStatus, FailedWord } from '@/services/MediaService';

const STEP_LABELS: Record<string, string> = {
    IDLE: '⏸ Idle',
    WORKER: '🔧 Worker (GPT-4.1-mini)',
    SHERIFF: '🤠 Sheriff (Gemini 2.5 Flash)',
    SPECIALIST: '🔬 Specialist (Claude 4.5 Haiku)',
    JUDGE: '⚖️ Judge (GPT-5-mini)',
    COMPLETE: '✅ Complete',
    FAILED: '❌ Failed',
};

const STEP_COLORS: Record<string, string> = {
    IDLE: 'bg-gray-400',
    WORKER: 'bg-blue-500',
    SHERIFF: 'bg-yellow-500',
    SPECIALIST: 'bg-purple-500',
    JUDGE: 'bg-orange-500',
    COMPLETE: 'bg-green-500',
    FAILED: 'bg-red-500',
};

const PipelineControlPanel: React.FC = () => {
    const [batchSize, setBatchSize] = useState(100);
    const [status, setStatus] = useState<PipelineStatus | null>(null);
    const [starting, setStarting] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // poll status while running
    useEffect(() => {
        // fetch status on mount
        PipelineAPI.getStatus().then(setStatus).catch(console.error);
    }, []);

    useEffect(() => {
        if (status?.running) {
            intervalRef.current = setInterval(async () => {
                try {
                    const s = await PipelineAPI.getStatus();
                    setStatus(s);
                    if (!s.running) {
                        if (intervalRef.current) clearInterval(intervalRef.current);
                    }
                } catch (err) {
                    console.error('Polling failed', err);
                }
            }, 3000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [status?.running]);

    const handleStart = async () => {
        setStarting(true);
        try {
            await PipelineAPI.start(batchSize);
            // start polling immediately
            const s = await PipelineAPI.getStatus();
            setStatus(s);
        } catch (err) {
            console.error('Failed to start pipeline', err);
        } finally {
            setStarting(false);
        }
    };

    const step = status?.currentStep || 'IDLE';
    const pct = status?.progressPercent || 0;

    return (
        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                🚀 AI Enrichment Pipeline
            </h2>

            {/* Controls */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Batch:</label>
                    <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 0)}
                        onBlur={() => setBatchSize(prev => Math.max(1, prev))}
                        disabled={status?.running}
                        className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    />
                </div>
                <button
                    onClick={handleStart}
                    disabled={starting || status?.running}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {starting || status?.running ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Play className="w-4 h-4" />
                    )}
                    {status?.running ? 'Running...' : 'Start Pipeline'}
                </button>
            </div>

            {/* Progress */}
            {step !== 'IDLE' && (
                <div className="space-y-4">
                    {/* Step indicator */}
                    <div className="flex items-center gap-3">
                        <span className={`inline-block w-3 h-3 rounded-full ${STEP_COLORS[step]} ${status?.running ? 'animate-pulse' : ''}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {STEP_LABELS[step]}
                        </span>
                        <span className="text-xs text-gray-500">
                            ({status?.processedWords || 0}/{status?.totalWords || 0} words)
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${STEP_COLORS[step]}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>

                    {/* Step timings */}
                    {status?.stepTimings && Object.keys(status.stepTimings).length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-2">
                            {Object.entries(status.stepTimings).map(([name, ms]) => (
                                <span key={name} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                                    {name}: {ms > 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Judge queue indicator */}
                    {(step === 'JUDGE' || step === 'COMPLETE') && status?.judgeQueueSize !== undefined && status.judgeQueueSize > 0 && (
                        <div className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2 mt-2">
                            ⚖️ {status.judgeQueueSize} words sent to Judge for review
                        </div>
                    )}

                    {/* Failures */}
                    {status?.failedWords && status.failedWords.length > 0 && (
                        <div className="mt-4 border border-red-200 dark:border-red-800/50 rounded-xl overflow-hidden">
                            <div className="bg-red-50 dark:bg-red-900/10 px-4 py-2 border-b border-red-200 dark:border-red-800/50 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    {status.failedWords.length} Failed Words
                                </span>
                            </div>
                            <div className="max-h-40 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30">
                                {status.failedWords.map((fw: FailedWord, i: number) => (
                                    <div key={i} className="px-4 py-2 text-xs flex items-center gap-3">
                                        <span className="font-mono font-semibold text-red-600 dark:text-red-400">{fw.word}</span>
                                        <span className="text-gray-400">@{fw.step}</span>
                                        <span className="text-gray-500 truncate">{fw.error}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PipelineControlPanel;
