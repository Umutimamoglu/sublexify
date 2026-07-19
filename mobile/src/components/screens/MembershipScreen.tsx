import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { useMembership } from '@/src/api/queries/subscription.queries';

const AMBER = '#F59E0B';

export default function MembershipScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;
  const { data, isLoading } = useMembership();

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.textPrimary }}>Üyelik</Text>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.primary} size="large" />
          </View>
        ) : !data ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: c.textSecondary }}>Üyelik bilgisi alınamadı.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Hero */}
            <View style={{
              borderRadius: 24, padding: 28, marginBottom: 16, alignItems: 'center', borderWidth: 1,
              borderColor: data.isPremium ? 'rgba(245,158,11,0.35)' : c.borderDefault,
              backgroundColor: data.isPremium ? 'rgba(245,158,11,0.06)' : c.surface,
            }}>
              <View style={{
                width: 64, height: 64, borderRadius: 20, marginBottom: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: data.isPremium ? 'rgba(245,158,11,0.18)' : c.surfaceSubtle,
              }}>
                <Ionicons name="star" size={30} color={data.isPremium ? AMBER : c.textSecondary} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: c.textPrimary }}>
                {data.isPremium ? 'Premium Üyelik' : 'Ücretsiz Üyelik'}
              </Text>
              <Text style={{ marginTop: 6, fontSize: 13, color: c.textSecondary, textAlign: 'center' }}>
                {data.isPremium
                  ? (data.lifetime ? 'Ömür boyu erişim' : `${data.daysLeft ?? 0} gün kaldı`)
                  : 'Premium içerik ve özellikler kilitli.'}
              </Text>
            </View>

            {data.isPremium ? (
              <View style={{ gap: 10 }}>
                <DetailRow c={c} icon="time-outline" label="Kalan süre"
                  value={data.lifetime ? 'Ömür boyu' : `${data.daysLeft ?? 0} gün`} />
                {!data.lifetime && data.premiumUntil && (
                  <DetailRow c={c} icon="calendar-outline" label="Bitiş tarihi" value={formatDate(data.premiumUntil)} />
                )}
                <DetailRow c={c} icon="pricetag-outline" label="Üyelik türü" value={data.sourceLabel ?? 'Bilinmiyor'} />
                {data.billingInterval && (
                  <DetailRow c={c} icon="sparkles-outline" label="Fatura dönemi"
                    value={data.billingInterval === 'YEARLY' ? 'Yıllık' : 'Aylık'} />
                )}
                {data.startedAt && (
                  <DetailRow c={c} icon="calendar-outline" label="Başlangıç" value={formatDate(data.startedAt)} />
                )}
                {!!data.note && <DetailRow c={c} icon="document-text-outline" label="Not" value={data.note} />}
              </View>
            ) : (
              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surface, padding: 20 }}>
                <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 20 }}>
                  Premium ile kilitli film/dizilerin tüm kelimelerine, arka planda liste çalmaya ve daha
                  fazlasına erişirsin. Satın alma yakında.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function DetailRow({ c, icon, label, value }: {
  c: any; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14,
      borderRadius: 16, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.surface,
    }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceSubtle }}>
        <Ionicons name={icon} size={20} color={c.textSecondary} />
      </View>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: c.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary, textAlign: 'right', flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}
