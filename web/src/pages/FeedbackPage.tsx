import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Bug, Lightbulb, MessageSquare } from 'lucide-react';
import FeedbackService from '@/services/FeedbackService';

export default function FeedbackPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const CATEGORIES = [
        { id: 'BUG', label: t('profile.bug', 'Hata'), icon: <Bug className="w-6 h-6" /> },
        { id: 'SUGGESTION', label: t('profile.suggestion', 'Öneri'), icon: <Lightbulb className="w-6 h-6" /> },
        { id: 'OTHER', label: t('profile.other', 'Diğer'), icon: <MessageSquare className="w-6 h-6" /> },
    ];

    const [category, setCategory] = useState<'BUG' | 'SUGGESTION' | 'OTHER'>('SUGGESTION');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            alert(t('profile.empty_warning', 'Lütfen bir mesaj girin.'));
            return;
        }

        setIsSubmitting(true);
        try {
            await FeedbackService.submitFeedback({ message, category });
            alert(t('profile.feedback_success', 'Geri bildiriminiz başarıyla gönderildi!'));
            navigate(-1);
        } catch (error) {
            console.error('Failed to submit feedback', error);
            alert(t('profile.feedback_error', 'Geri bildirim gönderilirken bir hata oluştu.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white uppercase tracking-widest">
                    {t('profile.feedback_title', 'Geri Bildirim')}
                </h1>
                <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    {t('profile.category', 'Kategori')}
                </label>
                
                <div className="flex gap-3 mb-8">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id as any)}
                            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                                category === cat.id 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                                    : 'bg-white dark:bg-[#1e1e2d] border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'
                            }`}
                        >
                            {cat.icon}
                            <span className={`text-xs font-bold ${category === cat.id ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {cat.label}
                            </span>
                        </button>
                    ))}
                </div>

                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    {t('profile.message_label', 'Mesajınız')}
                </label>
                
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('profile.message_placeholder', 'Bize ne söylemek istersiniz?')}
                    className="w-full h-48 bg-gray-100 dark:bg-[#1e1e2d] text-gray-900 dark:text-white rounded-2xl p-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium resize-none mb-8"
                />

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        t('profile.submit', 'Gönder')
                    )}
                </button>
            </div>
        </div>
    );
}
