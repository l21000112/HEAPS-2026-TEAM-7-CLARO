import "../../../global.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/themeContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { getAttemptSummary, type AttemptSummary } from "@/api/attempts";
import { listClassrooms, getStudentResults } from "@/api/classrooms";
import { useFocusEffect } from "expo-router";
import { useFocusAnimationKey } from "@/lib/useFocusAnimationKey";
import { useTranslation } from "react-i18next";
import { ACHIEVEMENTS_V2, computeBadge } from "@/lib/achievements";
import { BadgeCard } from "@/components/student/BadgeCard";
import { colors } from "@/styles/global";

function enter<T>(reducedAnimations: boolean, animation: T): T | undefined {
  return reducedAnimations ? undefined : animation;
}

// Static display maps - extend manually when new scenario types are added

const fallbackMeta = (type: string) => ({
  title: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  icon: "shield" as keyof typeof Feather.glyphMap,
  color: "#38BDF8",
});

type RecentAttempt = {
  id: string;
  scenarioType: string;
  isCorrect: boolean;
  createdAt: string;
};

function accuracyColor(pct: number, isDark: boolean) {
  const capped = Math.max(0, Math.min(pct, 100));
  const hue = capped * 1.2;
  const lightness = isDark ? 62 : 40;
  return `hsl(${hue}, 80%, ${lightness}%)`;
}

// Count-up number driven by rAF
function AnimatedNumber({
  value,
  duration = 900,
  suffix = "",
  className,
  animate = true,
}: {
  value: number;
  duration?: number;
  suffix?: string;
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
    const from = 0;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, animate]);

  return (
    <Text className={className}>
      {display}
      {suffix}
    </Text>
  );
}

function GaugeTick({
  index,
  count,
  progress,
  radius,
  size,
  length,
  width,
  color,
  trackColor,
  animate = true,
}: {
  index: number;
  count: number;
  progress: any;
  radius: number;
  size: number;
  length: number;
  width: number;
  color: string;
  trackColor: string;
  animate?: boolean;
}) {
  const angleDeg = (index / count) * 360 - 90;
  const rad = (angleDeg * Math.PI) / 180;
  const cx = size / 2 + radius * Math.cos(rad);
  const cy = size / 2 + radius * Math.sin(rad);
  const threshold = (index / count) * 100;

  const style = useAnimatedStyle(() => {
    const active = progress.value >= threshold;
    return {
      backgroundColor: active ? color : trackColor,
      opacity: animate
        ? withTiming(active ? 1 : 0.4, { duration: 250 })
        : active
          ? 1
          : 0.4,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width,
          height: length,
          borderRadius: width / 2,
          left: cx - width / 2,
          top: cy - length / 2,
          transform: [{ rotate: `${angleDeg + 90}deg` }],
        },
        style,
      ]}
    />
  );
}

function AccuracyGauge({
  percentage,
  size = 176,
  color,
  trackColor,
  animate = true,
}: {
  percentage: number;
  size?: number;
  color: string;
  trackColor: string;
  animate?: boolean;
}) {
  const progress = useSharedValue(animate ? 0 : percentage);
  const { t } = useTranslation();
  const tickCount = 44;
  const radius = size / 2 - size * 0.09;
  const length = size * 0.09;
  const width = size * 0.026;

  useEffect(() => {
    progress.value = animate
      ? withTiming(percentage, { duration: 1100, easing: Easing.out(Easing.cubic) })
      : percentage;
  }, [percentage, animate]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: tickCount }).map((_, i) => (
        <GaugeTick
          key={i}
          index={i}
          count={tickCount}
          progress={progress}
          radius={radius}
          size={size}
          length={length}
          width={width}
          color={color}
          trackColor={trackColor}
          animate={animate}
        />
      ))}
      <View className="items-center" style={{ position: "absolute" }}>
        <AnimatedNumber
          value={percentage}
          suffix="%"
          className="text-foreground font-bold text-3xl"
          animate={animate}
        />
        <Text className="text-muted-foreground text-xs mt-1">{t('student.accuracyLabel')}</Text>
      </View>
    </View>
  );
}

function AnimatedBar({
  pct,
  color,
  delay = 0,
  animate = true,
}: {
  pct: number;
  color: string;
  delay?: number;
  animate?: boolean;
}) {
  const width = useSharedValue(animate ? 0 : pct);

  useEffect(() => {
    width.value = animate
      ? withDelay(delay, withTiming(pct, { duration: 850, easing: Easing.out(Easing.cubic) }))
      : pct;
  }, [pct, delay, animate]);

  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View className="h-2.5 w-full bg-background rounded-full overflow-hidden">
      <Animated.View style={[{ height: "100%", borderRadius: 9999, backgroundColor: color }, style]} />
    </View>
  );
}

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const { reducedAnimations } = useReducedAnimations();
  const animate = !reducedAnimations;
  const animationKey = useFocusAnimationKey();
  const { t, i18n } = useTranslation();

  const SCENARIO_META: Record<string, { title: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
    phone_call: { title: t('student.scenarioTypeCall'), icon: "phone-call", color: "#6366F1" },
    whatsapp: { title: t('student.scenarioTypeWhatsapp'), icon: "message-circle", color: "#10B981" },
    marketplace: { title: t('student.scenarioTypeMarketplace'), icon: "shopping-bag", color: "#F59E0B" },
  };

  const ACHIEVEMENT_DEFS: Array<{
    id: string;
    labelKey: 'student.achievementFirstSteps' | 'student.achievementDedicated' | 'student.achievementSharpEye' | 'student.achievementScamBuster';
    icon: keyof typeof Feather.glyphMap;
    color: string;
    isEarned: (stats: { totalAttempts: number; accuracy: number }) => boolean;
  }> = [
    { id: "first_steps", labelKey: 'student.achievementFirstSteps', icon: "flag", color: "#6366F1", isEarned: (s) => s.totalAttempts >= 1 },
    { id: "dedicated", labelKey: 'student.achievementDedicated', icon: "zap", color: "#F59E0B", isEarned: (s) => s.totalAttempts >= 10 },
    { id: "sharp_eye", labelKey: 'student.achievementSharpEye', icon: "eye", color: "#10B981", isEarned: (s) => s.accuracy >= 70 && s.totalAttempts >= 3 },
    { id: "scam_buster", labelKey: 'student.achievementScamBuster', icon: "shield", color: "#EF4444", isEarned: (s) => s.accuracy >= 90 && s.totalAttempts >= 5 },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AttemptSummary | null>(null);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [recentActivityUnavailable, setRecentActivityUnavailable] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const attemptSummary = await getAttemptSummary();
      setSummary(attemptSummary);

      const classes = await listClassrooms();

      if (profile?.uid && classes.length > 0) {
        const classroomId = classes[0].id;
        try {
          const result = await getStudentResults(classroomId, profile.uid);
          const sorted = [...(result.attempts ?? [])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentAttempts(
            sorted.slice(0, 8).map((a) => ({
              id: a.id,
              scenarioType: a.scenarioType,
              isCorrect: a.isCorrect,
              createdAt: a.createdAt,
            }))
          );
          setRecentActivityUnavailable(false);
        } catch (e) {
          console.warn(`[student/profile] couldn't load results for classroom ${classroomId}:`, e);
          setRecentAttempts([]);
          setRecentActivityUnavailable(true);
        }
      } else {
        setRecentAttempts([]);
        setRecentActivityUnavailable(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('student.fallbackProfileError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.uid, t]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  const totalAttempts = summary?.totalAttempts ?? 0;
  const correctAttempts = summary?.correctAttempts ?? 0;
  const incorrectAttempts = Math.max(0, totalAttempts - correctAttempts);
  const accuracy = summary ? Math.round(summary.accuracy * 100) : 0;

  const breakdown = useMemo(() => {
    if (!summary?.byScenarioType) return [];
    return Object.entries(summary.byScenarioType)
      .map(([type, stats]) => {
        const meta = SCENARIO_META[type] || fallbackMeta(type);
        return {
          type,
          ...meta,
          pct: Math.round(stats.accuracy * 100),
          correct: stats.correct,
          total: stats.total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [summary, i18n.language, t]);

  const achievements = useMemo(
    () =>
      ACHIEVEMENT_DEFS.map((def) => ({
        id: def.id,
        label: t(def.labelKey),
        icon: def.icon,
        color: def.color,
        earned: def.isEarned({ totalAttempts, accuracy }),
      })),
    [totalAttempts, accuracy, i18n.language, t],
  );
  const earnedCount = achievements.filter((a) => a.earned).length;

  const badge = useMemo(
    () => computeBadge(totalAttempts, accuracy),
    [totalAttempts, accuracy],
  );

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const gaugeColor = accuracyColor(accuracy, isDark);
  const trackColor = isDark ? "#374151" : "#E5E7EB";

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t('student.loadingProfile')}</Text>
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
        <View className="gap-3">
          <Text className="text-2xl font-bold text-foreground">{t('student.profileTitle')}</Text>
          <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(280))}>
          </Animated.View>
        </View>

        <Animated.View entering={enter(reducedAnimations, FadeIn.duration(300))} className="bg-input p-6 rounded-3xl items-center">
          <View className="w-20 h-20 bg-background rounded-full items-center justify-center mb-3">
            <Feather name="user" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-primary text-xl font-bold">{profile?.displayName ?? "-"}</Text>
          <Text className="text-muted-foreground text-xs mt-0.5">{profile?.email ?? "-"}</Text>
          <View className="flex-row items-center gap-3 mt-3">
            {joinedDate && (
              <View className="flex-row items-center gap-1.5 bg-background px-3 py-1.5 rounded-xl">
                <Feather name="calendar" size={12} color="#9CA3AF" />
                <Text className="text-muted-foreground text-xs">{t('student.joinedPrefix', { date: joinedDate })}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {error && (
          <View className="bg-red-500/10 p-4 rounded-2xl flex-row items-center gap-2">
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text className="text-red-500 text-sm flex-1">{error}</Text>
          </View>
        )}

        {totalAttempts === 0 ? (
          <View className="items-center justify-center py-10 px-4">
            <Feather name="bar-chart-2" size={48} color="#6B7280" />
            <Text className="text-foreground text-lg font-bold mt-4">{t('student.noStatsTitle')}</Text>
            <Text className="text-muted-foreground text-sm text-center mt-2">
              {t('student.noStatsDesc')}
            </Text>
          </View>
        ) : (
          <>
            <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(80))} className="flex-row gap-3">
              <View className="flex-1 bg-input py-4 rounded-2xl items-center">
                <AnimatedNumber value={totalAttempts} className="text-foreground font-bold text-xl" animate={animate} />
                <Text className="text-muted-foreground text-xs mt-1">{t('student.statAttempts')}</Text>
              </View>
              <View className="flex-1 bg-emerald-500/10 py-4 rounded-2xl items-center">
                <AnimatedNumber value={correctAttempts} className="text-emerald-500 font-bold text-xl" animate={animate} />
                <Text className="text-emerald-500/70 text-xs mt-1">{t('student.statCorrect')}</Text>
              </View>
              <View className="flex-1 bg-red-500/10 py-4 rounded-2xl items-center">
                <AnimatedNumber value={incorrectAttempts} className="text-red-500 font-bold text-xl" animate={animate} />
                <Text className="text-red-500/70 text-xs mt-1">{t('student.statIncorrect')}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(140))} className="items-center bg-input py-6 rounded-3xl">
              <AccuracyGauge percentage={accuracy} color={gaugeColor} trackColor={trackColor} animate={animate} />
              <Text className="text-muted-foreground text-xs mt-3">
                {t('student.accuracySummary', { correct: correctAttempts, total: totalAttempts })}
              </Text>
            </Animated.View>

            {/* Achievements (v2 tiered badge - gated by ACHIEVEMENTS_V2; legacy grid preserved for revert) */}
            <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(180))}>
              {ACHIEVEMENTS_V2 ? (
                <BadgeCard
                  progress={badge}
                  done={totalAttempts}
                  accuracyPct={accuracy}
                  isDark={isDark}
                  animate={animate}
                />
              ) : (
                <>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-foreground text-lg font-bold">{t('student.achievementsTitle')}</Text>
                <View className="bg-primary/10 px-3 py-1 rounded-full">
                  <Text className="text-primary text-xs font-bold">
                    {t('student.achievementsCount', { earned: earnedCount, total: achievements.length })}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {achievements.map((a) => (
                  <View
                    key={a.id}
                    className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border ${
                      a.earned ? "" : "border-input"
                    }`}
                    style={{
                      backgroundColor: a.earned ? `${a.color}1F` : isDark ? "#1f2937" : "#F3F4F6",
                      opacity: a.earned ? 1 : 0.45,
                      borderColor: a.earned ? `${a.color}` : ""
                    }}
                  >
                    <Feather name={a.earned ? a.icon : "lock"} size={12} color={a.earned ? a.color : "#9CA3AF"} />
                    <Text
                      className={`text-xs font-semibold ${a.earned ? "" : "text-muted-foreground"}`}
                      style={a.earned ? { color: a.color } : undefined}
                    >
                      {a.label}
                    </Text>
                  </View>
                ))}
              </View>
                </>
              )}
            </Animated.View>

            {breakdown.length > 0 && (
              <Animated.View entering={enter(reducedAnimations, FadeInDown.duration(350).delay(220))}>
                <Text className="text-foreground text-lg font-bold mb-3">{t('student.accuracyByScenario')}</Text>
                <View className="bg-input rounded-2xl p-5 gap-4">
                  {breakdown.map((item, idx) => (
                    <View key={item.type}>
                      <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center gap-2 flex-1">
                          <View
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: `${item.color}22` }}
                          >
                            <Feather name={item.icon} size={13} color={item.color} />
                          </View>
                          <Text className="text-foreground text-sm font-medium flex-1" numberOfLines={1}>
                            {item.title}
                          </Text>
                        </View>
                        <Text className="text-muted-foreground text-xs">
                          {item.correct}/{item.total} | {item.pct}%
                        </Text>
                      </View>
                      <AnimatedBar pct={item.pct} color={item.color} delay={idx * 120} animate={animate} />
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {(recentAttempts.length > 0 || recentActivityUnavailable) && (
              <View>
                <Text className="text-foreground text-lg font-bold mb-3">{t('student.recentActivity')}</Text>
                <View className="gap-2">
                  {recentAttempts.map((attempt, idx) => {
                    const meta = SCENARIO_META[attempt.scenarioType] || fallbackMeta(attempt.scenarioType);
                    const dateStr = new Date(attempt.createdAt).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <Animated.View
                        key={attempt.id}
                        entering={enter(reducedAnimations, FadeInDown.duration(300).delay(idx * 60))}
                        className={`flex-row items-center justify-between p-3.5 rounded-xl border-l-4 ${
                          attempt.isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"
                        }`}
                        style={{ borderLeftColor: attempt.isCorrect ? "#10B981" : "#EF4444" }}
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <View
                            className="w-9 h-9 rounded-full items-center justify-center"
                            style={{ backgroundColor: `${meta.color}22` }}
                          >
                            <Feather name={meta.icon} size={14} color={meta.color} />
                          </View>
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-semibold">{meta.title}</Text>
                            <Text className="text-muted-foreground text-xs mt-0.5">{dateStr}</Text>
                          </View>
                        </View>
                        <Feather
                          name={attempt.isCorrect ? "check-circle" : "x-circle"}
                          size={18}
                          color={attempt.isCorrect ? "#10B981" : "#EF4444"}
                        />
                      </Animated.View>
                    );
                  })}
                </View>
              </View>
            )}
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
