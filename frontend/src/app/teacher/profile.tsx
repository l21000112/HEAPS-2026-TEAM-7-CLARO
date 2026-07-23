import "../../../global.css";
import { useCallback, useRef, useState } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/themeContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { listClassrooms, listClassroomStudents, getStudentResults, getClassroomAssignments, type ClassroomAssignment } from "@/api/classrooms";
import { useColors } from "@/lib/useColors";
import { useFocusAnimationKey } from "@/lib/useFocusAnimationKey";

const RECENT_ASSIGNMENT_LIMIT = 5;

type RecentAssignment = ClassroomAssignment & {
  classroomId: string;
  classroomName: string;
};

function formatListWithAnd(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
}

function formatProfileDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function enter<T>(reducedAnimations: boolean, animation: T): T | undefined {
  return reducedAnimations ? undefined : animation;
}

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const { reducedAnimations } = useReducedAnimations();
  const animationKey = useFocusAnimationKey();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    classrooms: 0,
    students: 0,
    avgSuccess: "--",
  });
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([]);
  const requestId = useRef(0);

  const fetchData = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const classes = await listClassrooms();
      let totalStudents = 0;
      let totalAttempts = 0;
      let totalCorrect = 0;
      const allAssignments: RecentAssignment[] = [];

      if (classes.length > 0) {
        const classroomData = await Promise.all(
          classes.map(async (classroom) => {
            const [students, assignments] = await Promise.all([
              listClassroomStudents(classroom.id),
              getClassroomAssignments(classroom.id),
            ]);
            return { classroom, students, assignments };
          }),
        );

        totalStudents = classroomData.reduce((sum, item) => sum + item.students.length, 0);

        for (const { classroom, assignments } of classroomData) {
          for (const assignment of assignments) {
            allAssignments.push({
              ...assignment,
              classroomId: classroom.id,
              classroomName: classroom.name,
            });
          }
        }

        const results = await Promise.all(
          classroomData.flatMap(({ classroom, students }) =>
            students.map((student) =>
              getStudentResults(classroom.id, student.studentUid, { includeSummary: true }),
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

      const recent = allAssignments
        .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
        .slice(0, RECENT_ASSIGNMENT_LIMIT);

      if (currentRequest !== requestId.current) return;
      setRecentAssignments(recent);
      setStats({
        classrooms: classes.length,
        students: totalStudents,
        avgSuccess:
          totalAttempts > 0
            ? `${Math.max(0, Math.min(100, Math.round((totalCorrect / totalAttempts) * 100)))}%`
            : "--",
      });
      setError(null);
    } catch (e: unknown) {
      if (currentRequest === requestId.current) {
        setError(e instanceof Error ? e.message : t("teacher.fallbackDashboardError"));
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

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? "dark" : ""}`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t("teacher.loadingProfile")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }} className={`bg-background ${isDark ? "dark" : ""}`}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-8 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchData()}
            tintColor={colors.primary}
          />
        }
      >
        <View key={animationKey} className="gap-5">
          <Animated.View entering={enter(reducedAnimations, FadeIn.duration(280))} className="gap-3">
            <View>
              <Text className="text-2xl font-bold text-foreground">{t("teacher.profileTitle")}</Text>
              <Text className="text-muted-foreground text-sm mt-1">{t("teacher.profileSubtitle")}</Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={enter(reducedAnimations, ZoomIn.duration(420).delay(40))}
            className="bg-card border border-border rounded-3xl px-5 pt-6 pb-5 items-center overflow-hidden"
          >
            <View
              className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-30"
              style={{ backgroundColor: `${colors.accentClasses}55` }}
            />
            <View
              className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full opacity-25"
              style={{ backgroundColor: `${colors.accentAssign}44` }}
            />

            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-1"
              style={{ backgroundColor: `${colors.primary}18` }}
              accessibilityRole="image"
              accessibilityLabel={t("teacher.profileRoleBadge")}
            >
              <FontAwesome6 name="user-tie" size={44} color={colors.primary} />
            </View>
            <Text className="text-foreground text-2xl font-bold mt-3 text-center">
              {profile?.displayName || t("teacher.emptyFallbackName")}
            </Text>
            <Text className="text-muted-foreground text-sm mt-1 text-center">
              {profile?.email ?? "-"}
            </Text>

            <View className="flex-row flex-wrap items-center justify-center gap-2 mt-4">
              <View className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Feather name="award" size={12} color={colors.primary} />
                <Text className="text-primary text-xs font-bold">{t("teacher.profileRoleBadge")}</Text>
              </View>
              {joinedDate ? (
                <View className="flex-row items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
                  <Feather name="calendar" size={12} color={colors.mutedForeground} />
                  <Text className="text-muted-foreground text-xs">
                    {t("teacher.joinedPrefix", { date: joinedDate })}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {error ? (
            <View className="bg-destructive/10 border border-destructive/30 p-4 rounded-2xl flex-row items-center gap-2">
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text className="text-destructive text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          <Animated.View
            entering={enter(reducedAnimations, FadeInDown.duration(340).delay(100))}
            className="flex-row gap-3"
          >
            <View className="flex-1 bg-card border border-border rounded-2xl px-3 py-4 items-center">
              <Text className="text-2xl font-bold" style={{ color: colors.accentClasses }}>
                {stats.classrooms}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1 text-center">
                {t("teacher.profileStatClasses")}
              </Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-2xl px-3 py-4 items-center">
              <Text className="text-2xl font-bold" style={{ color: colors.accentAssign }}>
                {stats.students}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1 text-center">
                {t("teacher.statStudents")}
              </Text>
            </View>
            <View className="flex-1 bg-card border border-border rounded-2xl px-3 py-4 items-center">
              <Text className="text-2xl font-bold" style={{ color: colors.accentAnalytics }}>
                {stats.avgSuccess}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1 text-center">
                {t("teacher.statAvgSuccess")}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={enter(reducedAnimations, FadeInDown.duration(340).delay(160))}
            className="bg-card border border-border rounded-2xl px-4 py-4 gap-3"
          >
            <View className="flex-row items-center gap-3">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: `${colors.accentAssign}22` }}
              >
                <Feather name="clipboard" size={20} color={colors.accentAssign} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground font-bold text-base">
                  {t("teacher.profileRecentHomeworkTitle")}
                </Text>
                <Text className="text-muted-foreground text-xs mt-0.5">
                  {t("teacher.profileRecentHomeworkDesc")}
                </Text>
              </View>
            </View>

            {recentAssignments.length === 0 ? (
              <View className="bg-muted/50 rounded-xl px-4 py-5 items-center">
                <Feather name="inbox" size={22} color={colors.mutedForeground} />
                <Text className="text-muted-foreground text-sm mt-2 text-center">
                  {t("teacher.profileRecentHomeworkEmpty")}
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {recentAssignments.map((assignment, index) => {
                  const scenarioCount = assignment.scenarios.reduce((sum, s) => sum + s.quantity, 0);
                  const scenarioUnit =
                    scenarioCount === 1
                      ? t("teacher.scenarioCountSingular")
                      : t("teacher.scenarioCountPlural");
                  const callCount = assignment.scenarios
                    .filter((s) => s.type === "phone_call")
                    .reduce((sum, s) => sum + s.quantity, 0);
                  const chatCount = assignment.scenarios
                    .filter((s) => s.type === "whatsapp")
                    .reduce((sum, s) => sum + s.quantity, 0);
                  const marketplaceCount = assignment.scenarios
                    .filter((s) => s.type === "marketplace")
                    .reduce((sum, s) => sum + s.quantity, 0);

                  const primaryTitleParts: string[] = [];
                  if (callCount > 0) primaryTitleParts.push(`${callCount} ${t("teacher.profileScamCallLabel")}`);
                  if (chatCount > 0) primaryTitleParts.push(`${chatCount} ${t("teacher.profileScamChatLabel")}`);
                  if (marketplaceCount > 0)
                    primaryTitleParts.push(`${marketplaceCount} ${t("teacher.profileScamMarketplaceLabel")}`);

                  const primaryTitle =
                    primaryTitleParts.length > 0
                      ? `${formatListWithAnd(primaryTitleParts)} ${t("teacher.profileHomeworkScenariosSuffix")}`
                      : null;

                  return (
                    <Animated.View
                      key={`${assignment.classroomId}-${assignment.id}`}
                      entering={enter(
                        reducedAnimations,
                        FadeInDown.duration(280).delay(200 + index * 40),
                      )}
                      className="bg-background border border-border rounded-xl px-3.5 py-3"
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <Text className="text-foreground font-bold text-base flex-1 shrink" numberOfLines={1}>
                          {assignment.classroomName}
                        </Text>
                        {assignment.deadline ? (
                          <View className="bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                            <Text className="text-primary text-xs font-bold">
                              {t("teacher.profileHomeworkDue", {
                                date: formatProfileDate(assignment.deadline),
                              })}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {primaryTitle ? (
                        <Text className="text-foreground text-sm mt-1" numberOfLines={1}>
                          {primaryTitle}
                        </Text>
                      ) : null}

                      <Text className="text-muted-foreground text-xs mt-1.5">
                        {t("teacher.profileHomeworkAssignedMeta", {
                          count: scenarioCount,
                          scenarioUnit,
                          assignedDate: formatProfileDate(assignment.assignedAt),
                        })}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
