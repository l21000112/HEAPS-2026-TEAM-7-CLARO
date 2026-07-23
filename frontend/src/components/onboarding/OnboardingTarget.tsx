import { useEffect, useRef, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { useOnboarding } from '@/context/OnboardingContext';

type OnboardingTargetProps = ViewProps & {
  id: string;
  children: ReactNode;
};

export function OnboardingTarget({ id, children, ...props }: OnboardingTargetProps) {
  const { registerTarget, unregisterTarget, registerMeasureFn, unregisterMeasureFn } = useOnboarding();
  const viewRef = useRef<View>(null);

  const measureNow = () => {
    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerTarget(id, { x, y, width, height });
      }
    });
  };

  const onLayout = () => requestAnimationFrame(measureNow);

  useEffect(() => {
    registerMeasureFn(id, measureNow);
    return () => {
      unregisterMeasureFn(id);
      unregisterTarget(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <View ref={viewRef} onLayout={onLayout} collapsable={false} {...props}>
      {children}
    </View>
  );
}
