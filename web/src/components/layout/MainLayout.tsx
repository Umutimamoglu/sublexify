import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutGrid, Settings, Sun, Moon, BookOpen, Menu, X, Shield, TrendingUp, LogOut, LogIn, User, FlaskConical, Tv, Film, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/useAuthStore';
import NotificationService from '@/services/NotificationService';

const MainLayout = () => {

    const { isAuthenticated, user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (isAuthenticated) {
            NotificationService.getUnreadCount()
                .then(setUnreadCount)
                .catch(console.error);
        }
    }, [isAuthenticated, location.pathname]); // Refresh count on navigation

    const toggleLanguage = () => {
        const newLang = i18n.language === 'tr' ? 'en' : 'tr';
        i18n.changeLanguage(newLang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', newLang);
        }
    };

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    const [isDark, setIsDark] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const navItems = [
        { name: t('nav.home'), path: '/', icon: Home },
        { name: t('nav.series'), path: '/browse/series', icon: Tv },
        { name: t('nav.movies'), path: '/browse/movies', icon: Film },
        // { name: 'Havuz', path: '/vocabulary', icon: FlaskConical },
        { name: t('nav.lists'), path: '/lists', icon: BookOpen },
        { name: t('nav.profile'), path: '/profile', icon: User },
        // { name: t('nav.admin'), path: '/admin', icon: Shield },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0f1117]">
            {/* Header */}
            <header className="bg-white/80 dark:bg-[#161822]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-4 group">
                            <img 
                                src="/icon.png" 
                                alt="Sublexify Logo" 
                                className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                            />
                            <span className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                                Sub<span className="text-teal-500 dark:text-teal-400">lex</span>ify
                            </span>
                        </Link>

                        {/* Desktop Nav */}
                        <nav className="hidden md:flex items-center space-x-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            "flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                                            isActive
                                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Right side */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={toggleLanguage}
                                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold transition-all"
                                title={t('nav.change_language')}
                            >
                                {i18n.language === 'tr' ? 'EN' : 'TR'}
                            </button>
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
                                aria-label={t('nav.toggle_theme')}
                            >
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>

                            {isAuthenticated ? (
                                <div className="hidden md:flex items-center gap-2">
                                    <Link 
                                        to="/notifications"
                                        className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-all"
                                        title={t('nav.notifications', 'Bildirimler')}
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#161822]"></span>
                                        )}
                                    </Link>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl ml-2">
                                        <User className="w-4 h-4 text-indigo-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                        title={t('nav.logout')}
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    to="/login"
                                    className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                                >
                                    <LogIn className="w-4 h-4" />
                                    {t('nav.login')}
                                </Link>
                            )}

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-[#161822] px-4 py-3 space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200/60 dark:border-gray-800/60 mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-400 dark:text-gray-600">
                        <p>{t('footer.tagline')}</p>
                        <p>&copy; {new Date().getFullYear()} Sublex</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
