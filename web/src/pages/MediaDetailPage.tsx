import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MediaService, { type Media, type MediaWordsResponse } from '@/services/MediaService';
import MediaHeader from '@/components/features/MediaHeader';
import WordCard from '@/components/features/WordCard';
import WordListService from '@/services/WordListService';
import { Loader2, ArrowLeft, Filter, CheckCircle2, BookOpen, Download, Wand2, Check } from 'lucide-react';
import api from '@/services/api';
import { cn } from '@/utils/cn';


const MediaDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [media, setMedia] = useState<Media | null>(null);
    const [wordData, setWordData] = useState<MediaWordsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterUnknown, setFilterUnknown] = useState(false);
    const [visibleCount, setVisibleCount] = useState(50);
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [isGeneratingList, setIsGeneratingList] = useState(false);
    const [isGenerationSuccess, setIsGenerationSuccess] = useState(false);

    // Mock userId for now (Sprint 4)
    const userId = 1;

    const [sortBy, setSortBy] = useState<string | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [mediaRes, wordsRes] = await Promise.all([
                    MediaService.getMediaById(Number(id)),
                    MediaService.getMediaWords(Number(id), userId, filterUnknown, sortBy)
                ]);
                setMedia(mediaRes);
                setWordData(wordsRes);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, filterUnknown, sortBy]);

    const handleToggleKnown = async (wordId: number, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await api.delete(`/words/${wordId}/mark-known`, { params: { userId } });
            } else {
                await api.post(`/words/${wordId}/mark-known`, null, { params: { userId } });
            }

            if (wordData) {
                setWordData({
                    ...wordData,
                    words: wordData.words.map(w =>
                        w.id === wordId ? { ...w, isKnown: !currentStatus } : w
                    )
                });
            }
        } catch (err) {
            console.error('Failed to update word status', err);
        }
    };

    const handleMarkBatchAsKnown = async () => {
        if (!id || selectedLevels.length === 0) return;

        const count = wordData?.words.filter(w =>
            !w.isKnown && selectedLevels.includes(w.difficulty || '')
        ).length || 0;

        if (count === 0) {
            alert('Bu seviyelerde işaretlenecek yeni kelime bulunamadı.');
            return;
        }

        const confirmMessage = `⚠️ Bildiklerine Ekle\n\nSeçili olan ${count} adet ${selectedLevels.join(' & ')} seviyesi kelimeyi bildiklerim listesine eklemek istediğinize emin misiniz? Bu işlem ilerleme durumunuzu toplu olarak değiştirecektir.`;

        if (window.confirm(confirmMessage)) {
            try {
                await api.post('/words/mark-known-batch', null, {
                    params: {
                        userId,
                        mediaId: id,
                        levels: selectedLevels.join(',')
                    }
                });

                // Update local state
                if (wordData) {
                    setWordData({
                        ...wordData,
                        words: wordData.words.map(w =>
                            selectedLevels.includes(w.difficulty || '') ? { ...w, isKnown: true } : w
                        )
                    });
                }
            } catch (err) {
                console.error('Failed to mark batch as known', err);
                alert('İşlem sırasında bir hata oluştu.');
            }
        }
    };

    const handleGenerateList = async () => {
        if (!id || isGeneratingList) return;

        setIsGeneratingList(true);
        try {
            await WordListService.generateUnknownWordsList(Number(id));
            setIsGenerationSuccess(true);
            setTimeout(() => setIsGenerationSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to generate list:', error);
            alert('Liste oluşturulamadı. Lütfen tekrar deneyin.');
        } finally {
            setIsGeneratingList(false);
        }
    };

    if (loading && !media) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
        );
    }

    if (!media || !wordData) return (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400">Media not found</div>
    );

    const knownCount = wordData.words.filter(w => w.isKnown).length;
    const totalCount = wordData.words.length;
    const progressPercent = totalCount > 0 ? Math.round((knownCount / totalCount) * 100) : 0;

    return (
        <div>
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Library
            </Link>

            <MediaHeader media={media} />

            {/* Progress + Filter Bar */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-5 mb-6 sticky top-20 z-40 backdrop-blur-xl">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-indigo-500" />
                            Vocabulary
                        </h2>
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                            {totalCount} words
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="font-medium text-gray-700 dark:text-gray-300">{knownCount}</span>
                            <span className="text-gray-400 dark:text-gray-500">known</span>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
                        </div>

                        <button
                            onClick={() => setFilterUnknown(!filterUnknown)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all mr-2",
                                filterUnknown
                                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {filterUnknown ? 'Unknown only' : 'All status'}
                        </button>

                        <button
                            onClick={() => setSortBy(sortBy === 'frequency' ? undefined : 'frequency')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all mr-2",
                                sortBy === 'frequency'
                                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/25"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {sortBy === 'frequency' ? 'Most Frequent' : 'Normal Order'}
                        </button>

                        <button
                            onClick={handleGenerateList}
                            disabled={isGeneratingList || isGenerationSuccess}
                            className={cn(
                                "hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border shadow-sm",
                                isGenerationSuccess
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                    : "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 shadow-indigo-500/5 text-indigo-600"
                            )}
                        >
                            {isGeneratingList ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isGenerationSuccess ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Wand2 className="w-4 h-4" />
                            )}
                            {isGeneratingList ? 'Lise Hazırlanıyor...' : isGenerationSuccess ? 'Liste Hazır!' : 'Bilinmeyenlerden Liste Oluştur'}
                        </button>
                    </div>
                </div>

                {/* Level Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => {
                        const count = wordData.levelCounts[level] || 0;
                        const isSelected = selectedLevels.includes(level);

                        return (
                            <button
                                key={level}
                                onClick={() => {
                                    if (isSelected) {
                                        setSelectedLevels(selectedLevels.filter(l => l !== level));
                                    } else {
                                        setSelectedLevels([...selectedLevels, level]);
                                    }
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2 border",
                                    isSelected
                                        ? level.startsWith('A')
                                            ? "bg-green-500 text-white border-green-600 shadow-sm" :
                                            level.startsWith('B')
                                                ? "bg-blue-500 text-white border-blue-600 shadow-sm" :
                                                "bg-purple-500 text-white border-purple-600 shadow-sm"
                                        : "bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                                )}
                            >
                                {level}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px]",
                                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}

                    {selectedLevels.length > 0 && (
                        <>
                            <button
                                onClick={handleMarkBatchAsKnown}
                                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 text-white dark:text-emerald-400 text-xs font-bold rounded-lg shadow-sm transition-all ml-4 border border-emerald-700/20 dark:border-emerald-500/20"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {selectedLevels.length === 1
                                    ? `Tüm ${selectedLevels[0]} Seviyesini Bildiklerime Ekle`
                                    : `Tüm ${selectedLevels.join(' & ')} Seviyelerini Bildiklerime Ekle`}
                            </button>
                            <button
                                onClick={() => setSelectedLevels([])}
                                className="text-xs text-gray-400 hover:text-indigo-500 transition-colors ml-2"
                            >
                                Clear levels
                            </button>
                        </>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>


            {/* Word Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {wordData.words
                    .filter(w => selectedLevels.length === 0 || (w.difficulty && selectedLevels.includes(w.difficulty)))
                    .slice(0, visibleCount)
                    .map((word) => (
                        <WordCard
                            key={word.id}
                            {...word}
                            onToggleKnown={handleToggleKnown}
                        />
                    ))}
            </div>

            {/* Load More */}
            {visibleCount < wordData.words.length && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => setVisibleCount(prev => prev + 100)}
                        className="px-8 py-3 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
                    >
                        Load More Words ({wordData.words.length - visibleCount} remaining)
                    </button>
                </div>
            )}
        </div>
    );
};

export default MediaDetailPage;
