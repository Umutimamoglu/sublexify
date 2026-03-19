import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, CheckCircle, RefreshCw, X, ChevronLeft, ChevronRight, Info, Download } from 'lucide-react';
import { PipelineAPI, Page } from '@/services/MediaService';
import { Word } from '@/services/WordListService';
import api from '@/services/api';

const AuditReviewPanel = () => {
    const [page, setPage] = useState<Page<Word> | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [selectedWord, setSelectedWord] = useState<Word | null>(null);

    const fetchProblems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await PipelineAPI.getAuditProblems(currentPage, 10);
            setPage(data);
        } catch (err) {
            console.error('Failed to fetch audit problems', err);
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => {
        fetchProblems();
    }, [fetchProblems]);

    const handleBatchAction = async (action: 'resolve' | 'reset') => {
        if (selectedIds.length === 0) return;
        
        setActionLoading(action);
        try {
            if (action === 'resolve') {
                await PipelineAPI.resolveAuditProblems(selectedIds);
            } else {
                await api.post('/admin/words/reset-definitions', selectedIds);
            }
            setSelectedIds([]);
            fetchProblems();
            setSelectedWord(null);
        } catch (err) {
            alert(`Batch ${action} failed`);
        } finally {
            setActionLoading(null);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl overflow-hidden mb-8 shadow-sm">
            {/* Word Detail Modal */}
            {selectedWord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1c1f2e] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                    <Info className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                        {selectedWord.word}
                                        <span className="px-3 py-1 bg-indigo-500 text-white rounded-full text-xs font-black uppercase tracking-widest">
                                            {selectedWord.difficulty || '??'}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-500">Kelime Detayları ve Audit Raporu</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedWord(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Problem Section */}
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <h4 className="text-red-500 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    GPT-5 Audit Hatası
                                </h4>
                                <p className="text-red-700 dark:text-red-400 font-bold text-lg leading-relaxed">
                                    {selectedWord.step3Error || 'Hata açıklaması belirtilmemiş.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Meanings */}
                                <div className="space-y-4">
                                    <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Definitions & Meanings</h4>
                                    <div className="space-y-3">
                                        {selectedWord.definition?.meanings.map((m, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[10px] font-black uppercase">{m.pos}</span>
                                                    <span className="text-gray-900 dark:text-white font-bold">{m.definition}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 italic leading-relaxed">"{m.example}"</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {/* Verb Forms */}
                                    {selectedWord.definition?.verb_forms && (
                                        <div className="space-y-4">
                                            <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Verb Forms</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(selectedWord.definition.verb_forms).map(([key, val]) => (
                                                    <div key={key} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase text-indigo-500/60">{key}</span>
                                                        <span className="text-sm font-bold dark:text-white capitalize">{val as string}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Phrasal Verbs */}
                                    {selectedWord.definition?.phrasal_verbs && selectedWord.definition.phrasal_verbs.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Phrasal Verbs</h4>
                                            <div className="space-y-2">
                                                {selectedWord.definition.phrasal_verbs.map((pv, idx) => (
                                                    <div key={idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                                        <p className="font-bold text-sm dark:text-white">{pv.phrase}</p>
                                                        <p className="text-xs text-gray-500">{pv.definition}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Metadata */}
                                    <div className="space-y-4">
                                        <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Internal Meta</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold">ID: {selectedWord.id}</span>
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold">Language: {selectedWord.language}</span>
                                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-lg text-[10px] font-bold">Status: {selectedWord.judgeStatus || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Raw JSON View */}
                            <div className="mt-8 space-y-4">
                                <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Raw Object Data</h4>
                                <div className="bg-gray-900 rounded-2xl p-4 overflow-x-auto">
                                    <pre className="text-[10px] text-indigo-300 font-mono">
                                        {JSON.stringify(selectedWord, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/5 flex justify-end gap-3">
                            <button 
                                onClick={() => { setSelectedIds([selectedWord.id!]); handleBatchAction('resolve'); }}
                                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all shadow-lg shadow-green-500/20 text-xs"
                            >
                                YOK SAY (KEEP)
                            </button>
                            <button 
                                onClick={() => { setSelectedIds([selectedWord.id!]); handleBatchAction('reset'); }}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl transition-all shadow-lg shadow-red-500/20 text-xs"
                            >
                                SIFIRLA (RESET)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Teftiş Panosu (AI Auditor Problems)
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">GPT-5 tarafından bayraklanan sorunlu kelimeleri gözden geçir</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleBatchAction('resolve')}
                        disabled={selectedIds.length === 0 || !!actionLoading}
                        className="px-4 py-2 text-xs font-bold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 rounded-lg hover:bg-green-100 transition-all disabled:opacity-50"
                    >
                        {actionLoading === 'resolve' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yok Say (Resolve)'}
                    </button>
                    <button
                        onClick={() => handleBatchAction('reset')}
                        disabled={selectedIds.length === 0 || !!actionLoading}
                        className="px-4 py-2 text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                        {actionLoading === 'reset' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sıfırla (Reset)'}
                    </button>
                    <button
                        onClick={() => PipelineAPI.downloadAuditProblems()}
                        className="px-4 py-2 text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                        <Download className="w-3 h-3" />
                        JSON İndir
                    </button>
                    <button 
                        onClick={fetchProblems}
                        className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        <tr>
                            <th className="p-4 w-10">
                                <input 
                                    type="checkbox" 
                                    onChange={(e) => {
                                        if (e.target.checked && page) setSelectedIds(page.content.map(w => w.id!));
                                        else setSelectedIds([]);
                                    }}
                                    checked={page?.content.length === selectedIds.length && selectedIds.length > 0}
                                />
                            </th>
                            <th className="px-4 py-3">Kelime</th>
                            <th className="px-4 py-3">CEFR</th>
                            <th className="px-4 py-3">Hata Detayı (GPT-5)</th>
                            <th className="px-4 py-3 text-right">Aksiyon</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-2" />
                                    <span className="text-gray-500">Kelimeler yükleniyor...</span>
                                </td>
                            </tr>
                        ) : page?.content.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <h3 className="font-bold text-gray-900 dark:text-white">Her Şey Temiz!</h3>
                                    <p className="text-gray-500">Şu an incelenmesi gereken bir sorun bulunmuyor.</p>
                                </td>
                            </tr>
                        ) : (
                            page?.content.map(word => (
                                <tr key={word.id} className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedIds.includes(word.id!) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(word.id!)}
                                            onChange={() => toggleSelect(word.id!)}
                                        />
                                    </td>
                                    <td 
                                        onClick={() => setSelectedWord(word)}
                                        className="px-4 py-3 font-bold text-gray-900 dark:text-white cursor-pointer hover:text-indigo-500 transition-colors underline decoration-dotted underline-offset-4"
                                    >
                                        {word.word}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] font-bold">
                                            {word.difficulty || '??'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 group relative">
                                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                {word.step3Error || 'Belirtilmemiş hata.'}
                                            </p>
                                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                            {/* Definition Tooltip */}
                                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                <p className="font-bold mb-1">Mevcut Tanımlar:</p>
                                                {word.definition?.meanings.map((m, i) => (
                                                    <div key={i} className="mb-1 opacity-80">• {m.definition}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => { setSelectedIds([word.id!]); handleBatchAction('resolve'); }}
                                                className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"
                                                title="Yok Say"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedIds([word.id!]); handleBatchAction('reset'); }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Sıfırla"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {page && page.totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
                    <span className="text-xs text-gray-500 font-medium">
                        Showing page {page.number + 1} of {page.totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page.first}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            disabled={page.last}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-white dark:hover:bg-gray-800 transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditReviewPanel;
