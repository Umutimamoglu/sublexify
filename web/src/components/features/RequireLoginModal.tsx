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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header Image/Icon Area */}
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                    <button 
                        onClick={closeLoginModal}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-inner">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('auth.loginRequired', 'Giriş Yapmanız Gerekiyor')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        {loginModalMessage || t('auth.loginRequiredMessage', 'Bu işlemi gerçekleştirebilmek için lütfen hesabınıza giriş yapın.')}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleLogin}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-600/20"
                        >
                            {t('auth.login', 'Giriş Yap')}
                        </button>
                        <button
                            onClick={handleRegister}
                            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
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
