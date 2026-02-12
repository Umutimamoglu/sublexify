import { useNavigate } from 'react-router-dom';
import { Film, Tv, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => navigate(category.path)}
                        className="group relative flex flex-col items-center p-8 bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-3xl hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 text-center"
                    >
                        <div className={`p-4 rounded-2xl mb-6 ${category.color} bg-opacity-10 dark:bg-opacity-20`}>
                            <category.icon className={`w-10 h-10 ${category.color.replace('bg-', 'text-')}`} />
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
        </div>
    );
};

export default LandingPage;
