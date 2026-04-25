import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import AuthService from '@/services/AuthService';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) { setError('Email adresi gerekli'); return; }
        setError('');
        setLoading(true);
        try {
            await AuthService.forgotPassword(email.trim().toLowerCase());
            setSent(true);
        } catch {
            // Show success anyway — security best practice
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-[#0f1117] dark:via-[#0f1117] dark:to-[#0f1117] px-4">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-10 shadow-xl shadow-black/5">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Email Gönderildi!</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-2">
                            Eğer <span className="font-semibold text-gray-700 dark:text-gray-300">{email}</span> adresi sistemde kayıtlıysa,
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            6 haneli bir kod gönderildi. Kodu kullanarak şifreni sıfırlayabilirsin.
                        </p>
                        <button
                            onClick={() => navigate('/reset-password', { state: { email } })}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 mb-4"
                        >
                            Kodu Gir →
                        </button>
                        <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            ← Giriş sayfasına dön
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-[#0f1117] dark:via-[#0f1117] dark:to-[#0f1117] px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-500/30">
                        <Mail className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Şifremi Unuttum</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Email adresine sıfırlama kodu göndereceğiz</p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 shadow-xl shadow-black/5">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email Adresin
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                placeholder="ornek@email.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Kod Gönder'}
                        </button>
                    </form>

                    <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <ArrowLeft className="w-4 h-4 text-gray-400" />
                        <Link to="/login" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            Giriş sayfasına dön
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
