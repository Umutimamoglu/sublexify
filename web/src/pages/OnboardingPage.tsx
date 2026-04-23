import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, PlayCircle } from 'lucide-react';

const OnboardingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl relative pb-20 text-center">
            <div className="flex items-center gap-4 mb-16">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/60 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
                </button>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">Rehber</h1>
            </div>

            <div className="flex flex-col items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-6">
                    <Compass className="w-12 h-12 text-indigo-500" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Hoş Geldiniz</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md leading-relaxed mx-auto">
                    Kullanım rehberi ve etkileşimli deneme turu çok yakında web platformumuza eklenecek. Şimdilik keşfetmeye başlayabilirsiniz!
                </p>

                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all text-lg"
                >
                    <PlayCircle className="w-6 h-6" /> Ana Sayfaya Dön
                </button>
            </div>
        </div>
    );
};

export default OnboardingPage;
