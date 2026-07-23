import { useEffect } from 'react';
import { View, Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedAnimations } from '@/context/reducedAnimationsContext';
import { useTranslation } from 'react-i18next';

import { CatChubby, CatCuddly, CatDisappointed, CatHappy, CatPlayful } from '@/lib/images';

type CatStatus = 'success' | 'error';

const CATS: Record<CatStatus, ImageSourcePropType> = {
  success: CatHappy,
  error: CatDisappointed,
};

export function CatResult({ status }: { status: CatStatus }) {
  const { t } = useTranslation();
  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const systemReduceMotion = useReducedMotion();
  const { reducedAnimations } = useReducedAnimations();
  const reduceMotion = Boolean(systemReduceMotion) || reducedAnimations;

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);

    // reset so a status flip re-triggers the entrance
    scale.value = 0;
    translateX.value = 0;
    translateY.value = 0;

    // haptic cue matched to outcome
    Haptics.notificationAsync(
      status === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );

    if (reduceMotion) {
      // Instant show - no bob / shake when Reduced Animations (or OS setting) is on
      scale.value = 1;
      return;
    }

    // entrance: overshoot pop for both
    scale.value = withSpring(1, { damping: 8, stiffness: 130 });

    if (status === 'success') {
      // gentle idle bob after it lands
      translateY.value = withDelay(
        450,
        withRepeat(
          withSequence(
            withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        ),
      );
    } else {
      // quick head-shake "no"
      translateX.value = withDelay(
        250,
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 100 }),
          withTiming(-8, { duration: 100 }),
          withTiming(8, { duration: 100 }),
          withTiming(0, { duration: 50 }),
        ),
      );
    }
  }, [status, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={status === 'success' ? t('commonUI.catResultSuccess') : t('commonUI.catResultError')}
      accessibilityLiveRegion="polite"
    >
      <Animated.View style={animatedStyle}>
        <Image source={CATS[status]} style={styles.cat} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  cat: { width: 180, height: 180 },
});
