import React, { useRef, useState, useMemo, useEffect } from 'react';
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

type SlideType = 'lottie' | 'scene' | 'faded' | 'flip' | 'image' | 'appicon';

const SLIDES: { key: string; type: SlideType; image?: any; lottie?: any; aspect?: number }[] = [
  { key: '1', type: 'scene', image: require('@/assets/sublexify_mascot_talking.webp'), aspect: 1 },
  { key: '2', type: 'lottie', lottie: require('@/assets/sublexify_scene1.json'), aspect: 480 / 300 },
  { key: '3', type: 'scene', image: require('@/assets/sublexify_scene2.webp'), aspect: 1080 / 640 },
  { key: '4', type: 'faded' },
  { key: '5', type: 'flip' },
  { key: '6', type: 'image', image: require('@/assets/oboardingimages/IMG_2699.png') },
  { key: '7', type: 'image', image: require('@/assets/oboardingimages/IMG_2696.png') },
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
        <Text style={{ color: TEXT_S, fontSize: 16, lineHeight: 24, marginTop: 14 }}>
          {t(`onboarding.slides.${item.key}.body`)}
        </Text>
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
