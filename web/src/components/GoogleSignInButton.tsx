import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import AuthService from '@/services/AuthService';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Google sign-in button. Google hands us an ID token in the browser; we send it
 * to the backend, which verifies it server-side and returns our own JWT. The
 * raw Google token is never trusted on its own and is not persisted.
 *
 * Renders nothing when VITE_GOOGLE_CLIENT_ID is unset, so an unconfigured
 * environment simply shows the email/password form.
 */
const GoogleSignInButton = () => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const setAuth = useAuthStore((s) => s.setAuth);

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return null;

    const handleSuccess = async (credential?: string) => {
        if (!credential) {
            setError(t('login.google_error'));
            return;
        }
        setError('');
        try {
            const res = await AuthService.socialLogin('GOOGLE', credential);
            setAuth(res.user, res.token);
            window.location.href = '/';
        } catch {
            setError(t('login.google_error'));
        }
    };

    return (
        <div className="mt-6">
            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center">
                    <span className="px-3 bg-white dark:bg-[#161822] text-xs text-gray-400 dark:text-gray-500">
                        {t('login.or')}
                    </span>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800">
                    {error}
                </div>
            )}

            <div className="mt-4 flex justify-center">
                <GoogleLogin
                    onSuccess={(res) => handleSuccess(res.credential)}
                    onError={() => setError(t('login.google_error'))}
                    width="320"
                />
            </div>
        </div>
    );
};

export default GoogleSignInButton;
