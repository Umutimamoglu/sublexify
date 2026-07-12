import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { X, ArrowRight, Check, Map } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';

const TOUR_STEPS = [
    {
        title: "Sublex'e Hoş Geldin!",
        description: "İngilizce öğrenme serüveninde sana eşlik etmek için buradayız. Sana kısaca etrafı gezdirelim.",
        path: "/",
    },
    {
        title: "Keşfet",
        description: "Dizi ve filmleri burada bulabilirsin. İzlemeden önce kelimelerini öğren, sonra keyfini çıkar!",
        path: "/",
    },
    {
        title: "Listelerim",
        description: "Kendi kelime listelerini oluştur veya bizim senin için hazırladığımız listelere göz at.",
        path: "/lists",
    },
    {
        title: "Kelime Havuzu",
        description: "Öğrendiğin tüm kelimeler burada birikir. İstediğin zaman onlarla pratik yapabilirsin.",
        path: "/vocabulary",
    },
    {
        title: "Gelişim",
        description: "Hangi seviyede kaç kelime bildiğini ve günlük hedeflerini buradan takip edebilirsin.",
        path: "/progress",
    }
];

const AppTour = () => {
    const { hasSeenTour, setHasSeenTour } = useSettingsStore();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [hasSeenTour]);

    useEffect(() => {
        if (isVisible && TOUR_STEPS[currentStep].path !== location.pathname) {
            navigate(TOUR_STEPS[currentStep].path);
        }
    }, [currentStep, isVisible, navigate, location.pathname]);

    if (!isVisible || hasSeenTour) return null;

    const stepInfo = TOUR_STEPS[currentStep];

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            finishTour();
        }
    };

    const finishTour = () => {
        setIsVisible(false);
        setHasSeenTour(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={finishTour} />

            <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 pointer-events-auto animate-in zoom-in-95 duration-300">
                <button 
                    onClick={finishTour}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-5 border border-indigo-100 dark:border-indigo-500/20">
                    <Map className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div className="flex gap-1.5 mb-5">
                    {TOUR_STEPS.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={cn(
                                "h-1.5 rounded-full flex-1 transition-all duration-300",
                                idx === currentStep ? "bg-indigo-600" : 
                                idx < currentStep ? "bg-indigo-600/40" : "bg-gray-200 dark:bg-gray-800"
                            )} 
                        />
                    ))}
                </div>

                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                    {stepInfo.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
                    {stepInfo.description}
                </p>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={finishTour}
                        className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Atla
                    </button>
                    <button 
                        onClick={nextStep}
                        className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:scale-105"
                    >
                        {currentStep === TOUR_STEPS.length - 1 ? (
                            <>Bitir <Check className="w-4 h-4" /></>
                        ) : (
                            <>İleri <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppTour;
