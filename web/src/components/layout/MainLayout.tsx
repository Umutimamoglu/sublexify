import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Settings, Sun, Moon, Sparkles } from 'lucide-react';
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
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
            <header className="glass">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="flex items-center space-x-2 group">
                            <div className="bg-gradient-to-br from-blue-600 to-violet-600 p-1.5 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                Sublex
                            </span>
                        </Link>

                        <nav className="hidden md:flex space-x-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-full">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                            isActive
                                                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
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
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                        >
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in zoom-in-95 duration-500">
                <Outlet />
            </main>

            <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Made with <span className="text-red-500">♥</span> for language learners
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
