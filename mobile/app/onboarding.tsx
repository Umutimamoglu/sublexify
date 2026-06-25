import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Animated,
  Easing,
  StatusBar,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import LottieView from 'lottie-react-native';
import { useAuthStore } from '@/src/store/authStore';
import { useTranslation } from '@/src/i18n/useTranslation';
import { Text } from '@/src/components/ui/Text';

const { width, height } = Dimensions.get('window');

// ─── Renkler ──────────────────────────────────────────────────
const BG = '#0B0D12';
const SURFACE = '#13151B';
const ACCENT = '#2BFF88'; // başlık vurgusu — tur neon yeşili ile tutarlı
const TEXT_P = '#FFFFFF';
const TEXT_S = '#9BA1AE';

type SlideType = 'lottie' | 'scene' | 'faded' | 'flip' | 'image' | 'appicon' | 'quiz' | 'stats' | 'finale';

const SLIDES: { key: string; type: SlideType; image?: any; lottie?: any; aspect?: number }[] = [
  { key: '2', type: 'scene', image: require('@/assets/sublexify_mascot_talking.webp'), aspect: 1 },
  { key: '1', type: 'lottie', lottie: require('@/assets/sublexify_scene1.json'), aspect: 480 / 300 },
  { key: '3', type: 'scene', image: require('@/assets/sublexify_scene2.webp'), aspect: 1080 / 640 },
  { key: '4', type: 'quiz' },
  { key: '5', type: 'flip' },
  { key: '6', type: 'stats' },
  { key: '7', type: 'finale' },
];

// ─── Başlık (yeşil vurgu kelimeli) ────────────────────────────
function AccentTitle({ title, accent }: { title: string; accent?: string }) {
  const titleStyle = { color: TEXT_P, fontSize: 30, fontWeight: '900' as const, lineHeight: 38, letterSpacing: -0.5 };
  if (!accent || !title.includes(accent)) {
    return <Text style={titleStyle}>{title}</Text>;
  }
  const idx = title.indexOf(accent);
  const before = title.slice(0, idx);
  const after = title.slice(idx + accent.length);
  return (
    <Text style={titleStyle}>
      {before}
      <Text style={{ color: ACCENT }}>{accent}</Text>
      {after}
    </Text>
  );
}

// ─── Animasyonlu Açıklama Metni (Quiz Slaytı için) ────────────
function AnimatedBodyText({ text, active, shouldFade }: { text: string; active: boolean; shouldFade: boolean }) {
  const heightAnim = useRef(new Animated.Value(200)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shouldFade) return;

    if (active) {
      // 3.5 saniye sonra metni gizleyip yer aç
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(heightAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 800, useNativeDriver: false })
        ]).start();
      }, 3500);
      return () => clearTimeout(t);
    } else {
      heightAnim.setValue(200);
      opacityAnim.setValue(1);
    }
  }, [active, shouldFade]);

  if (!shouldFade) {
    return <Text style={{ color: TEXT_S, fontSize: 16, lineHeight: 24, marginTop: 14 }}>{text}</Text>;
  }

  return (
    <Animated.View style={{ maxHeight: heightAnim, opacity: opacityAnim, overflow: 'hidden', marginTop: 14 }}>
      <Text style={{ color: TEXT_S, fontSize: 16, lineHeight: 24 }}>{text}</Text>
    </Animated.View>
  );
}

// ─── Çerçeveli ekran görseli (gradient kenar + glow) ──────────
function FramedShot({ image }: { image: any }) {
  const h = Math.min(height * 0.46, 470);
  const w = h * 0.462;
  return (
    <LinearGradient
      colors={['#8b5cf6', '#3b82f6', '#ec4899']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        padding: 2.5,
        borderRadius: 30,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 16,
      }}
    >
      <Image source={image} style={{ width: w, height: h, borderRadius: 27.5 }} resizeMode="cover" />
    </LinearGradient>
  );
}


// ─── Büyük dairesel App İkonu (slide 1) ──────────────────────
function AppIconVisual() {
  const size = Math.min(width * 0.62, 240);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <LinearGradient
        colors={['#2BFF88', '#3b82f6', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#2BFF88',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 32,
          elevation: 20,
        }}
      >
        <Image
          source={require('@/assets/images/sublexify_transparent.png')}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </LinearGradient>
    </Animated.View>
  );
}


// ─── Sahne → unutma (slide 3) ─────────────────────────────────
// Bir video karesi + altyazı belirir; içindeki kelime yukarı süzülür ama
// kaydedilmediği için solup uçarak unutulur. "İzledin, gördün ama bir kez
// görünce akılda kalmadı." Slide 4'teki çözümün (flashcard) tam tersi.
const FORGET_LINES: { text: string; hl: string }[] = [
  { text: 'You are so brave.', hl: 'brave' },
  { text: 'That was a clever move.', hl: 'clever' },
  { text: 'She felt overwhelmed.', hl: 'overwhelmed' },
];

function SceneForget({ active }: { active: boolean }) {
  const [line, setLine] = useState(FORGET_LINES[0]);
  const [lifting, setLifting] = useState(false);

  const capOpacity = useRef(new Animated.Value(0)).current;
  const capScale = useRef(new Animated.Value(0.96)).current;
  const rise = useRef(new Animated.Value(0)).current;

  const FW = Math.min(width * 0.8, 300);
  const FH = FW * 0.6;

  useEffect(() => {
    if (!active) {
      capOpacity.setValue(0); capScale.setValue(0.96); rise.setValue(0);
      setLifting(false);
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    const play = (anim: Animated.CompositeAnimation) => new Promise<void>((r) => anim.start(() => r()));

    const run = async () => {
      let i = 0;
      while (!cancelled) {
        setLine(FORGET_LINES[i % FORGET_LINES.length]);
        setLifting(false);
        capOpacity.setValue(0); capScale.setValue(0.96); rise.setValue(0);
        await wait(60);
        if (cancelled) break;
        // altyazı belirir (izliyorsun)
        await play(Animated.parallel([
          Animated.timing(capOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.spring(capScale, { toValue: 1, useNativeDriver: true, damping: 13, stiffness: 140 }),
        ]));
        if (cancelled) break;
        await wait(850); // okudun
        // kelime yukarı süzülür ve solup unutulur
        setLifting(true);
        await play(Animated.timing(rise, { toValue: 1, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }));
        if (cancelled) break;
        await wait(250);
        // altyazı kaybolur
        await play(Animated.timing(capOpacity, { toValue: 0, duration: 300, useNativeDriver: true }));
        if (cancelled) break;
        await wait(350);
        i++;
      }
    };
    run();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [active, capOpacity, capScale, rise]);

  const idx = line.text.indexOf(line.hl);
  const before = idx >= 0 ? line.text.slice(0, idx) : line.text;
  const after = idx >= 0 ? line.text.slice(idx + line.hl.length) : '';

  const flyY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -(FH * 0.55 + 70)] });
  const flyScale = rise.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const flyOpacity = rise.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.75, 0] });

  return (
    <View style={{ width: FW, height: FH + 96, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* solup uçan (unutulan) kelime */}
      {lifting ? (
        <Animated.Text
          style={{
            position: 'absolute', bottom: 34,
            color: ACCENT, fontSize: 22, fontWeight: '900',
            opacity: flyOpacity,
            transform: [{ translateY: flyY }, { scale: flyScale }],
          }}
        >
          {line.hl}
        </Animated.Text>
      ) : null}

      {/* video karesi */}
      <View style={{ width: FW, height: FH, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#ffffff14' }}>
        <LinearGradient colors={['#222a3d', '#141826', '#0e111a']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-circle" size={46} color="#ffffff22" />
        </View>

        {/* altyazı barı (video altında) */}
        <Animated.View
          style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
            paddingHorizontal: 12, paddingVertical: 9,
            opacity: capOpacity, transform: [{ scale: capScale }],
          }}
        >
          <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: '#ffffff22' }}>
            <Text style={{ color: '#ffffffcc', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>CC</Text>
          </View>
          <Text style={{ flex: 1, color: '#F1F3F7', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
            {idx >= 0 ? (
              <>
                {before}
                <Text style={{ color: ACCENT, fontWeight: '900', opacity: lifting ? 0.18 : 1 }}>{line.hl}</Text>
                {after}
              </>
            ) : (
              line.text
            )}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}


// ─── Bizim gerçek kelime kartımız (slide 4) ───────────────────
// Uygulamadaki FlashCard'ın birebir görünümü: çoklu anlam (POS + TR tanım +
// EN örnek), FİİL FORMLARI gridi ve PHRASAL VERBS. Örnek kelime: "break".
const POS_BG = 'rgba(20,184,166,0.16)';
const POS_TEXT = '#5EEAD4';
const PHRASAL_BLUE = '#60A5FA';
const SECTION_GRAY = '#7C828F';
const B1_AMBER = '#F59E0B';

const DEMO_CARD = {
  word: 'break',
  level: 'B1',
  sentence: 'Be careful not to break the glass.',
  meanings: [
    { pos: 'NOUN', def: 'mola, ara', ex: "Let's take a short break. (Kısa bir mola verelim.)" },
    { pos: 'VERB', def: 'kırmak', ex: 'Be careful not to break the glass. (Dikkat et, bardağı kırma.)' },
  ],
  verbForms: [
    ['V1', 'break'],
    ['V2', 'broke'],
    ['V3', 'broken'],
    ['ING', 'breaking'],
  ],
  phrasals: [
    { phrase: 'break up', def: 'ayrılmak', ex: 'They broke up last month. (Geçen ay ayrıldılar.)' },
    { phrase: 'break down', def: 'bozulmak', ex: 'My car broke down on the way. (Arabam yolda bozuldu.)' },
    { phrase: 'break out', def: 'patlak vermek', ex: 'A fire broke out in the building. (Binada yangın çıktı.)' },
  ],
};

function SublexFlashcard({ active }: { active: boolean }) {
  const { t } = useTranslation('common');
  const flip = useRef(new Animated.Value(0)).current;
  const w = Math.min(width * 0.8, 330);
  const h = Math.min(height * 0.44, 420);

  useEffect(() => {
    if (!active) {
      flip.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(flip, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(3200),
        Animated.timing(flip, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, flip]);

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const faceBase = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: w,
    height: h,
    borderRadius: 22,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#ffffff14',
    overflow: 'hidden' as const,
    backfaceVisibility: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 14,
  };

  return (
    <View style={{ width: w, height: h }}>
      {/* Ön yüz — sade flashcard */}
      <Animated.View
        style={[faceBase, { alignItems: 'center', justifyContent: 'center', padding: 24, transform: [{ perspective: 1400 }, { rotateY: frontRotate }] }]}
      >
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, backgroundColor: POS_BG, marginBottom: 18 }}>
          <Text style={{ color: POS_TEXT, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>VERB</Text>
        </View>
        <Text style={{ color: TEXT_P, fontSize: 38, fontWeight: '900', textAlign: 'center' }}>{DEMO_CARD.word}</Text>
        <Text style={{ color: TEXT_S, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 18, lineHeight: 21 }}>
          “{DEMO_CARD.sentence}”
        </Text>
        <Text style={{ color: SECTION_GRAY, fontSize: 12, marginTop: 22 }}>{t('onboarding.tapToFlip')}</Text>
      </Animated.View>

      {/* Arka yüz — zengin kart (anlamlar + fiil formları + phrasal verbs) */}
      <Animated.View
        style={[faceBase, { backgroundColor: '#171A22', transform: [{ perspective: 1400 }, { rotateY: backRotate }] }]}
      >
        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          <Text style={{ color: TEXT_P, fontSize: 22, fontWeight: '800', marginBottom: 10 }}>{DEMO_CARD.word}</Text>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: B1_AMBER, backgroundColor: B1_AMBER + '22', marginBottom: 14 }}>
            <Text style={{ color: B1_AMBER, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>{DEMO_CARD.level}</Text>
          </View>

          {DEMO_CARD.meanings.map((m, i) => (
            <View key={i} style={{ marginBottom: 14 }}>
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6, backgroundColor: POS_BG, marginBottom: 6 }}>
                <Text style={{ color: POS_TEXT, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{m.pos}</Text>
              </View>
              <Text style={{ color: TEXT_P, fontSize: 14, fontWeight: '700' }}>{m.def}</Text>
              <Text style={{ color: TEXT_S, fontSize: 12, marginTop: 3, lineHeight: 17 }}>{m.ex}</Text>
            </View>
          ))}

          <Text style={{ color: SECTION_GRAY, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4, marginBottom: 8 }}>
            {t('onboarding.verbForms')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {DEMO_CARD.verbForms.map(([label, value]) => (
              <View key={label} style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 8, paddingVertical: 8, alignItems: 'center' }}>
                <Text style={{ color: SECTION_GRAY, fontSize: 10, fontWeight: '700' }}>{label}</Text>
                <Text style={{ color: TEXT_P, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={{ color: SECTION_GRAY, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>
            {t('onboarding.phrasalVerbs')}
          </Text>
          {DEMO_CARD.phrasals.map((pv, i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={{ color: PHRASAL_BLUE, fontSize: 13, fontWeight: '700' }}>{pv.phrase}</Text>
              <Text style={{ color: TEXT_P, fontSize: 13, marginTop: 1 }}>{pv.def}</Text>
              <Text style={{ color: TEXT_S, fontSize: 12, fontStyle: 'italic', marginTop: 2, lineHeight: 16 }}>{pv.ex}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Quiz Demo (slide 4) ───────────────────────────────────────
function SublexQuizDemo({ active }: { active: boolean }) {
  const { t } = useTranslation('common');
  const tQ = useCallback((key: string) => t(`onboarding.demoQuiz.${key}`), [t]);

  const [step, setStep] = useState<'list' | 'q1' | 'q1_ans' | 'q2' | 'q2_ans' | 'q3' | 'q3_ans' | 'summary'>('list');
  const [typedText, setTypedText] = useState('');
  
  const listScale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (!active) {
      setStep('list');
      opacity.setValue(1);
      setTypedText('');
      return;
    }
    
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>(r => timers.push(setTimeout(r, ms)));

    const run = async () => {
      while (!cancelled) {
        setStep('list');
        opacity.setValue(1);
        listScale.setValue(1);
        setTypedText('');
        await wait(1000);
        if (cancelled) break;

        // Click list
        Animated.sequence([
          Animated.timing(listScale, { toValue: 0.92, duration: 150, useNativeDriver: true }),
          Animated.timing(listScale, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start();
        await wait(250);
        if (cancelled) break;

        // Fade out
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        await wait(250);
        if (cancelled) break;

        // Q1 (Def -> Word)
        setStep('q1');
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        await wait(1400);
        if (cancelled) break;

        setStep('q1_ans');
        await wait(1200);
        if (cancelled) break;

        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        await wait(250);
        if (cancelled) break;

        // Q2 (Word -> Def)
        setStep('q2');
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        await wait(1400);
        if (cancelled) break;

        setStep('q2_ans');
        await wait(1200);
        if (cancelled) break;
        
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        await wait(250);
        if (cancelled) break;

        // Q3 (Fill in blanks)
        setStep('q3');
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        await wait(600);
        if (cancelled) break;

        const ans = tQ('q3_ans'); // e.g. "break"
        for (let i = 1; i <= ans.length; i++) {
          setTypedText(ans.substring(0, i));
          await wait(120);
          if (cancelled) break;
        }
        await wait(400);
        if (cancelled) break;

        setStep('q3_ans');
        await wait(1200);
        if (cancelled) break;

        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        await wait(250);
        if (cancelled) break;

        // Summary
        setStep('summary');
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        await wait(2500);
        if (cancelled) break;

        // Fade out Summary and loop
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        await wait(250);
        if (cancelled) break;
      }
    };

    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active, listScale, opacity, tQ]);

  const w = Math.min(width * 0.85, 340);
  const h = Math.min(height * 0.48, 490);

  const renderContent = () => {
    if (step === 'list') {
      return (
        <Animated.View style={{ transform: [{ scale: listScale }], width: '100%' }}>
          <View style={{ backgroundColor: '#1a1a1c', borderRadius: 20, paddingVertical: 14, paddingLeft: 16, paddingRight: 20, borderWidth: 1, borderColor: '#ffffff14', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: '#10B981' }} />
            <Image source={require('@/assets/friends.jpeg')} style={{ width: 44, height: 44, borderRadius: 16, marginRight: 12, backgroundColor: '#1a1a1c', borderWidth: 1, borderColor: '#10B98133' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: TEXT_P, fontSize: 15, fontWeight: '800' }}>{tQ('listName')}</Text>
              <Text style={{ color: TEXT_S, fontSize: 12, fontWeight: '500', marginTop: 2 }}>{tQ('wordCount')}</Text>
            </View>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B98122', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play" size={12} color="#10B981" />
            </View>
          </View>
        </Animated.View>
      );
    }

    if (step === 'summary') {
      return (
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: '#ffffff14' }}>
          <Ionicons name="trophy" size={56} color="#F59E0B" />
          <Text style={{ color: TEXT_P, fontSize: 22, fontWeight: '900', marginTop: 16 }}>{tQ('sessionComplete')}</Text>
          <Text style={{ color: '#8b5cf6', fontSize: 36, fontWeight: '900', marginTop: 4 }}>3 / 3</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' }}>
             <View style={{ flex: 1, backgroundColor: '#22C55E15', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#22C55E' }}>3</Text>
                <Text style={{ color: TEXT_S, fontSize: 11, fontWeight: '600' }}>{tQ('correct')}</Text>
             </View>
             <View style={{ flex: 1, backgroundColor: '#EF444408', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#EF4444' }}>0</Text>
                <Text style={{ color: TEXT_S, fontSize: 11, fontWeight: '600' }}>{tQ('wrong')}</Text>
             </View>
          </View>
        </View>
      );
    }

    // Questions
    const qIdx = step.startsWith('q1') ? 0 : step.startsWith('q2') ? 1 : 2;
    const isAns = step.endsWith('_ans');

    let topCardContent = null;
    let bottomContent = null;

    if (qIdx === 0) {
      topCardContent = (
        <>
           <View style={{ position: 'absolute', top: 12, left: 16, backgroundColor: '#8b5cf612', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#8b5cf6' }}>
              <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{tQ('noun')}</Text>
           </View>
           <Text style={{ color: TEXT_P, fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 12, lineHeight: 26 }}>{tQ('q1_text')}</Text>
        </>
      );
      const choices = [tQ('q1_c1'), tQ('q1_c2'), tQ('q1_c3'), tQ('q1_c4')];
      bottomContent = (
        <View style={{ gap: 8 }}>
          {choices.map((c, i) => {
            let bg = SURFACE;
            let border = '#ffffff14';
            if (isAns && i === 1) { // q1_c2 is correct
              bg = '#22C55E22';
              border = '#22C55E';
            }
            return (
              <View key={i} style={{ backgroundColor: bg, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center' }}>
                <Text style={{ color: TEXT_P, fontSize: 15, fontWeight: '600' }}>{c}</Text>
              </View>
            );
          })}
        </View>
      );
    } else if (qIdx === 1) {
      topCardContent = (
        <>
           <View style={{ position: 'absolute', top: 12, left: 16, backgroundColor: '#8b5cf612', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#8b5cf6' }}>
              <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{tQ('verb')}</Text>
           </View>
           <Text style={{ color: TEXT_P, fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 12, lineHeight: 28 }}>{tQ('q2_text')}</Text>
        </>
      );
      const choices = [tQ('q2_c1'), tQ('q2_c2'), tQ('q2_c3'), tQ('q2_c4')];
      bottomContent = (
        <View style={{ gap: 8 }}>
          {choices.map((c, i) => {
            let bg = SURFACE;
            let border = '#ffffff14';
            if (isAns && i === 0) { // q2_c1 is correct
              bg = '#22C55E22';
              border = '#22C55E';
            }
            return (
              <View key={i} style={{ backgroundColor: bg, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: border, alignItems: 'center' }}>
                <Text style={{ color: TEXT_P, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{c}</Text>
              </View>
            );
          })}
        </View>
      );
    } else if (qIdx === 2) {
      topCardContent = (
        <>
           <Text style={{ color: TEXT_P, fontSize: 18, fontWeight: '600', textAlign: 'center', lineHeight: 28 }}>{tQ('q3_text')}</Text>
        </>
      );
      bottomContent = (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1, backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1.5, borderColor: isAns ? '#22C55E' : '#ffffff14', padding: 14, justifyContent: 'center' }}>
            <Text style={{ color: typedText ? TEXT_P : TEXT_S, fontSize: 16, fontWeight: '600' }}>{typedText || tQ('typeAnswer')}</Text>
          </View>
          <View style={{ backgroundColor: isAns ? '#22C55E' : '#8b5cf6', borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center', opacity: isAns || typedText === tQ('q3_ans') ? 1 : 0.4 }}>
            <Ionicons name="checkmark" size={22} color="#fff" />
          </View>
        </View>
      );
    }

    return (
      <View style={{ width: '100%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16, marginHorizontal: 20 }}>
          <View style={{ height: 3, flex: 1, backgroundColor: '#8b5cf6', borderRadius: 2 }} />
          <View style={{ height: 3, flex: 1, backgroundColor: qIdx >= 1 ? '#8b5cf6' : '#ffffff18', borderRadius: 2 }} />
          <View style={{ height: 3, flex: 1, backgroundColor: qIdx >= 2 ? '#8b5cf6' : '#ffffff18', borderRadius: 2 }} />
        </View>
        
        <View style={{ borderRadius: 20, paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center', minHeight: 130, justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff18', marginBottom: 16, overflow: 'hidden', backgroundColor: 'transparent' }}>
           <Image 
             source={require('@/assets/images/sublexify_transparent.png')} 
             style={{ position: 'absolute', width: 140, height: 140, opacity: 0.06 }}
             resizeMode="contain" 
           />
           {topCardContent}
        </View>

        {bottomContent}
      </View>
    );
  };

  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity, width: '100%' }}>
        {renderContent()}
      </Animated.View>
    </View>
  );
}

// ─── Stats Demo (slide 6) ──────────────────────────────────────
const STATS_DATA = [
  { id: 'today', title: 'Bugün Tekrar', desc: '10 / 443 kelime', value: 10, color: '#EF4444', icon: 'time-outline' as const },
  { id: 'learned', title: 'Öğrenilen', desc: 'Portföyünüzdeki toplam kelime sayısı', value: 443, color: '#3B82F6', icon: 'checkmark-circle-outline' as const },
  { id: 'studied', title: 'Çalışılan', desc: 'En az bir kez antrenman yapılan kelimeler', value: 52, color: '#A855F7', icon: 'pencil-outline' as const },
  { id: 'struggled', title: 'Zorlandığımız', desc: 'Çok sık karşılaştığın (5+ kez) ama...', value: 4, color: '#F59E0B', icon: 'flash-outline' as const }
];

function AnimatedStatCard({ stat, index, active }: { stat: typeof STATS_DATA[0], index: number, active: boolean }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const numAnim = useRef(new Animated.Value(0)).current;

  const [displayNum, setDisplayNum] = useState(0);

  useEffect(() => {
    numAnim.addListener(({ value }) => {
      setDisplayNum(Math.floor(value));
    });
    return () => numAnim.removeAllListeners();
  }, [numAnim]);

  useEffect(() => {
    if (active) {
      const delay = index * 200;
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true })
        ]),
      ]).start();

      Animated.sequence([
        Animated.delay(delay + 300),
        Animated.timing(numAnim, { toValue: stat.value, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: false })
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
      numAnim.setValue(0);
      setDisplayNum(0);
    }
  }, [active, index, scale, opacity, numAnim, stat.value]);

  return (
    <Animated.View style={{ 
      flex: 1, 
      backgroundColor: SURFACE, 
      borderRadius: 20, 
      padding: 16, 
      margin: 6, 
      borderWidth: 1, 
      borderColor: '#ffffff14',
      transform: [{ scale }],
      opacity,
      minHeight: 160
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: stat.color + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={stat.icon} size={22} color={stat.color} />
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: stat.color + '0A', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-forward" size={16} color={TEXT_S} />
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: stat.color }}>{displayNum}</Text>
        <Text style={{ color: TEXT_P, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{stat.title}</Text>
        <Text style={{ color: TEXT_S, fontSize: 11, marginTop: 4, lineHeight: 16 }}>{stat.desc}</Text>
      </View>
    </Animated.View>
  );
}

function SublexStatsDemo({ active }: { active: boolean }) {
  const w = Math.min(width * 0.9, 360);
  
  return (
    <View style={{ width: w, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <AnimatedStatCard stat={STATS_DATA[0]} index={0} active={active} />
        <AnimatedStatCard stat={STATS_DATA[1]} index={1} active={active} />
      </View>
      <View style={{ flexDirection: 'row', width: '100%' }}>
        <AnimatedStatCard stat={STATS_DATA[2]} index={2} active={active} />
        <AnimatedStatCard stat={STATS_DATA[3]} index={3} active={active} />
      </View>
    </View>
  );
}

// ─── Finale Demo (slide 7) ──────────────────────────────────────
const FINALE_POSTERS = [
  'https://image.tmdb.org/t/p/w500/ggFHVb15yqAcB4ZtD7ZqE0g99bJ.jpg', // Breaking Bad
  'https://image.tmdb.org/t/p/w500/gKkl37BQuKTanygYQG1pyYgLVgf.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg', // Friends
  'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight
  'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', // Game of Thrones
  'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8TC2PZwAl.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', // Inception
  'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', // The Matrix
  'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPbOYKQcbJ5.jpg', // Pulp Fiction
  'https://image.tmdb.org/t/p/w500/qWnJzyZwidYxBE130fMacnZ6ZCA.jpg', // The Office
];
const FINALE_WORDS = ['Serendipity', 'Resilience', 'Wanderlust', 'Eloquent'];

function FloatingPoster({ uri, active, duration, startY, endY, left, right, scale, rotate, opacity, delay = 0 }: any) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      anim.setValue(0);
      return;
    }
    const t = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
      ).start();
    }, delay);
    return () => { clearTimeout(t); anim.stopAnimation(); };
  }, [active, anim, duration, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY, endY] });

  const style: any = { 
    position: 'absolute', width: 100 * scale, height: 150 * scale, 
    borderRadius: 12, transform: [{ translateY }, { rotate: `${rotate}deg` }], opacity 
  };
  if (left !== undefined) style.left = left;
  if (right !== undefined) style.right = right;

  return <Animated.Image source={{ uri }} style={style} />;
}

function SublexFinaleDemo({ active }: { active: boolean }) {
  const { t } = useTranslation('common');
  const w = Math.min(width * 0.9, 360);
  const h = Math.min(height * 0.48, 490);

  const progressW1 = useRef(new Animated.Value(0)).current;
  const progressW2 = useRef(new Animated.Value(0)).current;
  
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progressW1.setValue(0);
      progressW2.setValue(0);
      scaleAnim.setValue(0);
      return;
    }

    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

    const loopAnim = (anim: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
      ).start();
    };

    loopAnim(progressW1, 14000);
    loopAnim(progressW2, 11000);
  }, [active, progressW1, progressW2, scaleAnim]);

  const word1Y = progressW1.interpolate({ inputRange: [0, 1], outputRange: [h + 50, -100] });
  const word2Y = progressW2.interpolate({ inputRange: [0, 1], outputRange: [-50, h + 100] });

  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', borderRadius: 24, overflow: 'hidden', backgroundColor: '#1a1a1c', borderWidth: 1, borderColor: '#ffffff14' }}>
      
      {/* Background Elements */}
      <View style={{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#8b5cf6', opacity: 0.15, top: -50, left: -50 }} />
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#2BFF88', opacity: 0.12, bottom: -40, right: -40 }} />

      {/* 10 Floating Posters */}
      <FloatingPoster active={active} uri={FINALE_POSTERS[0]} left={10} scale={1} rotate={-12} opacity={0.6} duration={16000} startY={h + 100} endY={-200} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[1]} right={10} scale={1.1} rotate={8} opacity={0.6} duration={18000} startY={h + 150} endY={-250} delay={2000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[2]} left={'30%'} scale={1.2} rotate={5} opacity={0.4} duration={14000} startY={-200} endY={h + 200} delay={1000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[3]} right={'25%'} scale={0.9} rotate={-15} opacity={0.5} duration={15000} startY={h + 100} endY={-200} delay={4000} />
      
      <FloatingPoster active={active} uri={FINALE_POSTERS[4]} left={-20} scale={0.8} rotate={10} opacity={0.3} duration={19000} startY={h + 50} endY={-300} delay={3000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[5]} right={-10} scale={0.75} rotate={-5} opacity={0.4} duration={21000} startY={-150} endY={h + 150} delay={5000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[6]} left={'40%'} scale={0.85} rotate={-8} opacity={0.3} duration={17000} startY={h + 200} endY={-150} delay={6000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[7]} right={'45%'} scale={1.05} rotate={12} opacity={0.5} duration={22000} startY={-250} endY={h + 250} delay={1500} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[8]} left={20} scale={0.95} rotate={-18} opacity={0.45} duration={20000} startY={-200} endY={h + 200} delay={7000} />
      <FloatingPoster active={active} uri={FINALE_POSTERS[9]} right={30} scale={1.15} rotate={15} opacity={0.35} duration={16000} startY={h + 250} endY={-200} delay={8000} />

      {/* Floating Words */}
      <Animated.View style={{ position: 'absolute', left: 20, backgroundColor: '#2BFF8822', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#2BFF8866', transform: [{ translateY: word1Y }, { rotate: '4deg' }] }}>
         <Text style={{ color: '#2BFF88', fontWeight: '800', fontSize: 16 }}>{FINALE_WORDS[0]}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', right: 20, backgroundColor: '#8b5cf622', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#8b5cf666', transform: [{ translateY: word2Y }, { rotate: '-6deg' }] }}>
         <Text style={{ color: '#8b5cf6', fontWeight: '800', fontSize: 16 }}>{FINALE_WORDS[1]}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', top: 50, left: '35%', backgroundColor: '#3B82F622', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#3B82F666', transform: [{ translateY: word1Y }, { rotate: '-10deg' }] }}>
         <Text style={{ color: '#3B82F6', fontWeight: '800', fontSize: 16 }}>{FINALE_WORDS[2]}</Text>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', bottom: 50, right: '35%', backgroundColor: '#F59E0B22', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#F59E0B66', transform: [{ translateY: word2Y }, { rotate: '12deg' }] }}>
         <Text style={{ color: '#F59E0B', fontWeight: '800', fontSize: 16 }}>{FINALE_WORDS[3]}</Text>
      </Animated.View>

      {/* Fade Gradients for top and bottom so items don't cut off sharply */}
      <LinearGradient colors={['#1a1a1c', 'transparent']} style={{ position: 'absolute', top: 0, width: '100%', height: 80 }} />
      <LinearGradient colors={['transparent', '#1a1a1c']} style={{ position: 'absolute', bottom: 0, width: '100%', height: 80 }} />

      {/* Center Sublexify Badge */}
      <Animated.View style={{ backgroundColor: '#13151B', paddingVertical: 24, paddingHorizontal: 32, borderRadius: 28, borderWidth: 1, borderColor: '#ffffff22', alignItems: 'center', transform: [{ scale: scaleAnim }], elevation: 10, shadowColor: '#2BFF88', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
         
         {/* Highly visible stats badge at the top of the card */}
         <View style={{ position: 'absolute', top: -14, backgroundColor: '#2BFF88', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, shadowColor: '#2BFF88', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }}>
           <Text style={{ color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 }}>{t('onboarding.contentStats')}</Text>
         </View>

         <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#2BFF8822', alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginTop: 4 }}>
            <Image source={require('@/assets/images/sublexify_transparent.png')} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="cover" />
         </View>
         <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1 }}>SUBLEXIFY</Text>
         <Text style={{ color: TEXT_S, fontSize: 12, fontWeight: '600', marginTop: 4 }}>{t('onboarding.masterVocabulary')}</Text>
      </Animated.View>

    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation('common');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { setHasSeenOnboarding, isAuthenticated } = useAuthStore();

  const total = SLIDES.length;
  const isLast = currentIndex === total - 1;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== currentIndex) setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const handleFinish = () => {
    setHasSeenOnboarding(true);
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  const renderVisual = (slide: typeof SLIDES[0], index: number) => {
    switch (slide.type) {
      case 'appicon':
        return <AppIconVisual />;
      case 'lottie': {
        const aspect = slide.aspect ?? 1;
        let w = Math.min(width * 0.84, 360);
        let h = w / aspect;
        const maxH = height * 0.42;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        return (
          <View style={{ width: w, height: h }}>
            <LottieView source={slide.lottie} autoPlay loop style={{ width: '100%', height: '100%' }} />
          </View>
        );
      }
      case 'scene': {
        const aspect = slide.aspect ?? 1;
        let w = Math.min(width * 0.9, 400);
        let h = w / aspect;
        const maxH = height * 0.42;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        return <ExpoImage source={slide.image} style={{ width: w, height: h }} contentFit="contain" autoplay />;
      }
      case 'faded':
        return <SceneForget active={currentIndex === index} />;
      case 'quiz':
        return <SublexQuizDemo active={currentIndex === index} />;
      case 'stats':
        return <SublexStatsDemo active={currentIndex === index} />;
      case 'finale':
        return <SublexFinaleDemo active={currentIndex === index} />;
      case 'flip':
        return <SublexFlashcard active={currentIndex === index} />;
      case 'image':
        return <FramedShot image={slide.image} />;
    }
  };

  const renderItem = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => (
    <View style={{ width, flex: 1 }}>
      <View style={{ paddingHorizontal: 28, paddingTop: 10 }}>
        <AccentTitle title={t(`onboarding.slides.${item.key}.title`)} accent={t(`onboarding.slides.${item.key}.accent`)} />
        <AnimatedBodyText 
          text={t(`onboarding.slides.${item.key}.body`)} 
          active={currentIndex === index} 
          shouldFade={item.type === 'quiz'} 
        />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }}>
        {renderVisual(item, index)}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header: geri ok + segment progress + atla */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 }}>
          <TouchableOpacity onPress={handleBack} disabled={currentIndex === 0} style={{ opacity: currentIndex === 0 ? 0.25 : 1, padding: 4 }}>
            <Ionicons name="chevron-back" size={26} color={TEXT_P} />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= currentIndex ? ACCENT : '#ffffff1f',
                }}
              />
            ))}
          </View>
          {!isLast ? (
            <TouchableOpacity onPress={handleFinish} style={{ padding: 4 }}>
              <Text style={{ color: TEXT_S, fontSize: 14, fontWeight: '600' }}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Slaytlar */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          extraData={currentIndex}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        />

        {/* Buton */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 }}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={{ width: '100%', paddingVertical: 17, borderRadius: 16, alignItems: 'center', backgroundColor: '#F3F4F6' }}
          >
            <Text style={{ color: '#0B0D12', fontSize: 16, fontWeight: '800' }}>
              {isLast ? t('onboarding.getStarted') : t('onboarding.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
