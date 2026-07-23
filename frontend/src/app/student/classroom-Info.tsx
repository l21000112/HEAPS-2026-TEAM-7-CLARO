import "../../../global.css";
import { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, ZoomIn, BounceIn } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/themeContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { listClassrooms, listClassroomStudents, type Classroom, type ClassroomStudent } from "@/api/classrooms";
import { CatHappy } from "@/lib/images";
import { useFocusEffect } from "expo-router";
import { useFocusAnimationKey } from "@/lib/useFocusAnimationKey";
import { useTranslation } from "react-i18next";
import { colors } from "@/styles/global";
function enter<T>(reducedAnimations: boolean, animation: T): T | undefined {
  return reducedAnimations ? undefined : animation;
}

const AVATAR_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#38BDF8", "#A855F7", "#F97316"];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function displayNameOf(student: ClassroomStudent, fallback: string) {
  return student.displayName?.trim() || student.email?.trim() || fallback;
}

// Count-up number driven by rAF for web + native parity
function AnimatedNumber({
  value,
  duration = 800,
  className,
  animate = true,
}: {
  value: number;
  duration?: number;
  className?: string;
  animate?: boolean;
}) {
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }

    let raf: ReturnType<typeof requestAnimationFrame>;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, animate]);

  return <Text className={className}>{display}</Text>;
}

function CardBlobs({ colors }: { colors: [string, string] }) {
  return (
    <>
      <View
        style={{
          position: "absolute",
          top: -50,
          right: -36,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: colors[0],
          opacity: 0.16,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -40,
          left: -30,
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: colors[1],
          opacity: 0.14,
        }}
      />
    </>
  );
}

type ClassroomInfo = {
  classroom: Classroom;
  students: ClassroomStudent[];
  rosterUnavailable: boolean;
};

export default function ClassroomInfoScreen() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const { reducedAnimations } = useReducedAnimations();
  const animate = !reducedAnimations;
  const animationKey = useFocusAnimationKey();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classroomInfos, setClassroomInfos] = useState<ClassroomInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const classes = await listClassrooms();
      const infos = await Promise.all(
        classes.map(async (classroom) => {
          try {
            const roster = await listClassroomStudents(classroom.id);
            return { classroom, students: roster, rosterUnavailable: false };
          } catch (e) {
            console.warn(`[student/classroom-Info] couldn't load roster for classroom ${classroom.id}:`, e);
            return { classroom, students: [], rosterUnavailable: true };
          }
        }),
      );
      setClassroomInfos(infos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('student.fallbackClassroomError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData, profile?.uid])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t('student.loadingClassroom')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-4 gap-6"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        <View key={animationKey} className="gap-6">
        <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(300))}>
          <Text className="text-2xl font-bold text-foreground">{t('student.classroomTitle')}</Text>
        </Animated.View>

        {error && classroomInfos.length === 0 ? (
          <Animated.View entering={enter(reducedAnimations, FadeIn.duration(400))} className="items-center justify-center py-10 px-4">
            <Feather name="alert-circle" size={48} color="#EF4444" />
            <Text className="text-foreground text-lg font-bold mt-4">{t('student.couldNotLoadClassroom')}</Text>
            <Text className="text-muted-foreground text-sm text-center mt-2">
              {t('student.couldNotLoadClassroomRetry')}
            </Text>
          </Animated.View>
        ) : classroomInfos.length === 0 ? (
          <Animated.View entering={enter(reducedAnimations, FadeIn.duration(400))} className="items-center justify-center py-10 px-4">
            <FontAwesome6 name="school" size={48} color="#6B7280" />
            <Text className="text-foreground text-lg font-bold mt-4">{t('student.noClassroomTitle')}</Text>
            <Text className="text-muted-foreground text-sm text-center mt-2">
              {t('student.noClassroomDesc')}
            </Text>
          </Animated.View>
        ) : (
          <>
            {classroomInfos.map((info) => {
              const { classroom, students, rosterUnavailable } = info;
              const sortedStudents = [...students].sort((a, b) =>
                displayNameOf(a, t('student.classmateFallback')).localeCompare(
                  displayNameOf(b, t('student.classmateFallback')),
                  undefined,
                  { sensitivity: 'base' },
                ),
              );
              const teacherName = classroom.teacherDisplayName?.trim() || classroom.teacherEmail || t('student.teacherFallback');
              const teacherSubtitle =
                classroom.teacherDisplayName?.trim() && classroom.teacherEmail ? classroom.teacherEmail : null;
              const teacherColor = teacherName ? colorForName(teacherName) : '#6366F1';
              return (
                <View key={classroom.id} className="gap-6">
            <Animated.View
              entering={enter(reducedAnimations, FadeIn.duration(350))}
              className="bg-input p-6 rounded-3xl relative overflow-hidden"
            >
              <CardBlobs colors={["#6366F1", "#EC4899"]} />
              <View className="flex-row items-center gap-3 mb-1">
                <Animated.View
                  entering={enter(reducedAnimations, ZoomIn.duration(450).delay(100))}
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{
                    backgroundColor: "#6366F1",
                    shadowColor: "#6366F1",
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Feather name="book-open" size={24} color="#FFFFFF" />
                </Animated.View>
                <View className="flex-1">
                  <Text className="text-foreground text-xl font-bold" numberOfLines={1}>
                    {classroom.name}
                  </Text>
                  {!!classroom.description && (
                    <Text className="text-muted-foreground text-sm mt-0.5" numberOfLines={2}>
                      {classroom.description}
                    </Text>
                  )}
                  <Image source={CatHappy} style={{ width: 200, height: 200, position: "absolute", right: -40, top: 20, opacity: 0.9 }} />
                </View>
              </View>
              <Animated.View
                entering={enter(reducedAnimations, BounceIn.duration(500).delay(250))}
                className="flex-row items-center gap-1.5 bg-background self-start px-3 py-1.5 rounded-xl mt-3"
              >
                <Feather name="users" size={12} color="#9CA3AF" />
                <Text className="text-muted-foreground text-xs">
                  <AnimatedNumber
                    value={students.length}
                    className="text-muted-foreground text-xs font-semibold"
                    animate={animate}
                  />{" "}
                  {students.length === 1 ? t('student.studentCountSingular', { count: students.length }) : t('student.studentCountPlural', { count: students.length })}
                </Text>
              </Animated.View>
            </Animated.View>

            <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(100))}>
              <View className="bg-input p-4 rounded-2xl flex-row items-center gap-3 relative overflow-hidden">
                <CardBlobs colors={[teacherColor, teacherColor]} />
                <Animated.View
                  entering={enter(reducedAnimations, ZoomIn.duration(450).delay(150))}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: teacherColor,
                    shadowColor: teacherColor,
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <FontAwesome6 name="user-tie" size={24} color="#FFFFFF" />
                </Animated.View>
                <View className="flex-1">
                  <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
                    {teacherName}
                  </Text>
                  {!!teacherSubtitle && (
                    <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>
                      {teacherSubtitle}
                    </Text>
                  )}
                </View>
                <View className="bg-primary/15 px-2.5 py-1 rounded-full">
                  <Text className="text-primary text-xs font-semibold">{t('student.teacherBadge')}</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(180))}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-foreground text-lg font-bold">{t('student.classmatesTitle')}</Text>
                <Animated.View
                  entering={enter(reducedAnimations, BounceIn.duration(450).delay(350))}
                  className="bg-primary/10 px-3 py-1 rounded-full"
                >
                  <AnimatedNumber value={students.length} className="text-primary text-xs font-bold" animate={animate} />
                </Animated.View>
              </View>

              {rosterUnavailable ? (
                <View className="bg-input p-4 rounded-2xl flex-row items-center gap-2.5">
                  <Feather name="wifi-off" size={16} color="#9CA3AF" />
                  <Text className="text-muted-foreground text-sm flex-1">
                    {t('student.rosterUnavailable')}
                  </Text>
                </View>
              ) : sortedStudents.length === 0 ? (
                <View className="bg-input p-4 rounded-2xl flex-row items-center gap-2.5">
                  <Feather name="user-plus" size={16} color="#9CA3AF" />
                  <Text className="text-muted-foreground text-sm flex-1">
                    {t('student.onlyStudentHere')}
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {sortedStudents.map((student, idx) => {
                    const name = displayNameOf(student, t('student.classmateFallback'));
                    const isSelf = student.studentUid === profile?.uid;
                    const color = colorForName(name);
                    return (
                      <Animated.View
                        key={student.studentUid}
                        entering={enter(reducedAnimations, FadeInDown.duration(320).delay(220 + idx * 45))}
                        className="flex-row items-center gap-3 pl-0 pr-3.5 py-3 bg-input rounded-xl overflow-hidden"
                        style={isSelf ? { borderWidth: 2, borderColor: `${color}60` } : undefined}
                      >
                        <View style={{ width: 4, alignSelf: "stretch", backgroundColor: color }} />
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center"
                          style={{ backgroundColor: `${color}22` }}
                        >
                          <Text className="text-sm font-bold" style={{ color }}>
                            {name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text className="text-foreground text-sm font-medium flex-1" numberOfLines={1}>
                          {name}
                        </Text>
                        {isSelf && (
                          <View className="flex-row items-center gap-1 bg-primary/15 px-2.5 py-1 rounded-full">
                            <Feather name="star" size={10} color="#6366F1" />
                            <Text className="text-primary text-xs font-semibold">{t('student.youBadge')}</Text>
                          </View>
                        )}
                      </Animated.View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
                </View>
              );
            })}
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
