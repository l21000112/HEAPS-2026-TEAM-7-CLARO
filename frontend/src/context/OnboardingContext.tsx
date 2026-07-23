import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { completeOnboardingTour } from '@/api/users';

export type TourRole = 'student' | 'teacher';

export type OnboardingStep =
  | 'join_classroom'
  | 'mock_assignment_intro'
  | 'practice_banner_intro'
  | 'practice_call_button'
  | 'menu_intro'
  | 'complete'
  | 'create_first_class'
  | 'name_classroom'
  | 'assign_homework_tile'
  | 'assign_homework_back'
  | 'scenarios_tile'
  | 'scenarios_create'
  | 'scenarios_back'
  | 'classes_tile'
  | 'classes_copy_invite'
  | 'classes_back'
  | 'analytics_tile'
  | 'analytics_intro'
  | 'analytics_back'
  | 'teacher_menu_intro';

export type TargetLayout = { x: number; y: number; width: number; height: number };

export type StepContent = {
  title: string;
  body: string;
  /** A single target id, or several - several are unioned into one bounding spotlight. */
  targetId?: string | string[];
  ctaLabel?: string;
  /** Step to advance to when the ctaLabel button (and, if tapAnywhereToAdvance, anywhere else) is tapped. */
  nextStep?: OnboardingStep;
  /** If true, tapping anywhere on screen - not just the ctaLabel button - advances to nextStep. */
  tapAnywhereToAdvance?: boolean;
  /** Teacher sub-screens: navigate back to the teacher home tab when this step advances. */
  returnToHome?: boolean;
  /** Full-screen dim with centered tooltip - no spotlight cutout on a target. */
  dimOnly?: boolean;
};

export const ONBOARDING_STEP_CONTENT: Record<OnboardingStep, StepContent> = {
  join_classroom: {
    title: 'Join your first classroom',
    body: 'Ask your teacher for a class invite code and paste it in the box below.',
    targetId: 'join_classroom_input',
  },
  mock_assignment_intro: {
    title: 'Try a mock assignment',
    body: "Let's get you familiar with the app first. Tap the card below to start - it isn't graded and nothing is sent to your teacher.",
    targetId: 'mock_assignment_card',
  },
  practice_banner_intro: {
    title: 'Practice Banner',
    body: "This isn't a real call and is just a simulation! Tap Next or anywhere to continue.",
    targetId: 'practice_banner',
    ctaLabel: 'Next',
    nextStep: 'practice_call_button',
    tapAnywhereToAdvance: true,
  },
  practice_call_button: {
    title: 'Pick up the call',
    body: 'Tap the green answer button to see what the caller wants.',
    targetId: 'practice_call_button',
  },
  menu_intro: {
    title: 'Explore the Menu',
    body: 'Apart from the Home page, you can also view your personal Student Profile, Classroom Info, and Settings.',
    targetId: 'menu_buttons',
    ctaLabel: 'Next',
    nextStep: 'complete',
    tapAnywhereToAdvance: true,
  },
  complete: {
    title: "You're all set!",
    body: 'You know your way around Claro now. Good luck spotting the scams!',
    ctaLabel: 'Finish',
  },

  create_first_class: {
    title: 'Create your first class',
    body: 'Tap below to set up a classroom for your students.',
    targetId: 'create_first_class',
  },
  name_classroom: {
    title: 'Name your classroom',
    body: 'Enter a class name, then tap Create.',
    targetId: 'name_classroom_modal',
  },
  assign_homework_tile: {
    title: 'Assign Homework',
    body: 'Tap here to choose scenarios and assign them to a class.',
    targetId: 'assign_homework_tile',
  },
  assign_homework_back: {
    title: 'Assign Homework',
    body: 'Pick scenarios here and assign them to a class with optional deadlines and attempt limits. Tap Next or anywhere to continue.',
    targetId: 'assign_homework_body',
    ctaLabel: 'Next',
    nextStep: 'scenarios_tile',
    tapAnywhereToAdvance: true,
    returnToHome: true,
  },
  scenarios_tile: {
    title: 'Scenario Library',
    body: 'Tap here to browse every available scenario.',
    targetId: 'scenarios_tile',
  },
  scenarios_create: {
    title: 'Create custom scenarios',
    body: 'This library lists all scenarios. You can also build your own with Create Custom Scenario.',
    targetId: 'scenarios_create',
    ctaLabel: 'Next',
    nextStep: 'scenarios_back',
    tapAnywhereToAdvance: true,
  },
  scenarios_back: {
    title: 'Scenario Library',
    body: 'Browse system and custom scenarios anytime from this screen. Tap Next or anywhere to continue.',
    ctaLabel: 'Next',
    nextStep: 'classes_tile',
    tapAnywhereToAdvance: true,
    returnToHome: true,
    dimOnly: true,
  },
  classes_tile: {
    title: 'Classes',
    body: 'Tap here to manage your classrooms and invite codes.',
    targetId: 'classes_tile',
  },
  classes_copy_invite: {
    title: 'Invite your students',
    body: 'Tap Copy Invite to grab a code you can share so students can enroll in your class.',
    targetId: 'classes_copy_invite',
  },
  classes_back: {
    title: 'Your classes',
    body: 'Manage classrooms and invite codes from here whenever you need to enroll students. Tap Next or anywhere to continue.',
    ctaLabel: 'Next',
    nextStep: 'analytics_tile',
    tapAnywhereToAdvance: true,
    returnToHome: true,
    dimOnly: true,
  },
  analytics_tile: {
    title: 'Analytics',
    body: 'Tap here to review class performance over time.',
    targetId: 'analytics_tile',
  },
  analytics_intro: {
    title: 'Class analytics',
    body: 'Analytics will show up here once enrolled students have completed scenarios.',
    targetId: 'analytics_body',
    ctaLabel: 'Next',
    nextStep: 'analytics_back',
    tapAnywhereToAdvance: true,
  },
  analytics_back: {
    title: 'Analytics',
    body: 'Check back here for fail rates and students who may need extra support. Tap Next or anywhere to continue.',
    ctaLabel: 'Next',
    nextStep: 'teacher_menu_intro',
    tapAnywhereToAdvance: true,
    returnToHome: true,
    dimOnly: true,
  },
  teacher_menu_intro: {
    title: 'Explore the Menu',
    body: 'Use the bottom bar to jump between Home, Profile, Classes, and Settings.',
    targetId: 'teacher_menu_buttons',
    ctaLabel: 'Next',
    nextStep: 'complete',
    tapAnywhereToAdvance: true,
  },
};

export const JOIN_CLASSROOM_WITH_TEXT_CONTENT: StepContent = {
  title: 'Join your first classroom',
  body: 'Now tap Join Class to continue.',
  targetId: ['join_classroom_input', 'join_classroom_button'],
};

export const NAME_CLASSROOM_WITH_TEXT_CONTENT: StepContent = {
  title: 'Name your classroom',
  body: 'Now tap Create to finish setting up your class.',
  targetId: 'name_classroom_modal',
};

const STORAGE_PREFIX = 'onboarding-tour-complete-';

type StartTourOpts = {
  role: TourRole;
  /** Student: whether they already belong to a classroom. */
  hasClassroom?: boolean;
  /** Teacher: whether they already have at least one classroom. */
  hasClassrooms?: boolean;
};

type OnboardingContextValue = {
  active: boolean;
  step: OnboardingStep | null;
  tourRole: TourRole | null;
  targets: Record<string, TargetLayout>;
  /** True once the student has typed something into the invite-code input during the join_classroom step. */
  joinClassroomTextEntered: boolean;
  setJoinClassroomTextEntered: (entered: boolean) => void;
  /** True once the teacher has typed a classroom name during name_classroom. */
  classroomNameEntered: boolean;
  setClassroomNameEntered: (entered: boolean) => void;
  maybeAutoStart: (opts: StartTourOpts) => void;
  startTour: (opts: StartTourOpts) => void;
  goToStep: (step: OnboardingStep) => void;
  /** If the tour is on `expected`, advance to `next` (used by real UI actions). */
  advanceFrom: (expected: OnboardingStep, next: OnboardingStep) => void;
  skipTour: () => void;
  finishTour: () => void;
  registerTarget: (id: string, layout: TargetLayout) => void;
  unregisterTarget: (id: string) => void;
  registerMeasureFn: (id: string, fn: () => void) => void;
  unregisterMeasureFn: (id: string) => void;
  requestMeasure: (id: string) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

function layoutsEqual(a?: TargetLayout, b?: TargetLayout) {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** Bounding box that contains both rects - used to spotlight several sibling targets at once. */
export function unionRects(a: TargetLayout, b: TargetLayout): TargetLayout {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: right - x, height: bottom - y };
}

function initialStepFor(opts: StartTourOpts): OnboardingStep {
  if (opts.role === 'teacher') {
    return opts.hasClassrooms ? 'assign_homework_tile' : 'create_first_class';
  }
  return opts.hasClassroom ? 'mock_assignment_intro' : 'join_classroom';
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile } = useAuth();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState<OnboardingStep | null>(null);
  const [tourRole, setTourRole] = useState<TourRole | null>(null);
  const [targets, setTargets] = useState<Record<string, TargetLayout>>({});
  const [joinClassroomTextEntered, setJoinClassroomTextEntered] = useState(false);
  const [classroomNameEntered, setClassroomNameEntered] = useState(false);
  const autoStartCheckedFor = useRef<string | null>(null);
  const measureFnsRef = useRef<Record<string, () => void>>({});

  const cacheCompleteLocally = useCallback((uid?: string) => {
    if (!uid) return;
    AsyncStorage.setItem(STORAGE_PREFIX + uid, '1').catch(() => {});
  }, []);

  const persistComplete = useCallback(
    (uid?: string) => {
      if (!uid) return;
      cacheCompleteLocally(uid);
      completeOnboardingTour()
        .then(() => refreshProfile())
        .catch(() => {});
    },
    [cacheCompleteLocally, refreshProfile],
  );

  const startTour = useCallback((opts: StartTourOpts) => {
    setActive(true);
    setTourRole(opts.role);
    setJoinClassroomTextEntered(false);
    setClassroomNameEntered(false);
    setStep(initialStepFor(opts));
  }, []);

  const maybeAutoStart = useCallback(
    (opts: StartTourOpts) => {
      const uid = profile?.uid;
      if (!uid || active) return;
      // Don't start the wrong role's tour if profile role is known.
      if (profile.role && profile.role !== opts.role) return;
      if (autoStartCheckedFor.current === uid) return;
      autoStartCheckedFor.current = uid;

      if (profile.onboardingTourComplete) {
        cacheCompleteLocally(uid);
        return;
      }

      AsyncStorage.getItem(STORAGE_PREFIX + uid)
        .then((seen) => {
          if (seen) {
            persistComplete(uid);
            return;
          }
          startTour(opts);
        })
        .catch(() => {
          startTour(opts);
        });
    },
    [
      profile?.uid,
      profile?.role,
      profile?.onboardingTourComplete,
      active,
      startTour,
      cacheCompleteLocally,
      persistComplete,
    ],
  );

  const goToStep = useCallback((next: OnboardingStep) => {
    setStep(next);
    if (next !== 'join_classroom') setJoinClassroomTextEntered(false);
    if (next !== 'name_classroom') setClassroomNameEntered(false);
  }, []);

  const advanceFrom = useCallback(
    (expected: OnboardingStep, next: OnboardingStep) => {
      setStep((current) => {
        if (current !== expected) return current;
        if (next !== 'join_classroom') setJoinClassroomTextEntered(false);
        if (next !== 'name_classroom') setClassroomNameEntered(false);
        return next;
      });
    },
    [],
  );

  const skipTour = useCallback(() => {
    setActive(false);
    setStep(null);
    setTourRole(null);
    persistComplete(profile?.uid);
  }, [persistComplete, profile?.uid]);

  const finishTour = useCallback(() => {
    setActive(false);
    setStep(null);
    setTourRole(null);
    persistComplete(profile?.uid);
  }, [persistComplete, profile?.uid]);

  const registerTarget = useCallback((id: string, layout: TargetLayout) => {
    setTargets((prev) => (layoutsEqual(prev[id], layout) ? prev : { ...prev, [id]: layout }));
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    setTargets((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const registerMeasureFn = useCallback((id: string, fn: () => void) => {
    measureFnsRef.current[id] = fn;
  }, []);

  const unregisterMeasureFn = useCallback((id: string) => {
    delete measureFnsRef.current[id];
  }, []);

  const requestMeasure = useCallback((id: string) => {
    measureFnsRef.current[id]?.();
  }, []);

  const value = useMemo(
    () => ({
      active,
      step,
      tourRole,
      targets,
      joinClassroomTextEntered,
      setJoinClassroomTextEntered,
      classroomNameEntered,
      setClassroomNameEntered,
      maybeAutoStart,
      startTour,
      goToStep,
      advanceFrom,
      skipTour,
      finishTour,
      registerTarget,
      unregisterTarget,
      registerMeasureFn,
      unregisterMeasureFn,
      requestMeasure,
    }),
    [
      active,
      step,
      tourRole,
      targets,
      joinClassroomTextEntered,
      classroomNameEntered,
      maybeAutoStart,
      startTour,
      goToStep,
      advanceFrom,
      skipTour,
      finishTour,
      registerTarget,
      unregisterTarget,
      registerMeasureFn,
      unregisterMeasureFn,
      requestMeasure,
    ],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
