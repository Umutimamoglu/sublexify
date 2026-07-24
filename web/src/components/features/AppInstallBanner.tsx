import { useState, useEffect } from 'react';
import { X, ArrowDownToLine, Loader2, Mail, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import FeedbackService from '@/services/FeedbackService';

type OSType = 'ios' | 'android' | 'other';

const AppInstallBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [os, setOs] = useState<OSType>('other');
    const { isAuthenticated, openLoginModal, user } = useAuthStore();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Update email when user becomes available
    useEffect(() => {
        if (user?.email && !email) {
            setEmail(user.email);
        }
    }, [user]);

    useEffect(() => {
        // Check if user dismissed it before
        const isHidden = localStorage.getItem('hide-sublex-app-banner');
        if (isHidden) return;

        // Detect OS
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        let detectedOS: OSType = 'other';

        if (/android/i.test(userAgent)) {
            detectedOS = 'android';
        } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
            detectedOS = 'ios';
        }

        if (detectedOS !== 'other') {
            setOs(detectedOS);
            setIsVisible(true);
        }
    }, []);

    if (!isVisible) return null;

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('hide-sublex-app-banner', 'true');
    };

    const handleInstall = () => {
        if (!isAuthenticated) {
            openLoginModal('Test kullanıcısı olabilmek için giriş yapmalısınız.');
            return;
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            alert('Lütfen geçerli bir e-posta adresi girin.');
            return;
        }

        setIsSubmitting(true);
        try {
            await FeedbackService.submitFeedback({
                category: 'BETA_TESTER',
                message: `Platform: ${os === 'ios' ? 'iOS' : 'Android'}\nTest Email: ${email}`
            });
            setSubmitted(true);
            setTimeout(() => {
                setIsModalOpen(false);
                handleClose(); // Close the banner entirely after success
            }, 3000);
        } catch (err) {
            console.error('Failed to submit beta request', err);
            alert('Bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-teal-600 dark:from-indigo-900 dark:to-teal-900 shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    {/* Close button */}
                    <button 
                        onClick={handleClose}
                        className="p-1.5 -ml-1.5 rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                        aria-label="Kapat"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    
                    {/* App Icon */}
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30 shadow-inner">
                        <img 
                            src="/icon.png" 
                            alt="Sublexify" 
                            className="w-7 h-7 object-contain drop-shadow-sm"
                        />
                    </div>
                    
                    {/* Text content */}
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-white font-bold text-sm truncate">Uygulamalarımız Test Aşamasında</span>
                        <span className="text-indigo-100 text-[11px] font-medium truncate">
                            {os === 'ios' ? 'iOS için test kullanıcısı ol' : 'Android için test kullanıcısı ol'}
                        </span>
                    </div>
                </div>

                {/* Install Button */}
                <button
                    onClick={handleInstall}
                    className="ml-3 px-4 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-[10px] sm:text-xs rounded-full shadow-sm transition-colors uppercase tracking-wide flex-shrink-0 flex items-center gap-1.5"
                >
                    <Smartphone className="w-3.5 h-3.5" />
                    TESTE KATIL
                </button>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#161822] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="mb-6">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Beta Test Kullanıcısı Ol</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                {os === 'ios' ? 'Apple ID' : 'Google Play'} hesabınıza bağlı e-posta adresinizi girin. Size uygulamayı test etmeniz için bir davetiye göndereceğiz.
                            </p>
                        </div>

                        {submitted ? (
                            <div className="bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 p-4 rounded-2xl text-center border border-green-100 dark:border-green-800">
                                <h3 className="font-bold mb-1">Başvurunuz Alındı! 🎉</h3>
                                <p className="text-xs opacity-90">Test davetiyeniz en kısa sürede e-posta adresinize gönderilecektir.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                                        E-posta Adresi
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="ornek@email.com"
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !email.trim()}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        'Başvuruyu Tamamla'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppInstallBanner;
