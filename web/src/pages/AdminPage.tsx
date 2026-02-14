import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import MediaService from '@/services/MediaService';
import type { TmdbMedia, TmdbSeasonDetails } from '@/services/MediaService';

const AdminPage = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
        setError(null);
        setResults([]);
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

        try {
            const response = await MediaService.batchUpload(files);
            setResults(response);
            setFiles([]); // Clear queue on success
        } catch (err: any) {
            setError(err.response?.data || 'Failed to upload files');
            console.error(err);
        } finally {
            setUploading(false);
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

    const fetchMedia = async () => {
        setLoadingMedia(true);
        try {
            const data = await MediaService.getAllMedia();
            setMediaList(data);
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
            const result = await MediaService.scrapeEpisode(selectedSeries.imdbId, season, episode);
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
        setSeriesMsg({ type: 'success', text: `Starting download for Season ${seasonNumber}...` });

        let successCount = 0;
        let failCount = 0;

        for (const ep of episodes) {
            // Check cancellation or component unmount? (omitted for simplicity)
            setDownloadingEpisode(ep.id);
            try {
                await MediaService.scrapeEpisode(selectedSeries.imdbId, seasonNumber, ep.episodeNumber);
                successCount++;
            } catch (err) {
                console.error(`Failed to download S${seasonNumber}E${ep.episodeNumber}`, err);
                failCount++;
            }
            // Small delay to be nice to the server/API
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

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Dashboard</h1>

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

            {/* TV Series Scraper Section */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">TV Series Scraper</h2>

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
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Files ({files.length})</h3>
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

                        <div className="pt-4 flex justify-end">
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

            {/* Media List for Deletion */}
            <div className="bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Manage Media</h2>
                {loadingMedia ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    </div>
                ) : mediaList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No media found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-700 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Words</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {mediaList.map((media) => (
                                    <tr key={media.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {media.title}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                                                {media.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{media.totalWords}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(media.id, media.title)}
                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;
