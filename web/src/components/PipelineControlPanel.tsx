import React, { useState, useEffect, useCallback } from 'react';
import { Play, Activity, Clock, AlertTriangle, RefreshCw, BarChart3, Database, ShieldCheck, Zap } from 'lucide-react';
import { PipelineAPI, PipelineStatus, FailedWord } from '@/services/MediaService';

interface Counts {
    pendingAnalysis: number;
    pendingEnrichment: number;
}

const PipelineControlPanel = () => {
    const [counts, setCounts] = useState<Counts>({ pendingAnalysis: 0, pendingEnrichment: 0 });
    const [status, setStatus] = useState<PipelineStatus | null>(null);
    const [batchSize, setBatchSize] = useState(100);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const [countsData, statusData] = await Promise.all([
                PipelineAPI.getPendingCounts(),
                PipelineAPI.getStatus()
            ]);
            setCounts(countsData);
            setStatus(statusData);
        } catch (err) {
            console.error('Failed to fetch pipeline info', err);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleStartPipeline = async () => {
        if (!window.confirm(`Start enrichment pipeline for ${batchSize} words?`)) return;
        setLoading(true);
        try {
            await PipelineAPI.start(batchSize);
            fetchStatus();
        } catch (err) {
            alert('Failed to start pipeline');
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalSpecialistFix = async () => {
        if (!window.confirm('Trigger global specialist fix for ALL flagged words?')) return;
        setActionLoading('specialist');
        try {
            await PipelineAPI.triggerGlobalSpecialistFix();
            alert('Global specialist fix triggered');
        } catch (err) {
            alert('Failed to trigger catalyst fix');
        } finally {
            setActionLoading(null);
        }
    };

    const handleTriggerAnalysis = async () => {
        setActionLoading('analysis');
        try {
            await PipelineAPI.triggerAnalysis();
            alert('Analysis job triggered');
            fetchStatus();
        } catch (err) {
            alert('Failed to trigger analysis');
        } finally {
            setActionLoading(null);
        }
    };

    const getStepColor = (step: string) => {
        switch (step) {
            case 'WORKER': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'SHERIFF': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
            case 'SPECIALIST': return 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20';
            case 'JUDGE': return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case 'AUDITOR': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            case 'COMPLETE': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
            case 'FAILED': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
        }
    };

    return (
        <div className="space-y-6">
            {/* Pipeline Header & Controls */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Enrichment Pipeline</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage Sheriff, Specialist, and Judge workflows</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1">
                            <span className="text-xs font-medium text-gray-500 mr-2">Batch Size:</span>
                            <input
                                type="number"
                                value={batchSize}
                                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                                className="w-16 bg-transparent outline-none text-sm font-bold text-gray-900 dark:text-white"
                                min="1"
                                max="1000"
                            />
                        </div>
                        <button
                            onClick={handleStartPipeline}
                            disabled={loading || status?.running}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
                        >
                            {status?.running && status?.currentStep !== 'AUDITOR' ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {status?.running && status?.currentStep !== 'AUDITOR' ? 'Running...' : 'Start Pipeline'}
                        </button>

                        <button
                            onClick={async () => {
                                if (!window.confirm(`Start AI Auditor for ${batchSize} recently enriched words?`)) return;
                                setActionLoading('auditor');
                                try {
                                    await PipelineAPI.startAuditor(batchSize);
                                    fetchStatus();
                                } catch (err) {
                                    alert('Failed to start auditor');
                                } finally {
                                    setActionLoading(null);
                                }
                            }}
                            disabled={loading || status?.running}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
                        >
                            {status?.running && status?.currentStep === 'AUDITOR' ? <Activity className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            {status?.running && status?.currentStep === 'AUDITOR' ? 'Auditing...' : 'Start Auditor'}
                        </button>
                    </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard 
                        label="Pending Analysis" 
                        value={counts.pendingAnalysis} 
                        icon={<BarChart3 className="w-4 h-4" />} 
                        onClick={handleTriggerAnalysis}
                        loading={actionLoading === 'analysis'}
                    />
                    <StatCard 
                        label="Pending Enrichment" 
                        value={counts.pendingEnrichment} 
                        icon={<Database className="w-4 h-4" />} 
                    />
                    <StatCard 
                        label="Judge Queue" 
                        value={status?.judgeQueueSize || 0} 
                        icon={<ShieldCheck className="w-4 h-4" />} 
                        color="amber"
                    />
                    <StatCard 
                        label="Failed (Need Fix)" 
                        value={status?.failedWords?.length || 0} 
                        icon={<AlertTriangle className="w-4 h-4" />} 
                        color="red"
                        onClick={handleGlobalSpecialistFix}
                        loading={actionLoading === 'specialist'}
                    />
                </div>

                {/* Real-time Progress Section */}
                {status && (status.running || status.currentStep === 'COMPLETE' || status.currentStep === 'FAILED') && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getStepColor(status.currentStep)}`}>
                                    {status.currentStep}
                                </span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Step: {status.currentStep === 'IDLE' ? 'Ready' : status.currentStep}
                                </span>
                            </div>
                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                {status.progressPercent}% ({status.processedWords}/{status.totalWords})
                            </span>
                        </div>
                        
                        {/* Progress Bar Container */}
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-gray-200 dark:border-gray-700">
                            <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                style={{ width: `${status.progressPercent}%` }}
                            />
                        </div>

                        {/* Timing Chips */}
                        {Object.entries(status.stepTimings).length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {Object.entries(status.stepTimings).map(([step, ms]) => (
                                    <div key={step} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 text-[10px]">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-500 font-medium uppercase">{step}:</span>
                                        <span className="text-gray-900 dark:text-gray-300 font-bold">{(ms / 1000).toFixed(1)}s</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Failure Log */}
            {status?.failedWords && status.failedWords.length > 0 && (
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                            <h3 className="font-bold text-sm">Pipeline Failures</h3>
                        </div>
                        <span className="text-xs font-medium text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                            {status.failedWords.length} Words
                        </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {status.failedWords.map((f, i) => (
                            <div key={i} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">{f.word}</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                        Step: {f.step}
                                    </span>
                                </div>
                                <p className="text-xs text-red-600 dark:text-red-400 line-clamp-1">{f.error}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ label, value, icon, onClick, loading, color = 'indigo' }: any) => {
    const colors: any = {
        indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
        red: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
    };

    return (
        <div 
            onClick={onClick}
            className={`p-4 bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-xl transition-all ${onClick ? 'cursor-pointer hover:border-indigo-500 active:scale-95' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${colors[color]}`}>
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : icon}
                </div>
                <span className="text-xl font-black text-gray-900 dark:text-white">{value}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{label}</p>
        </div>
    );
};

export default PipelineControlPanel;
