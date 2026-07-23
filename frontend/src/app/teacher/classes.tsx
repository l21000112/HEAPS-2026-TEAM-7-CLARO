import "../../../global.css";
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Pressable,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Text } from "@/components/ui/text";
import { useTheme } from "@/context/themeContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from 'expo-router';
import {
  listClassrooms,
  listClassroomStudents,
  createClassroom,
  createClassroomInvite,
  type Classroom,
} from '@/api/classrooms';
import { getApiErrorMessage } from '@/api/client';
import { useTranslation } from 'react-i18next';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { useFocusAnimationKey } from '@/lib/useFocusAnimationKey';
import { useColors } from '@/lib/useColors';
import { useAppAlert } from '@/context/AppAlertContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { StatCard } from '@/components/teacher/statcard';

type ClassroomWithStats = Classroom & { studentCount: number };

function enter<T>(reducedAnimations: boolean, animation: T): T | undefined {
  return reducedAnimations ? undefined : animation;
}

function formatClassDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ClassesScreen() {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { alert } = useAppAlert();
  const { active: tourActive, step: tourStep, advanceFrom } = useOnboarding();
  const colors = useColors();
  const { reducedAnimations } = useReducedAnimations();
  const animationKey = useFocusAnimationKey();
  const [classrooms, setClassrooms] = useState<ClassroomWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [creatingInviteId, setCreatingInviteId] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchData = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const classes = await listClassrooms();
      const withStats = await Promise.all(
        classes.map(async (classroom) => {
          try {
            const students = await listClassroomStudents(classroom.id);
            return { ...classroom, studentCount: students.length };
          } catch {
            return { ...classroom, studentCount: 0 };
          }
        }),
      );
      if (currentRequest !== requestId.current) return;
      setClassrooms(withStats);
      setError(null);
    } catch (e: unknown) {
      if (currentRequest === requestId.current) {
        setError(e instanceof Error ? e.message : t('teacher.fallbackLoadError'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
      return () => {
        requestId.current += 1;
      };
    }, [fetchData]),
  );

  const totalStudents = useMemo(
    () => classrooms.reduce((sum, c) => sum + c.studentCount, 0),
    [classrooms],
  );

  const copyClassroomInvite = async (classroomId: string, classroomName: string) => {
    setCreatingInviteId(classroomId);
    try {
      const invite = await createClassroomInvite(classroomId);
      const code = invite?.displayCode || invite?.code || '';
      if (!code) throw new Error(t('teacher.inviteCodeMissingError'));
      await Clipboard.setStringAsync(code);
      alert(t('teacher.alertCopiedTitle'), t('teacher.alertCopiedMsg', { name: classroomName, code }));
      if (tourActive && tourStep === 'classes_copy_invite') {
        advanceFrom('classes_copy_invite', 'classes_back');
      }
    } catch (e) {
      alert(
        t('teacher.alertInviteFailedTitle'),
        getApiErrorMessage(e, t('teacher.alertInviteFailedMsg')),
      );
    } finally {
      setCreatingInviteId(null);
    }
  };

  const handleCreateClassroom = () => {
    setNewClassName('');
    setCreateModalVisible(true);
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
      const newClass = await createClassroom({ name });
      setClassrooms((prev) =>
        prev.some((item) => item.id === newClass.id)
          ? prev
          : [...prev, { ...newClass, studentCount: 0 }],
      );
      setCreateModalVisible(false);
      setNewClassName('');
      await fetchData();
    } catch {
      alert(t('teacher.alertCreateFailedTitle'), t('teacher.alertCreateFailedMsg'));
    } finally {
      setCreating(false);
    }
  };

  const studentLabel = (count: number) =>
    count === 1
      ? t('teacher.classesStudentCountOne')
      : t('teacher.classesStudentCount', { count });

  if (loading) {
    return (
      <View className={`flex-1 bg-background px-5 pt-16 items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t('teacher.loadingClasses')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchData()}
            tintColor={colors.primary}
          />
        )}
      >
        <View key={animationKey} className="gap-5">
          <Animated.View
            entering={enter(reducedAnimations, FadeIn.duration(280))}
            className="flex-row items-start justify-between gap-3"
          >
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">{t('teacher.myClassrooms')}</Text>
              <Text className="text-muted-foreground text-sm mt-1">{t('teacher.classesSubtitle')}</Text>
            </View>
            <TouchableOpacity
              className="bg-primary px-4 py-2.5 rounded-2xl flex-row items-center gap-2"
              onPress={handleCreateClassroom}
              disabled={creating}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text className="text-primary-foreground font-bold text-sm">{t('teacher.createButton')}</Text>
            </TouchableOpacity>
          </Animated.View>

          {error ? (
            <Animated.View
              entering={enter(reducedAnimations, FadeInDown.duration(300).delay(60))}
              className="bg-destructive/10 border border-destructive/30 p-4 rounded-2xl flex-row items-start gap-3"
            >
              <Feather name="alert-circle" size={18} color={colors.destructive} />
              <View className="flex-1">
                <Text className="text-destructive text-sm">{error}</Text>
                <TouchableOpacity className="mt-2 self-start" onPress={() => void fetchData(true)}>
                  <Text className="text-primary font-bold text-sm">{t('teacher.tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : null}

          {classrooms.length > 0 ? (
            <Animated.View
              entering={enter(reducedAnimations, FadeInDown.duration(320).delay(80))}
              className="flex-row gap-3"
            >
              <StatCard
                value={String(classrooms.length)}
                label={t('teacher.profileStatClasses')}
                accentClass="text-accent-classes"
              />
              <StatCard
                value={String(totalStudents)}
                label={t('teacher.statStudents')}
                accentClass="text-accent-assign"
              />
            </Animated.View>
          ) : null}

          {classrooms.length > 0 ? (
            <Animated.View
              entering={enter(reducedAnimations, FadeInDown.duration(320).delay(120))}
              className="bg-card border border-border rounded-2xl px-4 py-3 flex-row items-center gap-3"
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${colors.accentClasses}22` }}
              >
                <Feather name="link-2" size={18} color={colors.accentClasses} />
              </View>
              <Text className="text-muted-foreground text-xs flex-1 leading-5">
                {t('teacher.classesInviteHint')}
              </Text>
            </Animated.View>
          ) : null}

          {classrooms.length === 0 ? (
            <Animated.View
              entering={enter(reducedAnimations, ZoomIn.duration(420).delay(100))}
              className="bg-card border border-border rounded-3xl px-6 py-10 items-center gap-4 overflow-hidden"
            >
              <View
                className="absolute -top-10 -right-8 w-32 h-32 rounded-full opacity-25"
                style={{ backgroundColor: `${colors.accentClasses}55` }}
              />
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: `${colors.accentClasses}18` }}
              >
                <Feather name="users" size={36} color={colors.accentClasses} />
              </View>
              <View className="items-center gap-2">
                <Text className="text-foreground text-xl font-bold text-center">
                  {t('teacher.classesEmptyTitle')}
                </Text>
                <Text className="text-muted-foreground text-sm text-center leading-5 px-2">
                  {t('teacher.classesEmptyDesc')}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-primary px-8 py-3.5 rounded-2xl flex-row items-center gap-2 mt-2"
                onPress={handleCreateClassroom}
                activeOpacity={0.7}
              >
                <Feather name="plus-circle" size={18} color={colors.primaryForeground} />
                <Text className="text-primary-foreground font-bold text-base">
                  {t('teacher.createFirstClass')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View className="gap-3">
              {classrooms.map((c, index) => {
                const copyButton = (
                  <TouchableOpacity
                    className="bg-primary flex-row items-center justify-center gap-2 py-3 rounded-xl mt-3"
                    onPress={() => copyClassroomInvite(c.id, c.name)}
                    disabled={creatingInviteId === c.id}
                    activeOpacity={0.7}
                  >
                    {creatingInviteId === c.id ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <>
                        <Feather name="copy" size={14} color={colors.primaryForeground} />
                        <Text className="text-primary-foreground font-bold text-sm">
                          {t('teacher.copyInvite')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );

                return (
                  <Animated.View
                    key={c.id}
                    entering={enter(reducedAnimations, FadeInDown.duration(320).delay(140 + index * 55))}
                    className="bg-card border border-border rounded-2xl p-4"
                  >
                    <View className="flex-row items-start gap-3">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: `${colors.accentClasses}22` }}
                      >
                        <Feather name="book-open" size={22} color={colors.accentClasses} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-foreground font-bold text-lg">{c.name}</Text>
                        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <View className="flex-row items-center gap-1">
                            <Feather name="users" size={12} color={colors.mutedForeground} />
                            <Text className="text-muted-foreground text-xs">{studentLabel(c.studentCount)}</Text>
                          </View>
                          <Text className="text-muted-foreground text-xs">|</Text>
                          <View className="flex-row items-center gap-1">
                            <Feather name="calendar" size={12} color={colors.mutedForeground} />
                            <Text className="text-muted-foreground text-xs">
                              {t('teacher.classesCreatedPrefix', { date: formatClassDate(c.createdAt) })}
                            </Text>
                          </View>
                        </View>
                        {c.description ? (
                          <Text className="text-muted-foreground text-sm mt-2 leading-5" numberOfLines={2}>
                            {c.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {index === 0 ? (
                      <OnboardingTarget id="classes_copy_invite">{copyButton}</OnboardingTarget>
                    ) : (
                      copyButton
                    )}
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!creating) setCreateModalVisible(false);
        }}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => {
            if (!creating) setCreateModalVisible(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="w-full items-center px-6"
          >
            <Pressable onPress={() => {}} className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm">
              <View className="flex-row items-center gap-3 mb-4">
                <View
                  className="w-11 h-11 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${colors.accentClasses}22` }}
                >
                  <Feather name="plus" size={20} color={colors.accentClasses} />
                </View>
                <Text className="text-foreground text-lg font-bold flex-1">
                  {t('teacher.createClassroomTitle')}
                </Text>
              </View>
              <TextInput
                className="bg-input text-foreground rounded-xl px-4 py-3 text-base mb-5 border border-border"
                placeholder={t('teacher.classroomNamePlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={newClassName}
                onChangeText={setNewClassName}
                autoFocus
                editable={!creating}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl items-center bg-muted"
                  onPress={() => setCreateModalVisible(false)}
                  disabled={creating}
                >
                  <Text className="text-muted-foreground font-bold">{t('teacher.cancelButton')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl items-center bg-primary"
                  onPress={confirmCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text className="text-primary-foreground font-bold">{t('teacher.createButtonPlain')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
