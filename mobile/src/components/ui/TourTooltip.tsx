import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/src/components/ui/Text';

// ─── Tour / coachmark görsel kimliği (tek kaynak) ─────────────────
// Kart her zaman koyu; ok (üçgen) rengini neon yeşile override ediyoruz
// (arrowStyle) ki dark mod'da da kaybolmasın ve glow ile uyumlu görünsün.
export const TOUR_NEON = '#2BFF88';

export const TOUR_COLORS = {
  card: '#13151B',
  title: '#FFFFFF',
  body: '#D6D9E0',
  btnBg: '#F3F4F6',
  btnText: '#111319',
};

export const TOUR_CARD_STYLE = {
  backgroundColor: TOUR_COLORS.card,
  borderRadius: 22,
  borderWidth: 2,
  borderColor: TOUR_NEON,
  paddingHorizontal: 20,
  paddingTop: 18,
  paddingBottom: 16,
  // Çok katmanlı neon glow — parlaklığı ölçülü tut, yine de dikkat çeksin.
  boxShadow: [
    { offsetX: 0, offsetY: 0, blurRadius: 8,  spreadDistance: 1, color: 'rgba(43,255,136,0.24)' },
    { offsetX: 0, offsetY: 0, blurRadius: 20, spreadDistance: 2, color: 'rgba(43,255,136,0.16)' },
    { offsetX: 0, offsetY: 0, blurRadius: 38, spreadDistance: 4, color: 'rgba(43,255,136,0.10)' },
    { offsetX: 0, offsetY: 0, blurRadius: 60, spreadDistance: 8, color: 'rgba(43,255,136,0.055)' },
  ],
  // Android (eski mimari) fallback — boxShadow renklendirmeyi desteklemezse.
  shadowColor: TOUR_NEON,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.22,
  shadowRadius: 22,
  elevation: 12,
} as const;

// Ortak balon içeriği — kapanma davranışı onPress ile dışarıdan kontrol edilir
// (boşluğa basınca kapanmaz, sadece bu butona basınca).
export function TourTooltipContent({
  title,
  text,
  isLast,
  onPress,
}: {
  title: string;
  text: string;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ maxWidth: 300 }}>
      <Text style={{ color: TOUR_COLORS.title, fontWeight: '800', fontSize: 20, letterSpacing: -0.2, marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: TOUR_COLORS.body, fontWeight: '500', fontSize: 15, lineHeight: 22 }}>{text}</Text>
      <TouchableOpacity
        style={{ marginTop: 18, backgroundColor: TOUR_COLORS.btnBg, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <Text style={{ color: TOUR_COLORS.btnText, fontWeight: '700', fontSize: 15 }}>{isLast ? 'Başlayalım!' : 'Anladım'}</Text>
      </TouchableOpacity>
    </View>
  );
}
