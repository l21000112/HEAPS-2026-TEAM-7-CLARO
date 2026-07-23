import { View, Text } from 'react-native';
import { useEffect, useRef } from 'react';
import { globalStyles } from '../../styles/global';
import { useOnboarding } from '@/context/OnboardingContext';
import { useTranslation } from 'react-i18next';

type PracticeBannerProps = {
  onSkip?: () => void;
  onboardingTargetId?: string;
};

export default function PracticeBanner({ onSkip, onboardingTargetId }: PracticeBannerProps) {
  const { t } = useTranslation();
  const { registerTarget, unregisterTarget, registerMeasureFn, unregisterMeasureFn } = useOnboarding();
  const viewRef = useRef<View>(null);
  const measureNow = () => {
    if (!onboardingTargetId) return;
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerTarget(onboardingTargetId, { x, y, width, height });
      }
    });
  };

  useEffect(() => {
    if (!onboardingTargetId) return;
    registerMeasureFn(onboardingTargetId, measureNow);
    return () => {
      unregisterMeasureFn(onboardingTargetId);
      unregisterTarget(onboardingTargetId);
    };
  }, [onboardingTargetId]);

  return (
    <View 
      ref={viewRef}
      collapsable={false}
      onLayout={() => requestAnimationFrame(measureNow)}
      style={globalStyles.practiceBanner}
    >
      <Text style={globalStyles.practiceText}>{t('commonUI.practiceBanner')}</Text>
    </View>
  );
}