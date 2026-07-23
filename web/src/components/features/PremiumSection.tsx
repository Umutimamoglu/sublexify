import { useEffect, useMemo, useState } from 'react';
import { Crown, Lock, Search, Film, Tv, Plus, X, Clock, Loader2 } from 'lucide-react';
import MediaService, { Media } from '@/services/MediaService';
import PremiumService, { AdminPremiumUser, SubscriptionRow } from '@/services/PremiumService';

type SubTab = 'content' | 'users';

export default function PremiumSection() {
    const [subTab, setSubTab] = useState<SubTab>('content');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500">
                    <Crown className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Premium Yönetimi</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        İçeriği premium olarak işaretle ve kullanıcılara manuel premium ver.
                    </p>
                </div>
            </div>

            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
                {(['content', 'users'] as SubTab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setSubTab(t)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${subTab === t
                            ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                        {t === 'content' ? 'İçerik' : 'Kullanıcılar'}
                    </button>
                ))}
            </div>

            {subTab === 'content' ? <ContentPanel /> : <UsersPanel />}
        </div>
    );
}

// ─── Content: mark movies / series as premium ─────────────────────────────────

function ContentPanel() {
    const [media, setMedia] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const data = await MediaService.getAllMedia(undefined, 0, 100, '', 'ALL');
            setMedia(data.content);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const { movies, series } = useMemo(() => {
        const movies = media.filter((m) => m.type === 'MOVIE');
        const episodes = media.filter((m) => m.type !== 'MOVIE');
        const map: Record<string, { imdbId: string; name: string; episodes: Media[] }> = {};
        for (const ep of episodes) {
            const key = ep.imdbId || `noimdb-${ep.id}`;
            const name = ep.title.split(' - ')[0].trim() || ep.title;
            if (!map[key]) map[key] = { imdbId: ep.imdbId || '', name, episodes: [] };
            map[key].episodes.push(ep);
        }
        return { movies, series: Object.values(map) };
    }, [media]);

    const q = query.trim().toLowerCase();
    const filteredMovies = q ? movies.filter((m) => m.title.toLowerCase().includes(q)) : movies;
    const filteredSeries = q ? series.filter((s) => s.name.toLowerCase().includes(q)) : series;

    const toggleMovie = async (m: Media) => {
        setBusy(`movie-${m.id}`);
        try {
            await MediaService.setMediaPremium(m.id, !m.isPremium);
            setMedia((prev) => prev.map((x) => (x.id === m.id ? { ...x, isPremium: !m.isPremium } : x)));
        } finally { setBusy(null); }
    };

    const toggleSeries = async (s: { imdbId: string; episodes: Media[] }) => {
        if (!s.imdbId) { alert('Bu dizinin imdbId yok, tek tek işaretlenmeli.'); return; }
        const next = !s.episodes.every((e) => e.isPremium);
        setBusy(`series-${s.imdbId}`);
        try {
            await MediaService.setSeriesPremium(s.imdbId, next);
            const ids = new Set(s.episodes.map((e) => e.id));
            setMedia((prev) => prev.map((x) => (ids.has(x.id) ? { ...x, isPremium: next } : x)));
        } finally { setBusy(null); }
    };

    if (loading) return <PanelLoader />;

    return (
        <div className="space-y-6">
            <SearchBox value={query} onChange={setQuery} placeholder="Film / dizi ara..." />

            {filteredSeries.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
                        <Tv className="w-4 h-4" /> Diziler
                    </h3>
                    <div className="space-y-2">
                        {filteredSeries.map((s) => {
                            const allPremium = s.episodes.every((e) => e.isPremium);
                            const somePremium = s.episodes.some((e) => e.isPremium);
                            return (
                                <ContentRow
                                    key={s.imdbId || s.name}
                                    title={s.name}
                                    subtitle={`${s.episodes.length} bölüm${somePremium && !allPremium ? ' • kısmen premium' : ''}`}
                                    premium={allPremium}
                                    busy={busy === `series-${s.imdbId}`}
                                    onToggle={() => toggleSeries(s)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {filteredMovies.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
                        <Film className="w-4 h-4" /> Filmler
                    </h3>
                    <div className="space-y-2">
                        {filteredMovies.map((m) => (
                            <ContentRow
                                key={m.id}
                                title={m.title}
                                subtitle={`${m.totalWords} kelime`}
                                premium={!!m.isPremium}
                                busy={busy === `movie-${m.id}`}
                                onToggle={() => toggleMovie(m)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filteredMovies.length === 0 && filteredSeries.length === 0 && (
                <EmptyState text="Sonuç bulunamadı." />
            )}
        </div>
    );
}

function ContentRow({ title, subtitle, premium, busy, onToggle }: {
    title: string; subtitle: string; premium: boolean; busy: boolean; onToggle: () => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl px-4 py-3">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{title}</p>
                    {premium && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" /> Premium
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            </div>
            <button
                onClick={onToggle}
                disabled={busy}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${premium
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {premium ? 'Premium' : 'Ücretsiz'}
            </button>
        </div>
    );
}

// ─── Users: grant / revoke premium ────────────────────────────────────────────

function UsersPanel() {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<AdminPremiumUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<number | null>(null);
    const [historyFor, setHistoryFor] = useState<number | null>(null);
    const [history, setHistory] = useState<SubscriptionRow[]>([]);

    const load = async (search = '') => {
        setLoading(true);
        try {
            setUsers(await PremiumService.searchUsers(search));
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const onSearch = (v: string) => {
        setQuery(v);
        load(v);
    };

    const grant = async (u: AdminPremiumUser, lifetime: boolean) => {
        setBusy(u.id);
        try {
            const updated = await PremiumService.grantPremium(u.id, lifetime ? { lifetime: true } : { days: 30 });
            setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
        } finally { setBusy(null); }
    };

    const revoke = async (u: AdminPremiumUser) => {
        if (!window.confirm(`${u.email} kullanıcısının premium'unu kaldır?`)) return;
        setBusy(u.id);
        try {
            const updated = await PremiumService.revokePremium(u.id);
            setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
        } finally { setBusy(null); }
    };

    const toggleHistory = async (u: AdminPremiumUser) => {
        if (historyFor === u.id) { setHistoryFor(null); return; }
        setHistoryFor(u.id);
        setHistory(await PremiumService.getSubscriptions(u.id));
    };

    return (
        <div className="space-y-4">
            <SearchBox value={query} onChange={onSearch} placeholder="E-posta / isim ile kullanıcı ara..." />

            {loading ? <PanelLoader /> : users.length === 0 ? (
                <EmptyState text="Kullanıcı bulunamadı." />
            ) : (
                <div className="space-y-2">
                    {users.map((u) => (
                        <div key={u.id} className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{u.name || u.email}</p>
                                        {u.isPremium ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                                <Crown className="w-3 h-3" /> Premium
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-full">
                                                Ücretsiz
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {u.email}{u.premiumUntil && u.isPremium ? ` • bitiş: ${formatDate(u.premiumUntil)}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {u.isPremium ? (
                                        <button
                                            onClick={() => revoke(u)}
                                            disabled={busy === u.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                        >
                                            {busy === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                            Kaldır
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => grant(u, false)}
                                                disabled={busy === u.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                            >
                                                {busy === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                30 gün ver
                                            </button>
                                            <button
                                                onClick={() => grant(u, true)}
                                                disabled={busy === u.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 disabled:opacity-50"
                                            >
                                                Lifetime
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => toggleHistory(u)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="Geçmiş"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {historyFor === u.id && (
                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                                    {history.length === 0 ? (
                                        <p className="text-xs text-gray-400">Geçmiş kaydı yok.</p>
                                    ) : history.map((h) => (
                                        <div key={h.id} className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span>{h.provider} • {h.plan} • <span className="font-medium">{h.status}</span>{h.note ? ` • ${h.note}` : ''}</span>
                                            <span>{formatDate(h.createdAt)} → {h.currentPeriodEnd ? formatDate(h.currentPeriodEnd) : '∞'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
        </div>
    );
}

function PanelLoader() {
    return (
        <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-center py-12 text-sm text-gray-400">{text}</p>;
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return iso;
    }
}
