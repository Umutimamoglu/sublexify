import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Loader2, Calendar, Clock, Tag, Sparkles } from 'lucide-react';
import PremiumService, { Membership } from '@/services/PremiumService';

export default function MembershipPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<Membership | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        PremiumService.getMyMembership()
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-6"
            >
                <ArrowLeft className="w-4 h-4" /> Geri
            </button>

            {loading ? (
                <div className="flex justify-center py-20 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : !data ? (
                <p className="text-center py-16 text-sm text-gray-400">Üyelik bilgisi alınamadı.</p>
            ) : (
                <>
                    {/* Status hero */}
                    <div className={`rounded-3xl p-8 mb-6 border text-center ${data.isPremium
                        ? 'border-amber-300/50 dark:border-amber-500/25 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-[#161822]'
                        : 'border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#161822]'}`}>
                        <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${data.isPremium
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                            <Crown className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                            {data.isPremium ? 'Premium Üyelik' : 'Ücretsiz Üyelik'}
                        </h1>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {data.isPremium
                                ? (data.lifetime ? 'Ömür boyu erişim' : `${data.daysLeft ?? 0} gün kaldı`)
                                : 'Premium içerik ve özellikler kilitli.'}
                        </p>
                    </div>

                    {data.isPremium ? (
                        <div className="space-y-3">
                            <DetailRow
                                icon={<Clock className="w-5 h-5" />}
                                label="Kalan süre"
                                value={data.lifetime ? 'Ömür boyu' : `${data.daysLeft ?? 0} gün`}
                            />
                            {!data.lifetime && data.premiumUntil && (
                                <DetailRow
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Bitiş tarihi"
                                    value={formatDate(data.premiumUntil)}
                                />
                            )}
                            <DetailRow
                                icon={<Tag className="w-5 h-5" />}
                                label="Üyelik türü"
                                value={data.sourceLabel ?? 'Bilinmiyor'}
                            />
                            {data.billingInterval && (
                                <DetailRow
                                    icon={<Sparkles className="w-5 h-5" />}
                                    label="Fatura dönemi"
                                    value={data.billingInterval === 'YEARLY' ? 'Yıllık' : 'Aylık'}
                                />
                            )}
                            {data.startedAt && (
                                <DetailRow
                                    icon={<Calendar className="w-5 h-5" />}
                                    label="Başlangıç"
                                    value={formatDate(data.startedAt)}
                                />
                            )}
                            {data.note && (
                                <DetailRow icon={<Tag className="w-5 h-5" />} label="Not" value={data.note} />
                            )}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#161822] p-6 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Premium ile kilitli film/dizilerin tüm kelimelerine, arka planda liste çalmaya ve daha
                                fazlasına erişirsin. Satın alma yakında.
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#161822] border border-gray-200/60 dark:border-gray-800 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                {icon}
            </div>
            <span className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white text-right">{value}</span>
        </div>
    );
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
        return iso;
    }
}
