import { useEffect } from "react";
import { View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { useTranslation } from "react-i18next";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { type BadgeProgress } from "@/lib/achievements";

function ProgressRail({
  label,
  value,
  pct,
  color,
  trackColor,
  met,
  delay,
  animate,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  trackColor: string;
  met: boolean;
  delay: number;
  animate: boolean;
}) {
  const width = useSharedValue(animate ? 0 : pct);

  useEffect(() => {
    width.value = animate
      ? withDelay(delay, withTiming(pct, { duration: 750, easing: Easing.out(Easing.cubic) }))
      : pct;
  }, [pct, delay, animate, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View>
      <View className="flex-row justify-between items-center mb-1.5">
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-foreground text-xs font-semibold">{value}</Text>
          {met && <Feather name="check-circle" size={12} color="#10B981" />}
        </View>
      </View>
      <View className="h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: trackColor }}>
        <Animated.View
          style={[{ height: "100%", borderRadius: 9999, backgroundColor: color }, style]}
        />
      </View>
    </View>
  );
}

export function BadgeCard({
  progress,
  done,
  accuracyPct,
  isDark,
  animate,
}: {
  progress: BadgeProgress;
  done: number;
  accuracyPct: number;
  isDark: boolean;
  animate: boolean;
}) {
  const { t } = useTranslation();
  const { reducedAnimations } = useReducedAnimations();
  const anim = animate && !reducedAnimations;
  const trackColor = isDark ? "#374151" : "#E5E7EB";

  // Locked state: no scenarios completed yet.
  if (!progress.current) {
    return (
      <View className="bg-input rounded-3xl p-6 items-center">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: isDark ? "#1f2937" : "#F3F4F6" }}
        >
          <Feather name="lock" size={30} color="#9CA3AF" />
        </View>
        <Text className="text-muted-foreground text-sm text-center">{t("student.badgeLocked")}</Text>
      </View>
    );
  }

  const tier = progress.current;
  const tierNumber = progress.tierIndex + 1;

  return (
    <View className="bg-input rounded-3xl p-5 gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-foreground text-lg font-bold">{t("student.badgeTitle")}</Text>
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: `${tier.color}1F` }}>
          <Text className="text-xs font-bold" style={{ color: tier.color }}>
            {t("student.badgeTierOf", { n: tierNumber, total: progress.totalTiers })}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-4">
        <View
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: `${tier.color}22`, borderWidth: 2, borderColor: tier.color }}
        >
          <Feather name={tier.icon} size={26} color={tier.color} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-xl font-bold">{t(tier.nameKey)}</Text>
          {progress.isMax ? (
            <View className="flex-row items-center gap-1 mt-1">
              <Feather name="star" size={12} color={tier.color} />
              <Text className="text-xs font-semibold" style={{ color: tier.color }}>
                {t("student.badgeMaxTier")}
              </Text>
            </View>
          ) : (
            <Text className="text-muted-foreground text-xs mt-1">
              {t("student.badgeNextTier", { tier: t(progress.next!.nameKey) })}
            </Text>
          )}
        </View>
      </View>

      {!progress.isMax && progress.next && (
        <View className="gap-3">
          <ProgressRail
            label={t("student.badgeProgressDoneLabel", { need: progress.next.minDone })}
            value={t("student.badgeProgressDone", { done })}
            pct={progress.doneProgressPct}
            color={tier.color}
            trackColor={trackColor}
            met={done >= progress.next.minDone}
            delay={120}
            animate={anim}
          />
          <ProgressRail
            label={t("student.badgeProgressAccuracyLabel", { need: progress.next.minAccuracy })}
            value={t("student.badgeProgressAccuracy", { pct: accuracyPct })}
            pct={progress.accuracyProgressPct}
            color="#10B981"
            trackColor={trackColor}
            met={accuracyPct >= progress.next.minAccuracy}
            delay={240}
            animate={anim}
          />
        </View>
      )}
    </View>
  );
}
