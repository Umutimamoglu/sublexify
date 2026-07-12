import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableBase = Reanimated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Basılıyken küçülme oranı (1 = animasyon yok) */
  pressScale?: number;
  /** Basınca hafif titreşim ver */
  haptic?: boolean | 'light' | 'medium';
  children?: React.ReactNode;
};

/**
 * TouchableOpacity'nin modern karşılığı: Pressable + Reanimated scale
 * animasyonu + opsiyonel haptic feedback. Scale animasyonu worklet'te
 * (UI thread) çalışır, JS meşgulken bile takılmaz.
 *
 * Kullanım: <AnimatedPressable haptic onPress={...} style={...}>...</AnimatedPressable>
 */
export function AnimatedPressable({
  style,
  pressScale = 0.95,
  haptic = false,
  onPressIn,
  onPress,
  children,
  ...props
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(pressScale, { damping: 18, stiffness: 400 });
      onPressIn?.(e);
    },
    [scale, pressScale, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 14, stiffness: 320 });
      props.onPressOut?.(e);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, props.onPressOut],
  );

  const handlePress = useCallback(
    (e: any) => {
      if (haptic) {
        Haptics.impactAsync(
          haptic === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        );
      }
      onPress?.(e);
    },
    [haptic, onPress],
  );

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
      // Küçük butonlarda tıklama alanını büyüt (dokunma hedefi ≥ 44pt hissi)
      hitSlop={props.hitSlop ?? 8}
    >
      {children}
    </AnimatedPressableBase>
  );
}
