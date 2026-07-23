import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useSimAccents, useColors, type SimType } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';

const TYPE_META: Record<string, { sim: SimType; icon: keyof typeof Ionicons.glyphMap; labelKey: string }> = {
  phone_call: { sim: 'call', icon: 'call', labelKey: 'student.scenarioTypeCallShort' },
  whatsapp: { sim: 'chat', icon: 'chatbubble-ellipses', labelKey: 'student.scenarioTypeWhatsappShort' },
  marketplace: { sim: 'marketplace', icon: 'cart', labelKey: 'student.scenarioTypeMarketplaceShort' },
};

const RING = 52;
const STROKE = 3;
const RADIUS = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

type Props = {
  type: string;
  number: number;
  pct: number;
  fullyDone: boolean;
  attemptsExhausted: boolean;
  attemptsUsed: number;
  maxAttempts: number | null;
  onOpen: () => void;
  index: number;
  baseDelay: number;
  reducedAnimations: boolean;
};

export function ScenarioRow({
  type, pct, number, fullyDone, attemptsExhausted, attemptsUsed, maxAttempts, onOpen, index, baseDelay, reducedAnimations,
}: Props) {
  const { t } = useTranslation();
  const accents = useSimAccents();
  const colors = useColors();

  const meta = TYPE_META[type];
  const accent = meta ? accents[meta.sim] : colors.primary;
  const locked = attemptsExhausted && !fullyDone;
  const typeLabel = meta ? t(meta.labelKey) : t('student.scenarioFallback');

  const ringPct = fullyDone ? 100 : pct;
  const ringColor = fullyDone ? colors.success : locked ? colors.mutedForeground : accent;
  const iconColor = locked ? colors.mutedForeground : accent;

  const attemptsInProgress = maxAttempts != null && attemptsUsed > 0;
  const statusText = fullyDone
    ? t('student.completedBadge')
    : locked
      ? t('student.noAttemptsLeft')
      : attemptsInProgress
        ? t('student.attemptsUsedCount', { used: attemptsUsed, max: maxAttempts })
        : ringPct > 0
          ? t('student.statusPctComplete', { pct: ringPct })
          : t('student.statusNotStarted');

  return (
    <Animated.View entering={reducedAnimations ? undefined : FadeInDown.duration(300).delay(baseDelay + index * 60)}>
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.7}
        className="bg-background rounded-2xl border border-border py-3 px-3.5 flex-row items-center gap-3.5"
        accessibilityRole="button"
        accessibilityLabel={t('student.assignmentA11y', { number, label: typeLabel, status: statusText })}
        accessibilityHint={t('student.openDetailsA11y')}
      >
        <View style={{ width: RING, height: RING }} className="items-center justify-center">
          <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
            <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={`${ringColor}22`} strokeWidth={STROKE} fill="none" />
            {ringPct > 0 && (
              <Circle
                cx={RING / 2} cy={RING / 2} r={RADIUS}
                stroke={ringColor} strokeWidth={STROKE} fill="none"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - ringPct / 100)}
                strokeLinecap="round"
                transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}
              />
            )}
          </Svg>

          <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: `${iconColor}1A` }}>
            <Ionicons name={locked ? 'lock-closed' : (meta?.icon ?? 'help-circle')} size={18} color={iconColor} />
          </View>

          {fullyDone && (
            <View
              className="absolute -bottom-0.5 -right-0.5 rounded-full items-center justify-center"
              style={{ width: 18, height: 18, backgroundColor: colors.success }}
            >
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View className="flex-1">
          <Text className="text-foreground font-bold text-base">
            {t('student.assignmentLabel', { number })}
          </Text>
          <Text className="text-muted-foreground text-xs mt-0.5">{statusText}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Animated.View>
  );
}
