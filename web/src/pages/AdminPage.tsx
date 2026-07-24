import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import MediaService from '@/services/MediaService';
import FeedbackService from '@/services/FeedbackService';
import type { MediaRequest, Feedback } from '@/services/FeedbackService';
import type { TmdbMedia, TmdbSeasonDetails } from '@/services/MediaService';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, Search, Download, ChevronDown, ChevronRight, Users, MessageSquare, Clock, Filter, Trash2, Bell, Send } from 'lucide-react';
import JudgeReviewPanel from '@/components/JudgeReviewPanel';
import PipelineControlPanel from '@/components/PipelineControlPanel';
import AuditReviewPanel from '@/components/AuditReviewPanel';
import PremiumSection from '@/components/features/PremiumSection';
import NotificationService, { type AdminUser } from '@/services/NotificationService';


// --- USER INFORMATION SECTION ---
function UserInfoSection({ requests, feedbacks, loading, onUpdateStatus }: {
    requests: MediaRequest[],
    feedbacks: Feedback[],
    loading: boolean,
    onUpdateStatus: (id: number, status: string) => Promise<void>
}) {
    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            {/* Media Requests */}
            <section className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    İçerik İstekleri
                </h2>
                <div className="space-y-4">
                    {requests.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Henüz istek yok.</p>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="w-16 h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                                    {req.posterPath ? (
                                        <img src={`https://image.tmdb.org/t/p/w200${req.posterPath}`} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><FileText className="w-6 h-6 text-gray-400" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white truncate">{req.title}</h3>
                                            <p className="text-xs text-gray-500 uppercase tracking-tight">{req.mediaType}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            req.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            req.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.userName}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}</span>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button 
                                            onClick={() => req.id && onUpdateStatus(req.id, 'APPROVED')}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Onayla
                                        </button>
                                        <button 
                                            onClick={() => req.id && onUpdateStatus(req.id, 'REJECTED')}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Reddet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* General Feedback */}
            <section className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    Geri Bildirimler
                </h2>
                <div className="space-y-4">
                    {feedbacks.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Henüz geri bildirim yok.</p>
                    ) : (
                        feedbacks.map(f => (
                            <div key={f.id} className="p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{f.userName}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            f.category === 'BUG' ? 'bg-red-100 text-red-700' :
                                            f.category === 'SUGGESTION' ? 'bg-blue-100 text-blue-700' :
                                            f.category === 'BETA_TESTER' ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {f.category}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">{f.createdAt ? new Date(f.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {f.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-2">{f.userEmail}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

// --- PUSH NOTIFICATIONS SECTION ---
function PushNotificationSection() {
    const [mode, setMode] = useState<'user' | 'all'>('user');
    const [recipients, setRecipients] = useState<AdminUser[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [url, setUrl] = useState('');
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    useEffect(() => {
        (async () => {
            setLoadingRecipients(true);
            try {
                setRecipients(await NotificationService.getRecipients());
            } catch {
                setStatus({ type: 'error', msg: 'Kullanıcı listesi yüklenemedi.' });
            } finally {
                setLoadingRecipients(false);
            }
        })();
    }, []);

    const filtered = recipients.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );
    const selectedUser = recipients.find(u => u.id === selectedUserId) || null;
    const totalDevices = recipients.reduce((sum, u) => sum + u.deviceCount, 0);

    const canSend = !!title.trim() && !!body.trim() && !sending &&
        (mode === 'all' || selectedUserId !== null);

    const handleSend = async () => {
        if (!canSend) return;
        setSending(true);
        setStatus(null);
        try {
            if (mode === 'all') {
                await NotificationService.broadcast(title.trim(), body.trim(), url.trim() || undefined);
                setStatus({ type: 'success', msg: `Bildirim tüm cihazlara (${totalDevices}) gönderildi.` });
            } else {
                await NotificationService.sendToUser(selectedUserId!, title.trim(), body.trim(), url.trim() || undefined);
                setStatus({ type: 'success', msg: `Bildirim "${selectedUser?.name || selectedUser?.email}" kullanıcısına gönderildi.` });
            }
            setTitle(''); setBody(''); setUrl('');
        } catch {
            setStatus({ type: 'error', msg: 'Gönderim başarısız oldu.' });
        } finally {
            setSending(false);
        }
    };

    const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f1118] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <section className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    Push Bildirimi Gönder
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Belirli bir kullanıcıya ya da tüm cihazlara anlık bildirim gönder. Toplam kayıtlı cihaz: {totalDevices}
                </p>

                {/* Mode toggle */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 w-fit">
                    {(['user', 'all'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === m
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            {m === 'user' ? 'Belirli Kullanıcı' : 'Tüm Kullanıcılar'}
                        </button>
                    ))}
                </div>

                {/* User picker */}
                {mode === 'user' && (
                    <div className="mb-6">
                        <div className="relative mb-3">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="İsim veya e-posta ara…"
                                className={inputCls + ' pl-10'}
                            />
                        </div>
                        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                            {loadingRecipients ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                            ) : filtered.length === 0 ? (
                                <p className="text-gray-500 text-center py-6 text-sm">Kullanıcı bulunamadı.</p>
                            ) : (
                                filtered.map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => setSelectedUserId(u.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${selectedUserId === u.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{u.name || '—'}</p>
                                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                        </div>
                                        <span className={`shrink-0 ml-3 text-xs px-2 py-1 rounded-full ${u.deviceCount > 0
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'}`}>
                                            {u.deviceCount > 0 ? `${u.deviceCount} cihaz` : 'cihaz yok'}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                        {selectedUser && selectedUser.deviceCount === 0 && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Bu kullanıcının kayıtlı cihazı yok — bildirim teslim edilmeyebilir.
                            </p>
                        )}
                    </div>
                )}

                {/* Message fields */}
                <div className="space-y-4">
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Başlık"
                        maxLength={80}
                        className={inputCls}
                    />
                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        placeholder="Mesaj"
                        rows={3}
                        maxLength={240}
                        className={inputCls + ' resize-none'}
                    />
                    <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="Deep-link (opsiyonel) — örn: library"
                        className={inputCls}
                    />
                </div>

                {status && (
                    <div className={`mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${status.type === 'success'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                        {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {status.msg}
                    </div>
                )}

                <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {mode === 'all' ? 'Tüm Cihazlara Gönder' : 'Kullanıcıya Gönder'}
                </button>
            </section>
        </div>
    );
}

// Helper Component for Media Groups (Accordion)
function MediaGroup({ title, count, items, onDelete, isSeries = false }: {
    title: string,
    count: number,
    items: any[],
    onDelete: (id: number, title: string) => void,
    isSeries?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    {isSeries ? (
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                    ) : (
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {count} {isSeries ? (count === 1 ? 'Episode' : 'Episodes') : (count === 1 ? 'Movie' : 'Movies')}
                        </p>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1e202e]/50">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {items.map(media => (
                            <div key={media.id} className="p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {isSeries ? media.title.split(' - ').slice(1).join(' - ') || media.title : media.title}
                                    </h5>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {media.totalWords} Words
                                    </p>
                                </div>
                                <button
                                    onClick={() => onDelete(media.id, media.title)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Component for Enriched Words Table
function EnrichedWordsTable({ filterFlagged = false, filterVerified = false, filterJudgeApproved = false, selectedDate = null }: {
    filterFlagged?: boolean,
    filterVerified?: boolean,
    filterJudgeApproved?: boolean,
    selectedDate?: string | null
}) {
    const [words, setWords] = useState<any[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [expandedWord, setExpandedWord] = useState<number | null>(null);

    const fetchWords = useCallback(async (pageIndex: number) => {
        setLoading(true);
        try {
            const data = await MediaService.getEnrichedWords(
                pageIndex,
                10,
                filterFlagged,
                filterVerified,
                filterJudgeApproved,
                selectedDate || undefined
            );
            setWords(data.content);
            setTotalPages(data.totalPages);
            setPage(data.number);
        } catch (err) {
            console.error('Failed to fetch words', err);
        } finally {
            setLoading(false);
        }
    }, [filterFlagged, filterVerified, filterJudgeApproved, selectedDate]);

    useEffect(() => {
        fetchWords(0);
    }, [fetchWords]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && newPage < totalPages) {
            fetchWords(newPage);
        }
    };

    if (loading && words.length === 0) {
        return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>;
    }

    return (
        <div>
            <div className="overflow-x-auto w-full rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
                        <tr>
                            <th className="px-4 py-3">Word</th>
                            <th className="px-4 py-3">Level</th>
                            <th className="px-4 py-3">Definition (TR)</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {words.map((word) => {
                            let def = null;
                            try {
                                if (typeof word.definition === 'string') {
                                    def = JSON.parse(word.definition);
                                } else {
                                    def = word.definition;
                                }
                            } catch (e) {
                                console.error("Error parsing definition", e);
                            }

                            const firstMeaning = def?.meanings?.[0];
                            const summary = firstMeaning ? `(${firstMeaning.pos}) ${firstMeaning.definition}` : '-';

                            return (
                                <React.Fragment key={word.id}>
                                    <tr
                                        onClick={() => setExpandedWord(expandedWord === word.id ? null : word.id)}
                                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                            {word.word}
                                            {word.judgeStatus === 'APPROVED' && (
                                                <div className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full" title="Judge Approved">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${word.difficulty === 'A1' || word.difficulty === 'A2' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                word.difficulty === 'B1' || word.difficulty === 'B2' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {word.difficulty || '?'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-xs" title={summary}>
                                            {summary}
                                        </td>
                                        <td className="px-4 py-3">
                                            {expandedWord === word.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </td>
                                    </tr>
                                    {expandedWord === word.id && (
                                        <tr className="bg-gray-50/50 dark:bg-gray-800/20">
                                            <td colSpan={4} className="px-4 py-4">
                                                <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-[#1e202e] p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                                                    {def ? JSON.stringify(def, null, 2) : 'No definition data'}
                                                </pre>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 0 || loading}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages - 1 || loading}
                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Judge Approve All Button */}
            {!filterJudgeApproved && words.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={async () => {
                            if (!window.confirm(`Mark these ${words.length} words as Judge Approved?`)) return;
                            try {
                                await MediaService.judgeApproveBatch(words.map(w => w.id));
                                fetchWords(page);
                                alert('Words approved successfully!');
                            } catch (err) {
                                alert('Failed to approve words');
                            }
                        }}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Judge Approve This Page
                    </button>
                </div>
            )}
        </div>
    );
}

const AdminPage = () => {

    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [results, setResults] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // User Information Stats / State
    const [activeTab, setActiveTab] = useState<'system' | 'user-info' | 'push' | 'premium'>('system');
    const [requests, setRequests] = useState<MediaRequest[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loadingInfo, setLoadingInfo] = useState(false);

    const fetchUserInfo = async () => {
        setLoadingInfo(true);
        try {
            const [reqData, feedData] = await Promise.all([
                FeedbackService.getAllRequests(),
                FeedbackService.getAllFeedbacks()
            ]);
            setRequests(reqData);
            setFeedbacks(feedData);
        } catch (err) {
            console.error('Failed to fetch user info', err);
        } finally {
            setLoadingInfo(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'user-info') {
            fetchUserInfo();
        }
    }, [activeTab]);

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await FeedbackService.updateRequestStatus(id, status);
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (err) {
            alert('Failed to update status');
        }
    };


    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
        setError(null);
        setResults([]);
        setUploadProgress(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.srt', '.vtt'],
            'application/x-subrip': ['.srt']
        }
    });

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setError(null);
        setResults([]);
        setUploadProgress(`Uploading and processing ${files.length} files...`);

        try {
            // Send all files in one go. Backend handles parallelism.
            const response = await MediaService.batchUpload(files);
            setResults(response);
            setFiles([]); // Clear queue on success
            setUploadProgress(null);
        } catch (err: any) {
            setError(err.response?.data || 'Failed to upload files');
            console.error(err);
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const [mediaList, setMediaList] = useState<any[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [totalWordCount, setTotalWordCount] = useState<number | null>(null);

    // Scraper State
    const [scrapeImdbId, setScrapeImdbId] = useState('');
    const [scraping, setScraping] = useState(false);
    const [scrapeResult, setScrapeResult] = useState<string | null>(null);
    const [scrapeError, setScrapeError] = useState<string | null>(null);

    // TMDB Series Scraper State
    const [seriesQuery, setSeriesQuery] = useState('');
    const [searchingSeries, setSearchingSeries] = useState(false);
    const [seriesResults, setSeriesResults] = useState<TmdbMedia[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<TmdbMedia | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<TmdbSeasonDetails | null>(null);
    const [loadingSeason, setLoadingSeason] = useState(false);
    const [downloadingEpisode, setDownloadingEpisode] = useState<number | null>(null);
    const [seriesMsg, setSeriesMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [useOfficialApi, setUseOfficialApi] = useState(true);

    // TMDB Movie Scraper State
    const [movieQuery, setMovieQuery] = useState('');
    const [searchingMovie, setSearchingMovie] = useState(false);
    const [movieResults, setMovieResults] = useState<TmdbMedia[]>([]);
    const [movieMsg, setMovieMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [scrapingMovie, setScrapingMovie] = useState<number | null>(null);

    // Fetch media on mount
    useEffect(() => {
        fetchMedia();
        fetchWordCount();
    }, []);

    const fetchWordCount = async () => {
        try {
            const count = await MediaService.getTotalWordCount();
            setTotalWordCount(count);
        } catch (err) {
            console.error('Failed to fetch word count', err);
        }
    };

    // Date Filtering State
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterFlagged, setFilterFlagged] = useState(false);
    const [filterVerified, setFilterVerified] = useState(false);
    const [filterJudgeApproved, setFilterJudgeApproved] = useState(false);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'All Dates';
        try {
            const date = new Date(dateStr.replace(' ', 'T'));
            return date.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateStr;
        }
    };

    useEffect(() => {
        if (filterJudgeApproved) {
            MediaService.getJudgeApprovedDates().then(setAvailableDates).catch(console.error);
        } else {
            MediaService.getEnrichedDates().then(setAvailableDates).catch(console.error);
        }
    }, [filterJudgeApproved]);

    useEffect(() => {
        // Reset date selection when filter mode changes
        setSelectedDate(null);
    }, [filterJudgeApproved, filterFlagged, filterVerified]);

    const fetchMedia = async () => {
        setLoadingMedia(true);
        try {
            const data = await MediaService.getAllMedia(1, 0, 1000, '', 'ALL');
            setMediaList(data.content);
        } catch (err) {
            console.error('Failed to fetch media', err);
        } finally {
            setLoadingMedia(false);
        }
    };

    const handleScrape = async () => {
        if (!scrapeImdbId) return;
        setScraping(true);
        setScrapeResult(null);
        setScrapeError(null);
        try {
            const result = await MediaService.scrapeMedia(scrapeImdbId);
            setScrapeResult(result);
            setScrapeImdbId('');
            fetchMedia(); // Refresh list
        } catch (err: any) {
            setScrapeError(err.response?.data || 'Scraping failed');
        } finally {
            setScraping(false);
        }
    };

    const handleSearchSeries = async () => {
        if (!seriesQuery) return;
        setSearchingSeries(true);
        setSeriesResults([]);
        setSelectedSeries(null);
        setSelectedSeason(null);
        setSeriesMsg(null);
        try {
            const results = await MediaService.searchTmdbSeries(seriesQuery);
            setSeriesResults(results);
        } catch (err) {
            console.error(err);
            setSeriesMsg({ type: 'error', text: 'Search failed' });
        } finally {
            setSearchingSeries(false);
        }
    };

    const handleSearchMovie = async () => {
        if (!movieQuery) return;
        setSearchingMovie(true);
        setMovieResults([]);
        setMovieMsg(null);
        try {
            const results = await MediaService.searchTmdbMovies(movieQuery);
            setMovieResults(results);
        } catch (err) {
            console.error(err);
            setMovieMsg({ type: 'error', text: 'Movie search failed' });
        } finally {
            setSearchingMovie(false);
        }
    };

    const handleScrapeMovie = async (tmdbId: number, imdbId?: string) => {
        setScrapingMovie(tmdbId);
        setMovieMsg(null);
        try {
            const result = await MediaService.scrapeMovieApi(tmdbId, imdbId);
            setMovieMsg({ type: 'success', text: result });
            fetchMedia();
        } catch (err: any) {
            console.error(err);
            setMovieMsg({ type: 'error', text: err.response?.data || 'Movie scrape failed' });
        } finally {
            setScrapingMovie(null);
        }
    };

    const handleSelectSeries = async (series: TmdbMedia) => {
        // Fetch full details including seasons
        setSearchingSeries(true);
        try {
            const fullSeries = await MediaService.getTmdbSeries(series.id);
            setSelectedSeries(fullSeries);
            setSeriesResults([]); // Clear results to show detail view
        } catch (err) {
            console.error(err);
            setSeriesMsg({ type: 'error', text: 'Failed to load series details' });
        } finally {
            setSearchingSeries(false);
        }
    };

    const handleSelectSeason = async (seasonNumber: number) => {
        if (!selectedSeries) return;
        // Toggle off if already selected
        if (selectedSeason?.seasonNumber === seasonNumber) {
            setSelectedSeason(null);
            return;
        }

        setLoadingSeason(true);
        try {
            const seasonDetails = await MediaService.getTmdbSeason(selectedSeries.id, seasonNumber);
            setSelectedSeason(seasonDetails);
        } catch (err) {
            console.error(err);
            setSeriesMsg({ type: 'error', text: 'Failed to load season details' });
        } finally {
            setLoadingSeason(false);
        }
    };

    const handleDownloadEpisode = async (episodeId: number, season: number, episode: number) => {
        if (!selectedSeries?.imdbId) {
            setSeriesMsg({ type: 'error', text: 'Series is missing IMDb ID' });
            return;
        }
        setDownloadingEpisode(episodeId);
        setSeriesMsg(null);
        try {
            const result = useOfficialApi
                ? await MediaService.scrapeEpisodeApi(selectedSeries.imdbId, season, episode)
                : await MediaService.scrapeEpisode(selectedSeries.imdbId, season, episode);
            setSeriesMsg({ type: 'success', text: result });
        } catch (err: any) {
            console.error(err);
            setSeriesMsg({ type: 'error', text: err.response?.data || 'Download failed' });
        } finally {
            setDownloadingEpisode(null);
        }
    };

    const [downloadingSeason, setDownloadingSeason] = useState<number | null>(null);

    const handleDownloadSeason = async (seasonNumber: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent toggling accordion
        if (!selectedSeries?.imdbId) return;

        // Ensure season details are loaded
        let episodes = selectedSeason?.seasonNumber === seasonNumber ? selectedSeason.episodes : null;
        if (!episodes) {
            try {
                const details = await MediaService.getTmdbSeason(selectedSeries.id, seasonNumber);
                episodes = details.episodes;
                // Update selection if not already
                if (selectedSeason?.seasonNumber !== seasonNumber) {
                    setSelectedSeason(details);
                }
            } catch (err) {
                console.error(err);
                setSeriesMsg({ type: 'error', text: 'Failed to load season for download' });
                return;
            }
        }

        if (!episodes || episodes.length === 0) {
            setSeriesMsg({ type: 'error', text: 'No episodes found in season' });
            return;
        }

        setDownloadingSeason(seasonNumber);
        setSeriesMsg({ type: 'success', text: `Starting download for Season ${seasonNumber} using ${useOfficialApi ? 'Official API' : 'Scraper'}...` });

        let successCount = 0;
        let failCount = 0;

        for (const ep of episodes) {
            setDownloadingEpisode(ep.id);
            try {
                if (useOfficialApi) {
                    await MediaService.scrapeEpisodeApi(selectedSeries.imdbId, seasonNumber, ep.episodeNumber);
                } else {
                    await MediaService.scrapeEpisode(selectedSeries.imdbId, seasonNumber, ep.episodeNumber);
                }
                successCount++;
            } catch (err) {
                console.error(`Failed to download S${seasonNumber}E${ep.episodeNumber}`, err);
                failCount++;
            }
            // Small delay
            await new Promise(r => setTimeout(r, 1000));
        }

        setDownloadingEpisode(null);
        setDownloadingSeason(null);
        setSeriesMsg({
            type: successCount > 0 ? 'success' : 'error',
            text: `Finished Season ${seasonNumber}. Success: ${successCount}, Failed: ${failCount}`
        });
        fetchMedia(); // Refresh list at the end
    };

    const handleDelete = async (id: number, title: string) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            return;
        }

        try {
            await MediaService.deleteMedia(id);
            setMediaList(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error('Failed to delete media', err);
            alert('Failed to delete media');
        }
    };

    // Grouping Logic
    const movies = mediaList.filter(m => m.type === 'MOVIE');
    const episodes = mediaList.filter(m => m.type === 'EPISODE');

    // Group episodes by Series Name
    const seriesGroups: { [key: string]: typeof episodes } = {};

    episodes.forEach(ep => {
        // Try to extract series name
        let seriesName = 'Unknown Series';

        // Strategy 1: If title has " - ", assume first part is series name
        const parts = ep.title.split(' - ');
        if (parts.length > 1) {
            seriesName = parts[0].trim();
        } else if (ep.title.includes('Season') || ep.title.includes('Episode')) {
            // Fallback for simple names, maybe just group as "Other Episodes"
            seriesName = 'Uncategorized Episodes';
        }

        if (!seriesGroups[seriesName]) {
            seriesGroups[seriesName] = [];
        }
        seriesGroups[seriesName].push(ep);
    });

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('system')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'system'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        System
                    </button>
                    <button
                        onClick={() => setActiveTab('user-info')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'user-info'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        User Information
                    </button>
                    <button
                        onClick={() => setActiveTab('push')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'push'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Push
                    </button>
                    <button
                        onClick={() => setActiveTab('premium')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'premium'
                            ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        Premium
                    </button>
                </div>
            </div>

            {activeTab === 'user-info' ? (
                <UserInfoSection
                    requests={requests}
                    feedbacks={feedbacks}
                    loading={loadingInfo}
                    onUpdateStatus={handleUpdateStatus}
                />
            ) : activeTab === 'push' ? (
                <PushNotificationSection />
            ) : activeTab === 'premium' ? (
                <PremiumSection />
            ) : (
                <React.Fragment>

            {/* Judge Review Panel */}
            <JudgeReviewPanel />


            {/* Pipeline Control Panel */}
            <div className="mb-8">
                <PipelineControlPanel />
            </div>

            {/* AI Auditor Review Panel */}
            <AuditReviewPanel />

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Unique Words</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {totalWordCount !== null ? totalWordCount.toLocaleString() : '-'}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Enriched Words Library
                    </h2>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={filterFlagged}
                                onChange={(e) => setFilterFlagged(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-indigo-500 transition-colors">
                                Re-enrichment pending
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={filterVerified}
                                onChange={(e) => setFilterVerified(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-indigo-500 transition-colors">
                                Only Verified
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={filterJudgeApproved}
                                onChange={(e) => setFilterJudgeApproved(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-amber-500 transition-colors">
                                Judge Approved
                            </span>
                        </label>
                        <div className="relative">
                            <select
                                className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 pl-4 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm disabled:opacity-50"
                                onChange={(e) => setSelectedDate(e.target.value || null)}
                                value={selectedDate || ''}
                                disabled={filterFlagged || filterVerified}
                            >
                                <option value="">All Dates</option>
                                {availableDates.map(date => (
                                    <option key={date} value={date}>{formatDate(date)}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    await MediaService.downloadEnrichedWords(selectedDate || undefined, filterFlagged, filterVerified, filterJudgeApproved);
                                } catch (err) {
                                    alert('Failed to download enriched words');
                                }
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Download JSON
                        </button>
                    </div>
                </div>

                <EnrichedWordsTable
                    filterFlagged={filterFlagged}
                    filterVerified={filterVerified}
                    filterJudgeApproved={filterJudgeApproved}
                    selectedDate={selectedDate}
                />
            </div>

            {/* Standard Lists Section */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Standard Word Lists</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            Seed your database with standard vocabulary lists:
                        </p>
                        <ul className="text-sm text-gray-500 dark:text-gray-400 list-disc list-inside">
                            <li>Top 500 Verbs</li>
                            <li>Top 200 Adjectives</li>
                            <li>Top 100 Adverbs</li>
                            <li>Oxford 3000 (Partial)</li>
                        </ul>
                    </div>
                    <button
                        onClick={async () => {
                            if (!window.confirm('This will seed the database with standard lists. Continue?')) return;
                            try {
                                alert(await MediaService.seedDefaultLists());
                                fetchWordCount(); // Refresh count
                            } catch (err: any) {
                                alert('Failed: ' + (err.response?.data || err.message));
                            }
                        }}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Seed Default Lists
                    </button>
                </div>
            </div>

            {/* TV Series Scraper Section */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">TV Series Scraper</h2>

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setUseOfficialApi(true)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${useOfficialApi
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            OpenSubtitles API
                        </button>
                        <button
                            onClick={() => setUseOfficialApi(false)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!useOfficialApi
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            Legacy Scraper
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        value={seriesQuery}
                        onChange={(e) => setSeriesQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSeries()}
                        placeholder="Search for TV Series (e.g. Mr. Robot)"
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleSearchSeries}
                        disabled={searchingSeries || !seriesQuery}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {searchingSeries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                    </button>
                </div>

                {/* Series Results Grid */}
                {seriesResults.length > 0 && !selectedSeries && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {seriesResults.map(series => (
                            <button
                                key={series.id}
                                onClick={() => handleSelectSeries(series)}
                                className="text-left group relative aspect-[2/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-indigo-500 transition-all"
                            >
                                {series.posterPath ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${series.posterPath}`}
                                        alt={series.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-12">
                                    <h3 className="text-white font-medium text-sm truncate">{series.title}</h3>
                                    <p className="text-gray-300 text-xs">{series.releaseDate?.split('-')[0]}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected Series View */}
                {selectedSeries && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={() => setSelectedSeries(null)}
                            className="text-sm text-gray-500 hover:text-indigo-500 mb-4 flex items-center gap-1"
                        >
                            ← Back to search
                        </button>

                        <div className="flex gap-6 mb-6">
                            {selectedSeries.posterPath && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w500${selectedSeries.posterPath}`}
                                    alt={selectedSeries.title}
                                    className="w-32 h-48 object-cover rounded-lg shadow-lg"
                                />
                            )}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedSeries.title}</h3>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
                                        IMDb: {selectedSeries.voteAverage?.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-gray-500">{selectedSeries.releaseDate?.split('-')[0]}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 md:line-clamp-5 max-w-xl">
                                    {selectedSeries.overview}
                                </p>
                            </div>
                        </div>

                        {/* Seasons List */}
                        <div className="space-y-2">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Seasons</h4>
                            {selectedSeries.seasons?.map(season => (
                                <div key={season.id} className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => handleSelectSeason(season.seasonNumber)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">Season {season.seasonNumber}</span>
                                            <span className="text-sm text-gray-500">({season.episodeCount} Episodes)</span>
                                            <button
                                                onClick={(e) => handleDownloadSeason(season.seasonNumber, e)}
                                                disabled={downloadingSeason === season.seasonNumber}
                                                className="ml-4 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {downloadingSeason === season.seasonNumber ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Download className="w-3 h-3" />
                                                )}
                                                {downloadingSeason === season.seasonNumber ? 'Downloading...' : 'Download All'}
                                            </button>
                                        </div>
                                        {selectedSeason?.seasonNumber === season.seasonNumber ?
                                            <ChevronDown className="w-4 h-4 text-gray-400" /> :
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        }
                                    </button>

                                    {/* Episodes List (Expanded) */}
                                    {selectedSeason?.seasonNumber === season.seasonNumber && (
                                        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e202e]">
                                            {loadingSeason ? (
                                                <div className="p-4 flex justify-center">
                                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                                    {selectedSeason.episodes.map(episode => (
                                                        <div key={episode.id} className="p-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                            <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-gray-500">
                                                                {episode.episodeNumber}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{episode.name}</h5>
                                                                <p className="text-xs text-gray-500 truncate">{episode.overview}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDownloadEpisode(episode.id, season.seasonNumber, episode.episodeNumber)}
                                                                disabled={downloadingEpisode === episode.id}
                                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors disabled:opacity-50"
                                                            >
                                                                {downloadingEpisode === episode.id ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Download className="w-3 h-3" />
                                                                )}
                                                                Download
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {seriesMsg && (
                    <div className={`mt-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${seriesMsg.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'
                        }`}>
                        {seriesMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {seriesMsg.text}
                    </div>
                )}
            </div>

            {/* Movie Scraper Section (Official API) */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Movie Scraper (Official API)</h2>
                </div>

                {/* Search Bar */}
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        value={movieQuery}
                        onChange={(e) => setMovieQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchMovie()}
                        placeholder="Search for Movie (e.g. Inception)"
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={handleSearchMovie}
                        disabled={searchingMovie || !movieQuery}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {searchingMovie ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                    </button>
                </div>

                {/* Movie Results Grid */}
                {movieResults.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {movieResults.map(movie => (
                            <div
                                key={movie.id}
                                className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-emerald-500 transition-all bg-gray-900"
                            >
                                {movie.posterPath ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                                        alt={movie.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60 group-hover:opacity-40"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-800">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-white font-bold text-sm leading-tight mb-1">{movie.title}</h3>
                                        <p className="text-gray-300 text-xs">{movie.releaseDate?.split('-')[0]}</p>
                                    </div>
                                    <button
                                        onClick={() => handleScrapeMovie(movie.id, movie.imdbId)}
                                        disabled={scrapingMovie === movie.id}
                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {scrapingMovie === movie.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Download className="w-3 h-3" />
                                        )}
                                        {scrapingMovie === movie.id ? 'Downloading...' : 'Download Subtitles'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Status Message */}
                {movieMsg && (
                    <div className={`mt-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${movieMsg.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'
                        }`}>
                        {movieMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {movieMsg.text}
                    </div>
                )}
            </div>

            {/* Old Scraper Section */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Manual Movie Scraper (Legacy)</h2>
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={scrapeImdbId}
                        onChange={(e) => setScrapeImdbId(e.target.value)}
                        placeholder="Enter IMDB ID (e.g. tt1431045)"
                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={handleScrape}
                        disabled={scraping || !scrapeImdbId}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {scraping && <Loader2 className="w-4 h-4 animate-spin" />}
                        {scraping ? 'Scraping...' : 'Scrape'}
                    </button>
                </div>
                {scrapeResult && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 rounded-lg text-sm border border-green-100 dark:border-green-800">
                        {scrapeResult}
                    </div>
                )}
                {scrapeError && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-100 dark:border-red-800">
                        {scrapeError}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Bulk Upload Subtitles</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Upload .srt files. Use format <code>Show.Name.S01E01.srt</code> for automatic metadata fetching.
                </p>

                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                    {isDragActive ? (
                        <p className="text-indigo-600 dark:text-indigo-400 font-medium">Drop the files here...</p>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">
                            Drag & drop files here, or click to select files
                        </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Supported formats: .srt</p>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Files ({files.length})</h3>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex justify-between items-center">
                            <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                                {uploadProgress}
                            </span>
                            <button
                                onClick={handleUpload}
                                disabled={uploading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload {files.length} Files
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results */}
            {error && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Upload Failed</h3>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {results.length > 0 && (
                <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        Upload Results
                    </h2>
                    <div className="space-y-2">
                        {results.map((result, index) => (
                            <div key={index} className={`p-3 rounded-lg text-sm border ${result.startsWith('Error')
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300'
                                : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800 text-green-700 dark:text-green-300'
                                }`}>
                                {result}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Managed Media List (Refactored) */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Media</h2>

                {loadingMedia ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                ) : (
                    <React.Fragment>
                        {/* Movies Section */}
                        {movies.length > 0 && (
                            <MediaGroup
                                title="Movies"
                                count={movies.length}
                                items={movies}
                                onDelete={handleDelete}
                            />
                        )}

                        {/* Series Sections */}
                        {Object.entries(seriesGroups).map(([seriesName, epList]) => (
                            <MediaGroup
                                key={seriesName}
                                title={seriesName}
                                count={epList.length}
                                items={epList}
                                onDelete={handleDelete}
                                isSeries={true}
                            />
                        ))}

                        {mediaList.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No media found.</p>
                        )}
                    </React.Fragment>
                )}
            </div>
                </React.Fragment>
            )}
        </div>
    );
};
export default AdminPage;

