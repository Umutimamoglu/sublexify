import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/src/components/ui/Text';

export const TOUR_NEON = '#2BFF88';

export const TOUR_COLORS = {
  title: '#FFFFFF',
  body: 'rgba(255,255,255,0.82)',
};

export const TOUR_CARD_STYLE = {
  backgroundColor: 'transparent',
  borderRadius: 22,
  padding: 0,
  shadowColor: TOUR_NEON,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.75,
  shadowRadius: 42,
  elevation: 22,
} as const;

// Card inner text area width (280 card - 22*2 padding)
const TEXT_W = 256;
// Approx chars per line for each font size
const TITLE_CPL = 20; // fontSize 20, bold
const BODY_CPL = 33; // fontSize 15
const TITLE_LH = 30; // lineHeight for title
const BODY_LH = 22; // lineHeight for body
const MASCOT_SIZE = Math.round(48 * 0.7); // 34px

function useTypewriter(text: string, speed: number, startDelay: number) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// Returns {x, y} pixel offset of the mascot (leading edge of current char)
function mascotPos(
  titleTyped: string,
  bodyTyped: string,
  titleDone: boolean,
): { x: number; y: number } {
  if (!titleDone) {
    const line = Math.floor(titleTyped.length / TITLE_CPL);
    const col = titleTyped.length % TITLE_CPL;
    const x = (col / TITLE_CPL) * TEXT_W;
    const y = line * TITLE_LH;
    return { x, y };
  }
  // After title: y offset starts after all title lines
  const titleLines = Math.ceil(titleTyped.length / TITLE_CPL) || 1;
  const titleBlockH = titleLines * TITLE_LH + 10; // +marginBottom
  const line = Math.floor(bodyTyped.length / BODY_CPL);
  const col = bodyTyped.length % BODY_CPL;
  const x = (col / BODY_CPL) * TEXT_W;
  const y = titleBlockH + line * BODY_LH;
  return { x, y };
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export function TourTooltipContent({
  title,
  text,
  isLast,
  icon,
  onPress,
}: {
  title: string;
  text: string;
  isLast: boolean;
  icon?: IoniconName;
  onPress: () => void;
}) {
  const scheme = useColorScheme();
  const isDark = true; // Tour tooltips look better dark to support the neon glow
  const lottieRef = useRef<LottieView>(null);

  const titleDelay = 120;
  const bodyDelay = titleDelay + title.length * 28 + 80;

  const { displayed: titleTyped, done: titleDone } = useTypewriter(title, 28, titleDelay);
  const { displayed: bodyTyped, done: bodyDone } = useTypewriter(text, 18, bodyDelay);

  const isTyping = !bodyDone;

  useEffect(() => {
    if (isTyping) {
      lottieRef.current?.play();
    } else {
      lottieRef.current?.pause();
    }
  }, [isTyping]);

  const pos = useMemo(
    () => mascotPos(titleTyped, bodyTyped, titleDone),
    [titleTyped, bodyTyped, titleDone],
  );

  return (
    <View style={styles.wrapper}>
      <BlurView
        intensity={isDark ? 72 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFillObject}
      />
      {!isDark && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(240,242,246,0.55)', borderRadius: 22 }]} />
      )}
      <View style={styles.border} />

      <View style={styles.content}>
        {/* Ghost section — reserves full height (icon + title + body) */}
        <View style={{ opacity: 0 }}>
          {icon && <View style={styles.iconRow}><Ionicons name={icon} size={22} color={TOUR_NEON} /></View>}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{text}</Text>
        </View>

        {/* Typewriter texts — absolutely overlaid */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={styles.contentInner}>
            {icon && (
              <View style={styles.iconRow}>
                <Ionicons name={icon} size={22} color={TOUR_NEON} />
              </View>
            )}
            <Text style={[styles.title, !isDark && { color: '#0B0D14' }]}>{titleTyped}</Text>
            <Text style={[styles.body, !isDark && { color: 'rgba(20,22,30,0.75)' }]}>{bodyTyped}</Text>
          </View>

          {/* Mascot runs at leading edge of typed text — temporarily disabled */}
          {/* {isTyping && (
            <View style={[styles.mascotWrap, { left: pos.x, top: pos.y }]}>
              <LottieView
                ref={lottieRef}
                source={require('@/assets/sublexify_run.json')}
                autoPlay
                loop
                style={styles.mascot}
              />
            </View>
          )} */}
        </View>

        <TouchableOpacity style={styles.btn} activeOpacity={0.82} onPress={onPress}>
          <LinearGradient
            colors={['#2a2c33', '#3d3f48', '#2a2c33']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>{isLast ? 'Başlayalım!' : 'Devam'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 360,
    borderRadius: 22,
    overflow: 'hidden',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(43,255,136,0.85)',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
  contentInner: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  iconRow: {
    marginBottom: 10,
  },
  title: {
    color: TOUR_COLORS.title,
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  body: {
    color: TOUR_COLORS.body,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  mascotWrap: {
    position: 'absolute',
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
  btn: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 14,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
