import { useEffect, useRef, useState } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter, useSegments, type Href } from 'expo-router';
import { Text } from '@/components/ui/text';
import {
  useOnboarding,
  ONBOARDING_STEP_CONTENT,
  JOIN_CLASSROOM_WITH_TEXT_CONTENT,
  NAME_CLASSROOM_WITH_TEXT_CONTENT,
  unionRects,
  type TargetLayout,
} from '@/context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { SpotlightMask, TourTooltip, isLargeSpotlightTarget } from '@/components/onboarding/Spotlight';
import { useTranslation } from 'react-i18next';
import { resolveOnboardingCopy } from '@/lib/onboardingI18n';

const REMEASURE_DELAYS_MS = [0, 150, 400, 900];

function toIdArray(targetId: string | string[] | undefined): string[] {
  if (!targetId) return [];
  return Array.isArray(targetId) ? targetId : [targetId];
}

type OnboardingOverlayProps = {
  /** `modal` renders inside RN Modal (e.g. create-classroom) where the root overlay cannot appear. */
  variant?: 'screen' | 'modal';
};

export function OnboardingOverlay({ variant = 'screen' }: OnboardingOverlayProps) {
  const {
    active,
    step,
    tourRole,
    targets,
    joinClassroomTextEntered,
    classroomNameEntered,
    skipTour,
    finishTour,
    goToStep,
    requestMeasure,
  } = useOnboarding();
  const { t } = useTranslation();
  const segments = useSegments();
  const router = useRouter();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const containerRef = useRef<View>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });
  const measureContainer = () => {
    containerRef.current?.measureInWindow((x, y) => {
      setContainerOffset((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
    });
  };

  const content =
    step === 'join_classroom' && joinClassroomTextEntered
      ? JOIN_CLASSROOM_WITH_TEXT_CONTENT
      : step === 'name_classroom' && classroomNameEntered
        ? NAME_CLASSROOM_WITH_TEXT_CONTENT
        : step
          ? ONBOARDING_STEP_CONTENT[step]
          : undefined;
  const activeTargetIds = toIdArray(content?.targetId);
  const activeTargetIdsKey = activeTargetIds.join(',');

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    if (activeTargetIds.length === 0) return;
    timeoutsRef.current = REMEASURE_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        activeTargetIds.forEach((id) => requestMeasure(id));
        measureContainer();
      }, delay),
    );
    return () => timeoutsRef.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTargetIdsKey, requestMeasure, step]);

  if (!active || !step) return null;

  if (variant === 'screen' && step === 'name_classroom') return null;
  if (variant === 'modal' && step !== 'name_classroom') return null;

  if (step === 'complete') {
    const onStudentHome = tourRole !== 'teacher' && segments.length <= 1 && segments[0] === 'student';
    const onTeacherHome =
      tourRole === 'teacher' &&
      segments[0] === 'teacher' &&
      (segments.length === 1 || segments[1] === 'index');
    if (!onStudentHome && !onTeacherHome) return null;

    const completeContent =
      tourRole === 'teacher'
        ? {
            title: t('onboarding.teacherCompleteTitle'),
            body: t('onboarding.teacherCompleteBody'),
            ctaLabel: t('onboarding.completeCta'),
          }
        : {
            title: t('onboarding.completeTitle'),
            body: t('onboarding.completeBody'),
            ctaLabel: t('onboarding.completeCta'),
          };

    return (
      <View
        pointerEvents="auto"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        className="bg-black/70 items-center justify-center px-8"
      >
        <View className="bg-card border border-border rounded-2xl p-6 gap-3 w-full max-w-sm items-center">
          <Ionicons name="ribbon" size={34} color="#F59E0B" />
          <Text className="text-foreground text-lg font-bold text-center">{completeContent.title}</Text>
          <Text className="text-muted-foreground text-sm text-center leading-5">{completeContent.body}</Text>
          <Pressable onPress={finishTour} className="bg-primary py-3 px-8 rounded-xl mt-2 active:opacity-80">
            <Text className="text-primary-foreground font-bold">{completeContent.ctaLabel}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const rawRect: TargetLayout | undefined = activeTargetIds.reduce<TargetLayout | undefined>((acc, id) => {
    const r = targets[id];
    if (!r) return acc;
    return acc ? unionRects(acc, r) : r;
  }, undefined);

  const rect: TargetLayout | undefined = rawRect
    ? {
        x: rawRect.x - containerOffset.x,
        y: rawRect.y - containerOffset.y,
        width: rawRect.width,
        height: rawRect.height,
      }
    : undefined;

  if (!content) return null;

  const dimOnly = content.dimOnly === true;
  if (!dimOnly && !rect) return null;

  const localizedCopy = step
    ? resolveOnboardingCopy(step, t, { joinClassroomTextEntered, classroomNameEntered })
    : null;

  const title = localizedCopy?.title ?? content.title;
  const body = localizedCopy?.body ?? content.body;
  const ctaLabel = localizedCopy?.ctaLabel ?? content.ctaLabel;

  const advance = content.nextStep
    ? () => {
        const next = content.nextStep!;
        if (content.returnToHome) {
          router.navigate('/teacher' as Href);
        }
        goToStep(next);
      }
    : undefined;

  const largeTarget =
    dimOnly || (rect ? isLargeSpotlightTarget(rect, screenW, screenH) : false);
  const maskRect: TargetLayout = rect ?? { x: 0, y: 0, width: screenW, height: screenH };

  const overlayBody = (
    <>
      <SpotlightMask rect={maskRect} fullDim={largeTarget} />
      <TourTooltip
        title={title}
        body={body}
        anchorRect={dimOnly ? undefined : rect}
        centered={largeTarget}
        stepLabel={t('onboarding.stepLabel')}
        onSkip={skipTour}
        ctaLabel={ctaLabel}
        onCta={advance}
      />
    </>
  );

  if (content.tapAnywhereToAdvance && advance) {
    return (
      <Pressable
        ref={containerRef}
        onLayout={measureContainer}
        onPress={advance}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {overlayBody}
      </Pressable>
    );
  }

  return (
    <View
      ref={containerRef}
      onLayout={measureContainer}
      pointerEvents="box-none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {overlayBody}
    </View>
  );
}
