import { useState, useEffect } from 'react';
import { X, ArrowDownToLine } from 'lucide-react';

type OSType = 'ios' | 'android' | 'other';

const AppInstallBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [os, setOs] = useState<OSType>('other');

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
        // Dummy links for now
        const link = os === 'ios' 
            ? 'https://apps.apple.com/app/id123456789' // Replace with real App Store link
            : 'https://play.google.com/store/apps/details?id=com.sublexify.app'; // Replace with real Play Store link
        
        window.open(link, '_blank');
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
                        <span className="text-white font-bold text-sm truncate">Sublexify - Dil Öğrenme</span>
                        <span className="text-indigo-100 text-[11px] font-medium truncate">
                            {os === 'ios' ? 'App Store\'da ücretsiz' : 'Google Play\'de ücretsiz'}
                        </span>
                    </div>
                </div>

                {/* Install Button */}
                <button
                    onClick={handleInstall}
                    className="ml-3 px-4 py-1.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs rounded-full shadow-sm transition-colors uppercase tracking-wide flex-shrink-0 flex items-center gap-1.5"
                >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    İNDİR
                </button>
            </div>
        </div>
    );
};

export default AppInstallBanner;
