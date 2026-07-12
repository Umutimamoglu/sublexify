import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, BookOpen } from 'lucide-react';
import AuthService from '@/services/AuthService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTranslation } from 'react-i18next';
import Mascot from '@/components/Mascot';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const setAuth = useAuthStore((s) => s.setAuth);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await AuthService.login({ email, password });
            setAuth(res.user, res.token);
            window.location.href = '/';
        } catch {
            setError(t('login.error_invalid'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-[#0f1117] dark:via-[#0f1117] dark:to-[#0f1117] px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <Mascot width={100} height={100} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                        Sub<span className="text-teal-500 dark:text-teal-400">lex</span>ify
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">{t('login.tagline')}</p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 shadow-xl shadow-black/5">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{t('nav.login')}</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('login.email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                placeholder="ornek@email.com"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('login.password')}</label>
                                <Link to="/forgot-password" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                    {t('login.forgot_password')}
                                </Link>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('nav.login')}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                        {t('login.no_account')}{' '}
                        <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            {t('login.register')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
