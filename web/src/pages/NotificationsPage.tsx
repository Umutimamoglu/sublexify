import { useEffect, useState } from 'react';
import NotificationService, { type AppNotification } from '@/services/NotificationService';
import { Bell, Loader2, CheckCircle2, Info, BellDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function NotificationsPage() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const data = await NotificationService.getNotifications();
                setNotifications(data);
                
                // If there are any unread, mark them all as read once the user visits the inbox
                const hasUnread = data.some(n => !n.isRead);
                if (hasUnread) {
                    await NotificationService.markAllRead();
                    // Update local state to reflect read status
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                }
            } catch (err) {
                console.error("Failed to load notifications", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifs();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <span className="text-gray-500">{t('common.loading', 'Yükleniyor...')}</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                    <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bildirimler</h1>
                    <p className="text-gray-500 dark:text-gray-400">Geçmiş bildirimlerinizi ve duyuruları buradan takip edebilirsiniz.</p>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/50 dark:bg-[#161822]">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Her şey okundu!</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                        Şu an için yeni bir bildiriminiz bulunmuyor. Yeni bir özellik veya duyuru geldiğinde burada görünecek.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notif) => (
                        <div 
                            key={notif.id}
                            className={`flex gap-4 p-5 rounded-2xl border transition-all ${
                                notif.isRead 
                                    ? 'bg-white dark:bg-[#161822] border-gray-100 dark:border-gray-800/60'
                                    : 'bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/20 shadow-sm'
                            }`}
                        >
                            <div className="shrink-0 mt-1">
                                {notif.imageUrl ? (
                                    <img src={notif.imageUrl} alt="Notif" className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                                ) : (
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notif.isRead ? 'bg-gray-100 dark:bg-gray-800' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
                                        {notif.isRead ? <Info className="w-5 h-5 text-gray-500" /> : <BellDot className="w-5 h-5 text-indigo-500" />}
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                                    <h3 className={`text-base font-bold truncate ${notif.isRead ? 'text-gray-900 dark:text-white' : 'text-indigo-900 dark:text-indigo-100'}`}>
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: tr })}
                                    </span>
                                </div>
                                <p className={`text-sm ${notif.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-700/80 dark:text-indigo-200/80'}`}>
                                    {notif.body}
                                </p>
                                
                                {notif.url && (
                                    <a 
                                        href={notif.url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex mt-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                                    >
                                        İncele &rarr;
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
