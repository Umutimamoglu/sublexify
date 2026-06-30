import React, { useEffect } from 'react';
import { StyleSheet, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const AnimatedGradient = Reanimated.createAnimatedComponent(LinearGradient);

const BAND_RATIO = 0.55; // band width as fraction of parent

/**
 * Performant shine/shimmer sweep — runs entirely on the UI thread (Reanimated 4).
 * A diagonal light band loops across the parent to draw attention.
 * Parent must have `overflow: 'hidden'` + `borderRadius` for clean clipping.
 */
export function ShimmerOverlay({
  active = true,
  duration = 1300,
  pauseBetween = 1000,
  bandColor = 'rgba(255,255,255,0.38)',
}: {
  active?: boolean;
  duration?: number;
  pauseBetween?: number;
  bandColor?: string;
}) {
  const progress = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(progress);
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withDelay(
        pauseBetween,
        withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [active, duration, pauseBetween, progress]);

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const style = useAnimatedStyle(() => {
    const w = width.value || 200;
    const bandW = w * BAND_RATIO;
    // Start fully off the left edge, end fully off the right edge
    const from = -bandW;
    const to = w;
    return {
      transform: [{ translateX: from + progress.value * (to - from) }],
    };
  });

  if (!active) return null;

  return (
    <Reanimated.View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFillObject, { width: `${BAND_RATIO * 100}%` }, style]}
    >
      <AnimatedGradient
        colors={['transparent', bandColor, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}
