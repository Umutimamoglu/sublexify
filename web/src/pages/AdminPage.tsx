import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import MediaService from '@/services/MediaService';
import type { TmdbMedia, TmdbSeasonDetails } from '@/services/MediaService';

const AdminPage = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [results, setResults] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

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
    const [filterGravityApproved, setFilterGravityApproved] = useState(false);

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
        if (filterGravityApproved) {
            MediaService.getGravityApprovedDates().then(setAvailableDates).catch(console.error);
        } else {
            MediaService.getEnrichedDates().then(setAvailableDates).catch(console.error);
        }
    }, [filterGravityApproved]);

    useEffect(() => {
        // Reset date selection when filter mode changes
        setSelectedDate(null);
    }, [filterGravityApproved, filterFlagged, filterVerified]);

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
                                checked={filterGravityApproved}
                                onChange={(e) => setFilterGravityApproved(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-amber-500 transition-colors">
                                Gravity Approved
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
                                    await MediaService.downloadEnrichedWords(selectedDate || undefined, filterFlagged, filterVerified, filterGravityApproved);
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
                    filterGravityApproved={filterGravityApproved}
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
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
};

// Helper Component for Media Groups (Accordion)
const MediaGroup = ({ title, count, items, onDelete, isSeries = false }: {
    title: string,
    count: number,
    items: any[],
    onDelete: (id: number, title: string) => void,
    isSeries?: boolean
}) => {
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
};

export default AdminPage;

// Helper Component for Enriched Words Table
const EnrichedWordsTable = ({ filterFlagged = false, filterVerified = false, filterGravityApproved = false, selectedDate = null }: {
    filterFlagged?: boolean,
    filterVerified?: boolean,
    filterGravityApproved?: boolean,
    selectedDate?: string | null
}) => {
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
                filterGravityApproved,
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
    }, [filterFlagged, filterVerified, filterGravityApproved, selectedDate]);

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
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
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
                                            {word.isGravityApproved && (
                                                <div className="p-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full" title="Gravity Approved">
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

            {/* Gravity Approve All Button */}
            {!filterGravityApproved && words.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={async () => {
                            if (!window.confirm(`Mark these ${words.length} words as Gravity Approved?`)) return;
                            try {
                                await MediaService.gravityApproveBatch(words.map(w => w.id));
                                fetchWords(page);
                                alert('Words approved successfully!');
                            } catch (err) {
                                alert('Failed to approve words');
                            }
                        }}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Gravity Approve This Page
                    </button>
                </div>
            )}
        </div>
    );
};
