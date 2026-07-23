import type { TFunction } from 'i18next';
import type { OnboardingStep } from '@/context/OnboardingContext';

type StepCopyKeys = {
  titleKey: string;
  bodyKey: string;
  ctaKey?: string;
};

const ONBOARDING_STEP_I18N: Partial<Record<OnboardingStep, StepCopyKeys>> = {
  join_classroom: {
    titleKey: 'onboarding.joinClassroomTitle',
    bodyKey: 'onboarding.joinClassroomBody',
  },
  mock_assignment_intro: {
    titleKey: 'onboarding.mockIntroTitle',
    bodyKey: 'onboarding.mockIntroBody',
  },
  practice_banner_intro: {
    titleKey: 'onboarding.practiceBannerTitle',
    bodyKey: 'onboarding.practiceBannerBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  practice_call_button: {
    titleKey: 'onboarding.practiceCallTitle',
    bodyKey: 'onboarding.practiceCallBody',
  },
  menu_intro: {
    titleKey: 'onboarding.menuIntroTitle',
    bodyKey: 'onboarding.menuIntroBody',
    ctaKey: 'onboarding.menuIntroCta',
  },
  complete: {
    titleKey: 'onboarding.completeTitle',
    bodyKey: 'onboarding.completeBody',
    ctaKey: 'onboarding.completeCta',
  },
  create_first_class: {
    titleKey: 'onboarding.teacherCreateClassTitle',
    bodyKey: 'onboarding.teacherCreateClassBody',
  },
  assign_homework_tile: {
    titleKey: 'onboarding.teacherAssignHomeworkTileTitle',
    bodyKey: 'onboarding.teacherAssignHomeworkTileBody',
  },
  assign_homework_back: {
    titleKey: 'onboarding.teacherAssignHomeworkBackTitle',
    bodyKey: 'onboarding.teacherAssignHomeworkBackBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  scenarios_tile: {
    titleKey: 'onboarding.teacherScenariosTileTitle',
    bodyKey: 'onboarding.teacherScenariosTileBody',
  },
  scenarios_create: {
    titleKey: 'onboarding.teacherScenariosCreateTitle',
    bodyKey: 'onboarding.teacherScenariosCreateBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  scenarios_back: {
    titleKey: 'onboarding.teacherScenariosBackTitle',
    bodyKey: 'onboarding.teacherScenariosBackBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  classes_tile: {
    titleKey: 'onboarding.teacherClassesTileTitle',
    bodyKey: 'onboarding.teacherClassesTileBody',
  },
  classes_copy_invite: {
    titleKey: 'onboarding.teacherClassesCopyInviteTitle',
    bodyKey: 'onboarding.teacherClassesCopyInviteBody',
  },
  classes_back: {
    titleKey: 'onboarding.teacherClassesBackTitle',
    bodyKey: 'onboarding.teacherClassesBackBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  analytics_tile: {
    titleKey: 'onboarding.teacherAnalyticsTileTitle',
    bodyKey: 'onboarding.teacherAnalyticsTileBody',
  },
  analytics_intro: {
    titleKey: 'onboarding.teacherAnalyticsIntroTitle',
    bodyKey: 'onboarding.teacherAnalyticsIntroBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  analytics_back: {
    titleKey: 'onboarding.teacherAnalyticsBackTitle',
    bodyKey: 'onboarding.teacherAnalyticsBackBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
  teacher_menu_intro: {
    titleKey: 'onboarding.teacherMenuIntroTitle',
    bodyKey: 'onboarding.teacherMenuIntroBody',
    ctaKey: 'onboarding.practiceBannerCta',
  },
};

export function resolveOnboardingCopy(
  step: OnboardingStep,
  t: TFunction,
  opts: { joinClassroomTextEntered?: boolean; classroomNameEntered?: boolean },
): { title: string; body: string; ctaLabel?: string } | null {
  if (step === 'join_classroom' && opts.joinClassroomTextEntered) {
    return {
      title: t('onboarding.joinClassroomWithTextTitle'),
      body: t('onboarding.joinClassroomWithTextBody'),
    };
  }

  if (step === 'name_classroom') {
    return {
      title: t(
        opts.classroomNameEntered
          ? 'onboarding.teacherNameClassWithTextTitle'
          : 'onboarding.teacherNameClassTitle',
      ),
      body: t(
        opts.classroomNameEntered
          ? 'onboarding.teacherNameClassWithTextBody'
          : 'onboarding.teacherNameClassBody',
      ),
    };
  }

  const keys = ONBOARDING_STEP_I18N[step];
  if (!keys) return null;

  return {
    title: t(keys.titleKey),
    body: t(keys.bodyKey),
    ...(keys.ctaKey ? { ctaLabel: t(keys.ctaKey) } : {}),
  };
}
