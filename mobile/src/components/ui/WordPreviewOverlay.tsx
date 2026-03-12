import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableWithoutFeedback, 
  useWindowDimensions, 
  ScrollView, 
  TouchableOpacity,
  Pressable
} from 'react-native';
import Reanimated, { 
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import { FlashCardBack } from './FlashCard';
import type { ListWord } from '@/src/types/api';

export function WordPreviewOverlay({
  word,
  visible,
  onClose,
  c,
  isDark,
}: {
  word: ListWord | null;
  visible: boolean;
  onClose: () => void;
  c: any;
  isDark: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const [canClose, setCanClose] = useState(false);

  // Enable closing after a short delay to avoid catching the release of the long-press
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setCanClose(true), 150);
      return () => clearTimeout(timer);
    } else {
      setCanClose(false);
    }
  }, [visible]);
  
  // Custom styles for the preview card - smaller as requested
  const cardW = Math.min(width * 0.82, 340);
  const cardH = Math.min(height * 0.5, 400);

  const previewStyles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 9999,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bgOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
    },
    card: {
      width: cardW,
      height: cardH,
      borderRadius: 20,
      backgroundColor: c.SURFACE,
      borderWidth: 1,
      borderColor: isDark ? '#ffffff18' : c.BORDER,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 8,
    },
    cardBack: { 
      backgroundColor: isDark ? c.SURFACE : '#fcfcfd',
      flex: 1 
    },
    cardBackInner: { flex: 1, padding: 20 },
    cardBackWord: { color: c.TEXT_P, fontSize: 24, fontWeight: '900', marginBottom: 12 },
    sectionLabel: { color: c.TEXT_S, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginTop: 12, marginBottom: 6 },
    meaningBlock: { marginBottom: 12 },
    meaningDef: { color: c.TEXT_P, fontSize: 14, lineHeight: 20, marginTop: 4 },
    meaningEx: { color: c.TEXT_S, fontSize: 13, fontStyle: 'italic', marginTop: 4, lineHeight: 18 },
    posBadge: { 
      alignSelf: 'flex-start',
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 6, 
      backgroundColor: c.PURPLE + '22' 
    },
    posBadgeText: { color: c.PURPLE, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    diffBadge: { 
      alignSelf: 'flex-start', 
      paddingHorizontal: 8, 
      paddingVertical: 3, 
      borderRadius: 8, 
      borderWidth: 1, 
      marginBottom: 12 
    },
    diffBadgeText: { fontSize: 11, fontWeight: '800' },
    verbGrid: { flexDirection: 'row', gap: 6 },
    verbCell: { flex: 1, backgroundColor: isDark ? '#ffffff0a' : '#f0f0f5', borderRadius: 8, padding: 8, alignItems: 'center' },
    verbLabel: { color: c.TEXT_S, fontSize: 9, fontWeight: '700' },
    verbValue: { color: c.TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 1 },
    phrasalBlock: { marginBottom: 10 },
    phrasalPhrase: { color: c.PURPLE, fontSize: 14, fontWeight: '700' },
    phrasalDef: { color: c.TEXT_P, fontSize: 13, marginTop: 2 },
    phrasalEx: { color: c.TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
    cardFlipBackBtn: { 
      display: 'none'
    },
    checkText: { fontSize: 14 },
    unenrichedBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
    unenrichedIcon: { fontSize: 32 },
    unenrichedText: { color: c.TEXT_S, fontSize: 13, textAlign: 'center' },
  });

  if (!visible || !word) return null;

  const handleBgPress = () => {
    if (canClose) onClose();
  };

  return (
    <View style={previewStyles.overlay}>
      <Reanimated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(150)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={previewStyles.bgOverlay} onPress={handleBgPress} />
      </Reanimated.View>

      <Reanimated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={previewStyles.card}
      >
        <FlashCardBack 
          word={word}
          isKnown={false}
          onToggle={() => {}} 
          styles={previewStyles}
          c={c}
        />
      </Reanimated.View>
    </View>
  );
}
