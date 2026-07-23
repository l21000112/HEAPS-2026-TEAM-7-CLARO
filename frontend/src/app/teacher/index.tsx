import "../../../global.css";
import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '@/context/AuthContext';
import { useTheme } from "@/context/themeContext";
import { Feather } from '@expo/vector-icons';
import { useAppAlert } from '@/context/AppAlertContext';
import { listClassrooms, listClassroomStudents, getStudentResults, createClassroom } from '@/api/classrooms';
import { ActionTile } from "@/components/teacher/actiontile";
import { StatCard } from "@/components/teacher/statcard";
import { useColors } from "@/lib/useColors";
import { CatChill,CatCuddly,CatHappy } from "@/lib/images";
import { useTranslation } from 'react-i18next';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { useOnboarding } from '@/context/OnboardingContext';

// Non-judgmental on the teacher's own screen - happy when trending well, neutral otherwise.
function pickCat(avg: string) {
  if (avg === '--') return CatChill;
  const n = parseInt(avg, 10);
  if (n >= 80) return CatHappy;
  if (n >= 50) return CatCuddly;
  return CatChill;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { alert } = useAppAlert();
  const {
    active: tourActive,
    step: tourStep,
    maybeAutoStart,
    goToStep,
    advanceFrom,
    setClassroomNameEntered,
  } = useOnboarding();
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('teacher.greetingMorning');
    if (h < 18) return t('teacher.greetingAfternoon');
    return t('teacher.greetingEvening');
  };
  const [hasClassrooms, setHasClassrooms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const colors = useColors();
  const [classroomStats, setClassroomStats] = useState({
    students: 0,
    scenariosCompleted: 0,
    avgSuccessRate: '--',
  });

  const fetchDashboardData = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoading(true);

    try {
      const classes = await listClassrooms();
      let totalStudents = 0;
      let totalAttempts = 0;
      let totalCorrect = 0;

      if (classes.length > 0) {
        const classroomStudents = await Promise.all(
          classes.map(async (classroom) => ({
            classroomId: classroom.id,
            students: await listClassroomStudents(classroom.id),
          })),
        );
        totalStudents = classroomStudents.reduce((sum, item) => sum + item.students.length, 0);

        const results = await Promise.all(
          classroomStudents.flatMap(({ classroomId, students }) =>
            students.map((student) =>
              getStudentResults(classroomId, student.studentUid, { includeSummary: true }),
            ),
          ),
        );
        for (const result of results) {
          if (result.summary) {
            totalAttempts += result.summary.totalAttempts;
            totalCorrect += result.summary.correctAttempts;
          }
        }
      }

      if (currentRequest !== requestId.current) return;
      setHasClassrooms(classes.length > 0);
      setClassroomStats({
        students: totalStudents,
        scenariosCompleted: totalAttempts,
        avgSuccessRate: totalAttempts > 0
          ? `${Math.max(0, Math.min(100, Math.round((totalCorrect / totalAttempts) * 100)))}%`
          : '--',
      });
      setError(null);
    } catch (e: any) {
      if (currentRequest === requestId.current) {
        setError(e?.message || t('teacher.fallbackDashboardError'));
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboardData();
      return () => {
        requestId.current += 1;
      };
    }, [fetchDashboardData]),
  );

  useEffect(() => {
    if (loading || hasClassrooms === null) return;
    maybeAutoStart({ role: 'teacher', hasClassrooms });
  }, [loading, hasClassrooms, maybeAutoStart]);

  // After creating a class during the tour, move onto the action tiles.
  useEffect(() => {
    if (tourActive && tourStep === 'name_classroom' && hasClassrooms) {
      goToStep('assign_homework_tile');
    }
  }, [tourActive, tourStep, hasClassrooms, goToStep]);

  useEffect(() => {
    if (tourActive && tourStep === 'create_first_class' && hasClassrooms) {
      goToStep('assign_homework_tile');
    }
  }, [tourActive, tourStep, hasClassrooms, goToStep]);

  const openCreateModal = () => {
    setNewClassName('');
    setClassroomNameEntered(false);
    setCreateModalVisible(true);
    if (tourActive && tourStep === 'create_first_class') {
      goToStep('name_classroom');
    }
  };

  const confirmCreate = async () => {
    if (creating) return;
    const name = newClassName.trim();
    if (!name) {
      alert(t('teacher.alertEnterNameTitle'), t('teacher.alertEnterNameMsg'));
      return;
    }
    setCreating(true);
    try {
      await createClassroom({ name });
      setCreateModalVisible(false);
      setNewClassName('');
      setClassroomNameEntered(false);
      if (tourActive && (tourStep === 'name_classroom' || tourStep === 'create_first_class')) {
        goToStep('assign_homework_tile');
      }
      await fetchDashboardData();
    } catch (e) {
      alert(t('teacher.alertCreateFailedTitle'), t('teacher.alertCreateFailedMsg'));
    } finally {
      setCreating(false);
    }
  };

  const placeholderColor = colors.placeholder;

  const createModal = (
    <Modal
      visible={createModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!creating) {
          setCreateModalVisible(false);
          if (tourActive && tourStep === 'name_classroom') {
            goToStep('create_first_class');
          }
        }
      }}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-center items-center"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          backgroundColor:
            tourActive && tourStep === 'name_classroom' ? 'transparent' : 'rgba(0,0,0,0.6)',
        }}
      >
        <OnboardingTarget id="name_classroom_modal">
          <View className="bg-card mx-6 rounded-2xl p-6 w-80">
            <Text className="text-foreground text-lg font-bold mb-4">{t('teacher.createClassroomTitle')}</Text>
            <OnboardingTarget id="name_classroom_input">
              <TextInput
                className="bg-input text-foreground rounded-xl px-4 py-3 text-base mb-4"
                placeholder={t('teacher.classroomNamePlaceholder')}
                placeholderTextColor={placeholderColor}
                value={newClassName}
                onChangeText={(text) => {
                  setNewClassName(text);
                  if (tourActive && tourStep === 'name_classroom') {
                    setClassroomNameEntered(text.trim().length > 0);
                  }
                }}
                autoFocus
                editable={!creating}
              />
            </OnboardingTarget>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                className="px-4 py-2.5 rounded-lg"
                onPress={() => {
                  setCreateModalVisible(false);
                  if (tourActive && tourStep === 'name_classroom') {
                    goToStep('create_first_class');
                  }
                }}
                disabled={creating}
              >
                <Text className="text-muted-foreground font-bold">{t('teacher.cancelButton')}</Text>
              </TouchableOpacity>
              <OnboardingTarget id="name_classroom_create">
                <TouchableOpacity
                  className="bg-primary px-4 py-2.5 rounded-lg"
                  onPress={confirmCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text className="text-primary-foreground font-bold">{t('teacher.createButtonPlain')}</Text>
                  )}
                </TouchableOpacity>
              </OnboardingTarget>
            </View>
          </View>
        </OnboardingTarget>
        {tourActive && tourStep === 'name_classroom' ? (
          <OnboardingOverlay variant="modal" />
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t('teacher.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-circle" size={48} color={colors.destructive} />
          <Text className="text-destructive text-lg font-bold mt-4 text-center">{error}</Text>
          <TouchableOpacity
            className="bg-primary px-5 py-3 rounded-xl mt-6"
            onPress={() => void fetchDashboardData(true)}
          >
            <Text className="text-primary-foreground font-bold">{t('teacher.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasClassrooms) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
        <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4 pb-4 gap-5">
          <View className="items-center mt-12">
            <Image
              source={CatChill}
              style={{ width: 96, height: 96 }}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel={t('teacher.mascotLabel')}
            />
            <Text className="text-foreground text-2xl font-bold mt-6 text-center">
              {t('teacher.emptyWelcome', { name: profile?.displayName || t('teacher.emptyFallbackName') })}
            </Text>
            <Text className="text-muted-foreground text-base mt-2 text-center px-4">
              {t('teacher.emptySubtitle')}
            </Text>

            <OnboardingTarget id="create_first_class" className="mt-8">
              <TouchableOpacity
                className="bg-primary px-8 py-4 rounded-2xl flex-row items-center gap-3"
                onPress={openCreateModal}
                activeOpacity={0.7}
              >
                <Feather name="plus-circle" size={22} color={colors.primaryForeground} />
                <Text className="text-primary-foreground font-bold text-lg">{t('teacher.createFirstClass')}</Text>
              </TouchableOpacity>
            </OnboardingTarget>

            <TouchableOpacity
              className="mt-4"
              onPress={() => router.push('/teacher/classes' as Href)}
            >
              <Text className="text-primary font-medium underline">{t('teacher.goToClasses')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-secondary border border-border mt-3 px-6 py-3 rounded-2xl flex-row items-center gap-3"
              onPress={() => router.push('/teacher/scenarios' as Href)}
              activeOpacity={0.7}
            >
              <Feather name="book-open" size={18} color={colors.foreground} />
              <Text className="text-foreground font-medium text-base">
                {t('teacher.browseScenarios')}
              </Text>
            </TouchableOpacity>
          </View>

          {createModal}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
  <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-4 pb-4 gap-5">
      <View className="flex-row items-center gap-4">
        <Image
          source={pickCat(classroomStats.avgSuccessRate)}
          style={{ width: 64, height: 64 }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('teacher.mascotLabel')}
        />
        <View className="flex-1">
          <Text className="text-primary text-sm uppercase tracking-widest font-bold mb-1">
            {t('teacher.dashboardBadge')}
          </Text>
          <Text className="text-foreground text-2xl font-bold">
            {greeting()}, {profile?.displayName || t('teacher.emptyFallbackName')}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3">
        <StatCard value={String(classroomStats.students)} label={t('teacher.statStudents')} accentClass="text-accent-classes" />
        <StatCard value={String(classroomStats.scenariosCompleted)} label={t('teacher.statAttempts')} accentClass="text-accent-scenarios" />
        <StatCard value={classroomStats.avgSuccessRate} label={t('teacher.statAvgSuccess')} accentClass="text-accent-analytics" />
      </View>

      <View className="flex-row flex-wrap justify-between">
        <OnboardingTarget id="assign_homework_tile" className="w-[48%] mb-4">
          <ActionTile
            icon="clipboard"
            label={t('teacher.actionAssignHomework')}
            accentClass="bg-accent-assign/15"
            iconColor={colors.accentAssign}
            onPress={() => {
              advanceFrom('assign_homework_tile', 'assign_homework_back');
              router.push('/teacher/assign-homework' as Href);
            }}
          />
        </OnboardingTarget>
        <OnboardingTarget id="scenarios_tile" className="w-[48%] mb-4">
          <ActionTile
            icon="book-open"
            label={t('teacher.actionCustomScenarios')}
            accentClass="bg-accent-scenarios/15"
            iconColor={colors.accentScenarios}
            onPress={() => {
              advanceFrom('scenarios_tile', 'scenarios_create');
              router.push('/teacher/scenarios' as Href);
            }}
          />
        </OnboardingTarget>
        <OnboardingTarget id="classes_tile" className="w-[48%] mb-4">
          <ActionTile
            icon="users"
            label={t('teacher.actionClasses')}
            accentClass="bg-accent-classes/15"
            iconColor={colors.accentClasses}
            onPress={() => {
              advanceFrom('classes_tile', 'classes_copy_invite');
              router.push('/teacher/classes' as Href);
            }}
          />
        </OnboardingTarget>
        <OnboardingTarget id="analytics_tile" className="w-[48%] mb-4">
          <ActionTile
            icon="bar-chart-2"
            label={t('teacher.actionAnalytics')}
            accentClass="bg-accent-analytics/15"
            iconColor={colors.accentAnalytics}
            onPress={() => {
              advanceFrom('analytics_tile', 'analytics_intro');
              router.push('/teacher/analytics' as Href);
            }}
          />
        </OnboardingTarget>
      </View>
    </ScrollView>
    {createModal}
  </SafeAreaView>
);
}
