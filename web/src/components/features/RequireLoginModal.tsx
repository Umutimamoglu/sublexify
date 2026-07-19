import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Lock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RequireLoginModal: React.FC = () => {
    const { isLoginModalOpen, loginModalMessage, closeLoginModal } = useAuthStore();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!isLoginModalOpen) return null;

    const handleLogin = () => {
        closeLoginModal();
        navigate('/login');
    };

    const handleRegister = () => {
        closeLoginModal();
        navigate('/register');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
            <div className="bg-white/90 dark:bg-[#11131A]/90 backdrop-blur-xl rounded-3xl w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20 dark:border-white/10 animate-in fade-in zoom-in-[0.98] duration-300">
                
                {/* Close Button */}
                <button 
                    onClick={closeLoginModal}
                    className="absolute top-4 right-4 p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 pt-10 text-center">
                    {/* Elegant Icon */}
                    <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-[#1A1D24] border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm rotate-3">
                        <Lock className="w-7 h-7 text-indigo-500 dark:text-indigo-400 -rotate-3" strokeWidth={1.5} />
                    </div>

                    <h3 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-3">
                        {t('auth.loginRequired', 'Giriş Yapmanız Gerekiyor')}
                    </h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-sm mx-auto">
                        {loginModalMessage || t('auth.loginRequiredMessage', 'Bu içeriğe erişmek ve işlemlerinize devam edebilmek için hesabınıza giriş yapmalısınız.')}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleLogin}
                            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-medium rounded-xl transition-all shadow-sm shadow-black/5 active:scale-[0.98]"
                        >
                            {t('auth.login', 'Giriş Yap')}
                        </button>
                        <button
                            onClick={handleRegister}
                            className="w-full py-3.5 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]"
                        >
                            {t('auth.register', 'Hesap Oluştur')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequireLoginModal;
