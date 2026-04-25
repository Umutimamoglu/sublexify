import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import AuthService from '@/services/AuthService';
import { useAuthStore } from '@/store/useAuthStore';

const CODE_LENGTH = 6;

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const setAuth = useAuthStore((s) => s.setAuth);

    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => { inputRefs.current[0]?.focus(); }, []);

    const handleDigitChange = (index: number, value: string) => {
        const v = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = v;
        setDigits(next);
        if (v && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        const next = Array(CODE_LENGTH).fill('');
        text.split('').forEach((c, i) => { next[i] = c; });
        setDigits(next);
        inputRefs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = digits.join('');
        if (code.length < CODE_LENGTH) { setError('Lütfen 6 haneli kodu tam gir'); return; }
        if (password.length < 6) { setError('Şifre en az 6 karakter olmalı'); return; }
        if (password !== passwordConfirm) { setError('Şifreler eşleşmiyor'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await AuthService.resetPassword(code, password);
            setAuth(res.user, res.token);
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        } catch {
            setError('Geçersiz veya süresi dolmuş kod. Lütfen tekrar dene.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-[#0f1117] dark:via-[#0f1117] dark:to-[#0f1117] px-4">
                <div className="w-full max-w-md text-center">
                    <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-10 shadow-xl">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Şifre Değiştirildi!</h2>
                        <p className="text-gray-500 dark:text-gray-400">Ana sayfaya yönlendiriliyorsun...</p>
                        <div className="mt-6 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 animate-[progress_2s_linear_forwards]" style={{ width: '100%' }} />
                        </div>
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
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Şifre Sıfırla</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Email'ine gelen 6 haneli kodu gir</p>
                </div>

                <div className="bg-white dark:bg-[#161822] rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-8 shadow-xl shadow-black/5">
                    {error && (
                        <div className="mb-5 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* OTP Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                                Doğrulama Kodu
                            </label>
                            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                                {digits.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleDigitChange(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-gray-900 dark:text-white"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Yeni Şifre
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                    placeholder="En az 6 karakter"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Şifre Tekrar
                            </label>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                                placeholder="Şifreyi tekrar gir"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Şifreyi Sıfırla'}
                        </button>
                    </form>

                    <div className="text-center mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <Link to="/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            Yeni kod gönder
                        </Link>
                        <span className="text-gray-400 mx-2">·</span>
                        <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            Giriş yap
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
