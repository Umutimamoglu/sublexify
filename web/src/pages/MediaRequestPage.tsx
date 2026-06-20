import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Image as ImageIcon, Check, Film, Tv } from 'lucide-react';
import FeedbackService from '@/services/FeedbackService';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w200';

export default function MediaRequestPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [query, setQuery] = useState('');
    const [type, setType] = useState<'tv' | 'movie'>('tv');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const data = await FeedbackService.searchTmdb(query, type);
                    setResults(data || []);
                } catch (error) {
                    console.error('Failed to search TMDB', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 500); // debounce

        return () => clearTimeout(timer);
    }, [query, type]);

    const toggleSelection = (item: any) => {
        setSelectedItems(prev => {
            if (prev.find(s => s.id === item.id)) {
                return prev.filter(s => s.id !== item.id);
            }
            return [...prev, item];
        });
    };

    const handleSendRequests = async () => {
        if (selectedItems.length === 0) return;
        setIsSubmitting(true);
        try {
            const requests = selectedItems.map(item => ({
                tmdbId: item.id,
                title: item.title || item.name,
                posterPath: item.poster_path || item.posterPath,
                mediaType: type === 'movie' ? 'MOVIE' : 'SERIES'
            }));

            await FeedbackService.submitMediaRequests(requests);
            alert(t('profile.request_success', 'Talebiniz başarıyla alındı!'));
            navigate(-1);
        } catch (error) {
            console.error('Failed to submit media requests', error);
            alert(t('profile.request_error', 'Talebiniz gönderilirken bir hata oluştu.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl relative min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white uppercase tracking-widest">
                    {t('profile.request_content', 'İçerik İste')}
                </h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Search Container */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('profile.search_placeholder', 'Dizi veya Film ara...')}
                    className="w-full bg-gray-100 dark:bg-[#1e1e2d] text-gray-900 dark:text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
            </div>

            {/* Type Selector */}
            <div className="flex gap-3 mb-8">
                <button
                    onClick={() => { setType('tv'); setQuery(''); setSelectedItems([]); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                        type === 'tv' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Tv className="w-4 h-4" />
                    {t('profile.series', 'Diziler')}
                </button>
                <button
                    onClick={() => { setType('movie'); setQuery(''); setSelectedItems([]); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                        type === 'movie' 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    <Film className="w-4 h-4" />
                    {t('profile.movies', 'Filmler')}
                </button>
            </div>

            {/* Results */}
            <div className="pb-24">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : query.length < 2 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Search className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                        <p className="text-gray-500 font-medium">
                            {t('profile.min_chars', 'Aramak için en az 2 karakter girin.')}
                        </p>
                    </div>
                ) : results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Search className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                        <p className="text-gray-500 font-medium">
                            {t('profile.no_results', 'Sonuç bulunamadı.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {results.map((item) => {
                            const isSelected = !!selectedItems.find(s => s.id === item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggleSelection(item)}
                                    className="flex flex-col items-center group text-left relative"
                                >
                                    <div className={`w-full aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2 relative transition-all ${
                                        isSelected ? 'ring-4 ring-indigo-500 scale-[0.98]' : 'group-hover:ring-2 group-hover:ring-gray-300 dark:group-hover:ring-gray-600'
                                    }`}>
                                        {(item.poster_path || item.posterPath) ? (
                                            <img 
                                                src={`${TMDB_IMAGE_BASE}${item.poster_path || item.posterPath}`} 
                                                alt={item.title || item.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 w-full text-center">
                                        {item.title || item.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Action */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#161822] border-t border-gray-200 dark:border-gray-800 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.2)] z-50">
                    <div className="container mx-auto max-w-4xl flex items-center justify-between">
                        <span className="font-extrabold text-gray-900 dark:text-white">
                            {t('profile.selected_count', { count: selectedItems.length, defaultValue: `${selectedItems.length} içerik seçildi` })}
                        </span>
                        <button
                            onClick={handleSendRequests}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                t('profile.submit', 'Gönder')
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
