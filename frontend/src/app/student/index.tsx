import "../../../global.css";
import { useCallback, useRef, useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, RefreshControl, Image } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/AuthContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { listClassrooms, getClassroomAssignments, type Classroom, type ClassroomAssignment, type AssignmentScenario } from "@/api/classrooms";
import { redeemInvite } from "@/api/users";
import { useOnboarding } from "@/context/OnboardingContext";
import { OnboardingTarget } from "@/components/onboarding/OnboardingTarget";
import { MockAssignmentCard } from "@/components/onboarding/MockAssignmentCard";
import { CatChubby, CatPlayful } from '@/lib/images';
import { useAppAlert } from '@/context/AppAlertContext';
import { useFocusAnimationKey } from '@/lib/useFocusAnimationKey';
import { useColors } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';
import { formatAppDate } from '@/lib/formatLocale';
import { ScenarioRow } from '@/components/student/ScenarioRow';
import { ScenarioDetailSheet, type ScenarioSheetData } from '@/components/student/ScenarioDetailSheet';

function enter<T>(reducedAnimations: boolean, animation: T): T | undefined {
  return reducedAnimations ? undefined : animation;
}

type Scenario = { title: string; description: string; route: string };

const SCENARIO_ROUTES: Record<string, string> = {
  phone_call: "/scam-call/initial-call",
  whatsapp: "/scam-whatsapp/notification",
  marketplace: "/marketplace/selection",
};

type ClassroomWithAssignment = {
  classroom: Classroom;
  assignments: ClassroomAssignment[];
};

function hasDeadlinePassed(assignment: ClassroomAssignment, now = Date.now()) {
  if (!assignment.deadline) return false;
  const deadline = new Date(assignment.deadline).getTime();
  return !Number.isFinite(deadline) || deadline <= now;
}

export default function Index() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = useColors();
  const { alert } = useAppAlert();
  const { refreshProfile } = useAuth();
  const { reducedAnimations } = useReducedAnimations();
  const animationKey = useFocusAnimationKey();
  const { active: tourActive, step: tourStep, maybeAutoStart, goToStep, setJoinClassroomTextEntered } = useOnboarding();
  const { t, i18n } = useTranslation();
  const ALL_SCENARIOS: Record<string, Scenario> = {
    phone_call: {
      title: t('student.scenarioPhoneCallTitle'),
      description: t('student.scenarioPhoneCallDesc'),
      route: SCENARIO_ROUTES['phone_call']!,
    },
    whatsapp: {
      title: t('student.scenarioWhatsappTitle'),
      description: t('student.scenarioWhatsappDesc'),
      route: SCENARIO_ROUTES['whatsapp']!,
    },
    marketplace: {
      title: t('student.scenarioMarketplaceTitle'),
      description: t('student.scenarioMarketplaceDesc'),
      route: SCENARIO_ROUTES['marketplace']!,
    },
  };
  const [loading, setLoading] = useState(true);
  const [classroomsWithAssignments, setClassroomsWithAssignments] = useState<ClassroomWithAssignment[]>([]);
  const [hasClassroom, setHasClassroom] = useState<boolean | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  type SelectedScenario = ScenarioSheetData & {
  route: string;
  params: Record<string, string>;
};
const [selected, setSelected] = useState<SelectedScenario | null>(null);

  useEffect(() => {
    if (loading || hasClassroom === null) return;
    maybeAutoStart({ role: 'student', hasClassroom });
  }, [loading, hasClassroom, maybeAutoStart]);

  useEffect(() => {
    if (tourActive && tourStep === 'join_classroom' && hasClassroom === true) {
      goToStep('mock_assignment_intro');
    }
  }, [tourActive, tourStep, hasClassroom, goToStep]);

  const handleInviteCodeChange = (text: string) => {
    setInviteCode(text);
    if (tourActive && tourStep === 'join_classroom') {
      setJoinClassroomTextEntered(text.trim().length > 0);
    }
  };

  const fetchData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      let classes: Classroom[];
      try {
        classes = await listClassrooms();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 800));
        classes = await listClassrooms();
      }

      if (currentRequest !== requestId.current) return;

      if (classes.length === 0) {
        setHasClassroom(false);
        setClassroomsWithAssignments([]);
        setError(null);
        return;
      }

      const assignmentGroups = await Promise.all(
        classes.map(async (classroom) => ({
          classroom,
          assignments: await getClassroomAssignments(classroom.id),
        })),
      );
      if (currentRequest !== requestId.current) return;

      const withAssignments: ClassroomWithAssignment[] = [];
      for (const { classroom, assignments } of assignmentGroups) {
        const activeAssignments = assignments.filter(
          (assignment) => assignment.scenarios?.length > 0 && !hasDeadlinePassed(assignment),
        );
        if (activeAssignments.length > 0) {
          withAssignments.push({ classroom, assignments: activeAssignments });
        }
      }
      setHasClassroom(true);
      setClassroomsWithAssignments(withAssignments);
      setError(null);
    } catch (e) {
      if (currentRequest === requestId.current) {
        setError(e instanceof Error ? e.message : t('student.fallbackError'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
      return () => {
        requestId.current += 1;
      };
    }, [fetchData])
  );

  useEffect(() => {
    const deadlines = classroomsWithAssignments
      .flatMap(({ assignments }) => assignments)
      .map((assignment) => assignment.deadline ? new Date(assignment.deadline).getTime() : Number.NaN)
      .filter((deadline) => Number.isFinite(deadline) && deadline > Date.now());
    if (deadlines.length === 0) return;

    const nextDeadline = Math.min(...deadlines);
    const timeout = setTimeout(() => {
      const now = Date.now();
      setClassroomsWithAssignments((current) =>
        current
          .map(({ classroom, assignments }) => ({
            classroom,
            assignments: assignments.filter((assignment) => !hasDeadlinePassed(assignment, now)),
          }))
          .filter(({ assignments }) => assignments.length > 0),
      );
      void fetchData();
    }, Math.min(nextDeadline - Date.now() + 100, 2_147_000_000));

    return () => clearTimeout(timeout);
  }, [classroomsWithAssignments, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  const handleJoinClass = async () => {
    const code = inviteCode.trim();
    if (!code) { alert(t('student.alertEnterCodeTitle'), t('student.alertEnterCodeMsg')); return; }
    setJoining(true);
    try {
      const result = await redeemInvite(code);
      await refreshProfile();
      alert(t('student.alertJoinedTitle'), result.classroom ? t('student.alertJoinedInClass', { name: result.classroom.name }) : t('student.alertJoinedRedeemed'));
      setInviteCode('');
      setHasClassroom(null);
      setLoading(true);
      await fetchData();
      if (tourActive && tourStep === 'join_classroom') {
        goToStep('mock_assignment_intro');
      }
    } catch (e: any) {
      alert(t('student.alertErrorTitle'), e?.message || t('student.alertJoinFailed'));
    } finally { setJoining(false); }
  };

  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';

  const computeOverallProgress = () => {
    let totalAssigned = 0;
    let totalDone = 0;
    for (const { assignments } of classroomsWithAssignments) {
      for (const assignment of assignments) {
        for (const s of assignment.scenarios) {
          totalAssigned += s.quantity;
          totalDone += Math.min(s.progress?.completed || 0, s.quantity);
        }
      }
    }
    return { done: totalDone, total: totalAssigned };
  };
  const overallProgress = computeOverallProgress();

  const groupedCards = (() => {
    const map = new Map<
      string,
      {
        key: string;
        classroom: Classroom;
        deadline: string | null;
        rows: { item: AssignmentScenario; assignmentId: string; classroomId: string }[];
      }
    >();
    for (const { classroom, assignments } of classroomsWithAssignments) {
      for (const assignment of assignments) {
        const key = `${classroom.id}|${assignment.deadline ?? ""}`;
        let group = map.get(key);
        if (!group) {
          group = { key, classroom, deadline: assignment.deadline ?? null, rows: [] };
          map.set(key, group);
        }
        for (const item of assignment.scenarios) {
          group.rows.push({ item, assignmentId: assignment.id, classroomId: classroom.id });
        }
      }
    }
    return Array.from(map.values());
  })();

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && hasClassroom === null) {
    return (
      <View className={`flex-1 bg-background items-center justify-center px-6 ${isDark ? 'dark' : ''}`}>
        <Animated.View
          key={animationKey}
          entering={enter(reducedAnimations, FadeIn.duration(350))}
          className="items-center"
        >
          <Ionicons name="alert-circle-outline" size={52} color={colors.destructive} />
          <Text className="text-foreground text-lg font-bold mt-4 text-center">{t('student.errorTitle')}</Text>
          <Text className="text-muted-foreground mt-2 text-center">{error}</Text>
          <TouchableOpacity className="bg-primary px-5 py-3 rounded-xl mt-6" onPress={() => void fetchData()}>
            <Text className="text-primary-foreground font-bold">{t('common.tryAgain')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  if (hasClassroom === false) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-4 pt-4 gap-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View key={animationKey} className="gap-5">
          <Animated.View
            entering={enter(reducedAnimations, FadeInDown.duration(300))}
            className="flex-row justify-between items-start"
          >
            <View className="gap-1 flex-1 px-3">
              <Text className="text-2xl font-bold text-foreground text-center">{t('student.brand')}</Text>
            </View>
          </Animated.View>
          <Animated.View
            entering={enter(reducedAnimations, FadeIn.duration(400).delay(60))}
            className="items-center mt-8"
          >
            <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
            <Text className="text-foreground text-xl font-bold mt-6 text-center">{t('student.joinClassroomTitle')}</Text>
            <Text className="text-muted-foreground text-base mt-2 text-center px-4">
              {t('student.joinClassroomSubtitle')}
            </Text>
          </Animated.View>
            <Animated.View
              entering={enter(reducedAnimations, FadeInDown.duration(350).delay(120))}
              className="w-full mt-8 gap-4"
            >
              <OnboardingTarget id="join_classroom_input">
                <TextInput
                  className="bg-input text-foreground rounded-xl px-4 py-3.5 text-base"
                  placeholder={t('student.invitePlaceholder')}
                  placeholderTextColor={placeholderColor}
                  value={inviteCode}
                  onChangeText={handleInviteCodeChange}
                  autoCapitalize="characters"
                  editable={!joining}
                />
              </OnboardingTarget>
              <OnboardingTarget id="join_classroom_button">
                <TouchableOpacity className="bg-primary py-4 rounded-xl items-center" onPress={handleJoinClass} disabled={joining}>
                  {joining ? <ActivityIndicator size="small" color={colors.primary} /> : <Text className="text-primary-foreground font-bold text-lg">{t('student.joinClassButton')}</Text>}
                </TouchableOpacity>
              </OnboardingTarget>
            </Animated.View>
          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  if (classroomsWithAssignments.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-4 gap-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View key={animationKey} className="gap-5">
          <Animated.View
            entering={enter(reducedAnimations, FadeInDown.duration(300))}
            className="flex-row justify-between items-start"
          >
            <View className="gap-1 flex-1 px-3">
              <Text className="text-2xl font-bold text-foreground text-center">{t('student.brand')}</Text>
            </View>
          </Animated.View>
          {tourActive && tourStep === 'mock_assignment_intro' && <MockAssignmentCard />}
          <Animated.View
            entering={enter(reducedAnimations, FadeIn.duration(400).delay(80))}
            className="items-center mt-8"
          >
            <Ionicons name="hourglass-outline" size={64} color={colors.mutedForeground} />
            <Text className="text-foreground text-xl font-bold mt-6 text-center">{t('student.waitingTitle')}</Text>
            <Text className="text-muted-foreground text-base mt-2 text-center px-4">
              {t('student.waitingSubtitle')}
            </Text>
            <Animated.View entering={enter(reducedAnimations, ZoomIn.duration(450).delay(160))}>
              <Image source={CatPlayful} style={{ width: 200, height: 200 }} />
            </Animated.View>
          </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-4 gap-5"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
      <View key={animationKey} className="gap-5">
      <Animated.View
        entering={enter(reducedAnimations, FadeInDown.duration(320))}
        className="flex-row items-center gap-4"
      >
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-foreground">
            {t('student.welcomeTitle')}
          </Text>
          <Text className="text-muted-foreground">
            {t('student.welcomeSubtitle')}
          </Text>
        </View>
        <Animated.View entering={enter(reducedAnimations, ZoomIn.duration(450).delay(80))}>
          <Image
            source={CatChubby}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>

      {tourActive && tourStep === 'mock_assignment_intro' && <MockAssignmentCard />}

      {overallProgress.total > 0 && (() => {
        const pct = Math.round((overallProgress.done / overallProgress.total) * 100);
        const complete = pct >= 100;
        const accent = complete ? colors.success : colors.primary;
        const tone = complete ? 'bg-success' : 'bg-primary';

        return (
          <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(100))}>
            <Card style={{ borderLeftWidth: 4, borderLeftColor: accent, overflow: 'hidden' }}>
              <CardContent className="gap-3 py-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: `${accent}22` }}
                    >
                      <Ionicons
                        name={complete ? 'trophy' : 'sparkles'}
                        size={20}
                        color={accent}
                      />
                    </View>
                    <View className="gap-0.5">
                      <Text className="font-bold text-foreground text-base">{t('student.progressLabel')}</Text>
                      <Text className="text-sm text-muted-foreground">
                        {complete
                          ? t('student.allCaughtUp')
                          : t('student.progressCount', { done: overallProgress.done, total: overallProgress.total })}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-2xl font-bold" style={{ color: accent }}>{pct}%</Text>
                </View>

                <Progress
                  value={pct}
                  className="h-3 bg-muted"
                  indicatorClassName={tone}
                  animate={!reducedAnimations}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: pct }}
                />
              </CardContent>
            </Card>
          </Animated.View>
        );
      })()}

        {groupedCards.map((group, groupIdx) => (
          <Animated.View
            key={group.key}
            entering={enter(reducedAnimations, FadeInDown.duration(320).delay(140 + groupIdx * 70))}
          >
          <Card>
            <CardContent className="gap-3 py-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-foreground text-lg font-bold">{group.classroom.name}</Text>
                {group.deadline && (
                  <View className="bg-primary/10 px-3 py-1 rounded-full">
                    <Text className="text-primary text-xs font-bold">
                      {t('student.dueLabel', {
                        date: formatAppDate(group.deadline, i18n.language, {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        }),
                      })}
                    </Text>
                  </View>
                )}
              </View>

              <View className="gap-2.5">
                {group.rows.map((row, tileIdx) => {
                  const item = row.item;
                  const scenario = ALL_SCENARIOS[item.type];
                  const resolvedTitle = scenario?.title ?? t('student.scenarioUnknownType', {
                    type: item.type.replace(/_/g, ' '),
                  });
                  const resolvedDescription = scenario?.description ?? '';
                  const resolvedRoute = scenario?.route ?? '';

                  const done = Math.min(item.progress?.completed || 0, item.quantity);
                  const attemptsUsed = item.progress?.attempts || 0;
                  const fullyDone = item.progress?.complete || done >= item.quantity;
                  const attemptsExhausted = fullyDone || Boolean(item.progress?.maxAttemptsReached);
                  const pct = item.quantity > 0 ? Math.round((done / item.quantity) * 100) : 0;
                  const remaining = item.maxAttempts != null ? Math.max(0, item.maxAttempts - attemptsUsed) : null;

                  return (
                    <ScenarioRow
                      key={item.itemId}
                      type={item.type}
                      number={tileIdx + 1}
                      pct={pct}
                      fullyDone={fullyDone}
                      attemptsExhausted={attemptsExhausted}
                      attemptsUsed={attemptsUsed}
                      maxAttempts={item.maxAttempts ?? null}
                      index={tileIdx}
                      baseDelay={140 + groupIdx * 70}
                      reducedAnimations={reducedAnimations}
                      onOpen={() => {
                        if (!resolvedRoute) return;
                        setSelected({
                          type: item.type,
                          title: resolvedTitle,
                          description: resolvedDescription,
                          done,
                          quantity: item.quantity,
                          fullyDone,
                          attemptsExhausted,
                          attemptsUsed,
                          maxAttempts: item.maxAttempts ?? null,
                          remaining,
                          route: resolvedRoute,
                          params: {
                            classroomId: row.classroomId,
                            assignmentId: row.assignmentId,
                            assignmentItemId: item.itemId,
                            scenarioId: item.scenarioId || item.id,
                          },
                        });
                      }}
                    />
                  );
                })}
              </View>
            </CardContent>
          </Card>
          </Animated.View>
        ))}
      </View>
      </ScrollView>
          <ScenarioDetailSheet
        data={selected}
        reducedAnimations={reducedAnimations}
        onClose={() => setSelected(null)}
        onStart={() => {
          if (!selected) return;
          const pathname = selected.route;
          const params = Object.fromEntries(
            Object.entries(selected.params).map(([key, value]) => [key, String(value ?? '')]),
          );
          setSelected(null);
          setTimeout(() => {
            router.push({ pathname: pathname as any, params });
          }, 50);
        }}
      />
    </SafeAreaView>
  );
}