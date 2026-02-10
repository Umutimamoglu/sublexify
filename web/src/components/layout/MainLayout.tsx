import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Settings, Sun, Moon, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

const MainLayout = () => {
    const [isDark, setIsDark] = useState(false); // In real app use context
    const location = useLocation();

    const navItems = [
        { name: 'Discover', path: '/', icon: Home },
        { name: 'Library', path: '/library', icon: LayoutGrid },
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="bg-blue-600 p-1.5 rounded-lg">
                                <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Sublex
                            </span>
                        </Link>

                        <nav className="hidden md:flex space-x-6">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center space-x-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "text-blue-600 dark:text-blue-400"
                                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                        )}
                                    >
                                        <item.icon className="w-4 h-4" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-700"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Made for language learners
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-600">
                            &copy; {new Date().getFullYear()} Sublex
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
