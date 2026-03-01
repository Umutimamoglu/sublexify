import { useNavigate } from 'react-router-dom';
import { Film, Tv, List, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MediaService, { type Media } from '@/services/MediaService';
import MediaCard from '@/components/features/MediaCard';

const LandingPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const categories = [
        {
            id: 'series',
            title: 'Series',
            icon: Tv,
            color: 'bg-indigo-500',
            description: 'Browse your favorite TV shows and learn efficiently.',
            path: '/browse/series'
        },
        {
            id: 'movies',
            title: 'Movies',
            icon: Film,
            color: 'bg-purple-500',
            description: 'Dive into movies and expand your vocabulary.',
            path: '/browse/movies'
        },
        {
            id: 'lists',
            title: 'My Lists',
            icon: List,
            color: 'bg-emerald-500',
            description: 'Review your personal vocabulary lists.',
            path: '/lists'
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                What do you want to learn today?
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 text-center max-w-2xl">
                Select a category to start your immersive language learning journey with Sublex.
            </p>

            {/* Continue Learning Section */}
            <ContinueLearning />

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-20">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => navigate(category.path)}
                        className="group relative flex flex-col items-center p-8 bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-3xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-center"
                    >
                        <div className={`p-4 rounded-2xl mb-6 ${category.color} bg-opacity-10 dark:bg-opacity-20`}>
                            <CategoryIcon icon={category.icon} color={category.color} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                            {category.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {category.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* Featured Lists Section */}
            <FeaturedLists />
        </div>
    );
};

const ContinueLearning = () => {
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContinueLearning = async () => {
            try {
                // For now use default limit of 5
                const data = await MediaService.getContinueLearning();
                setMediaList(data);
            } catch (err) {
                console.error('Failed to fetch continue learning media', err);
            } finally {
                setLoading(false);
            }
        };
        fetchContinueLearning();
    }, []);

    if (loading || mediaList.length === 0) return null;

    return (
        <div className="w-full max-w-5xl mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <PlayCircle className="w-6 h-6 text-indigo-500" />
                Continue Learning
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {mediaList.map((media) => (
                    <MediaCard key={media.id} media={media} imageUrl={media.posterUrl || media.backdropUrl} />
                ))}
            </div>
        </div>
    );
};

const CategoryIcon = ({ icon: Icon, color }: { icon: any, color: string }) => (
    <Icon className={`w-10 h-10 ${color.replace('bg-', 'text-')}`} />
);

import { useEffect, useState } from 'react';
import WordListService, { type WordList } from '@/services/WordListService';
import { BookOpen, ChevronRight } from 'lucide-react';

const FeaturedLists = () => {
    const navigate = useNavigate();
    const [lists, setLists] = useState<WordList[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const data = await WordListService.getStandardLists();
                setLists(data);
            } catch (err) {
                console.error('Failed to fetch standard lists', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLists();
    }, []);

    if (loading) return null;
    if (lists.length === 0) return null;

    return (
        <div className="w-full max-w-5xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                Featured Collections
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {lists.map(list => (
                    <button
                        key={list.id}
                        onClick={() => navigate(`/lists/${list.id}`)}
                        className="group text-left bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-lg hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <List className="w-5 h-5" />
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-800 text-xs font-semibold px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300">
                                Official
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                            {list.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                            Standard vocabulary list to boost your language skills.
                        </p>
                        <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium">
                            Start Learning <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LandingPage;
