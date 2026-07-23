import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useSimAccents, useColors, type SimType } from '@/lib/useColors';

// Assignment item.type → sim accent key + icon
const TYPE_META: Record<string, { sim: SimType; icon: keyof typeof Ionicons.glyphMap }> = {
  phone_call: { sim: 'call', icon: 'call' },
  whatsapp: { sim: 'chat', icon: 'chatbubble-ellipses' },
  marketplace: { sim: 'marketplace', icon: 'cart' },
};

type Props = {
  type: string;
  title: string;
  done: number;
  quantity: number;
  pct: number;
  fullyDone: boolean;
  attemptsExhausted: boolean;
  attemptsUsed: number;
  maxAttempts: number | null;
  remaining: number | null;
  onStart: () => void;
  index: number;
  baseDelay: number;
  reducedAnimations: boolean;
};

export function ScenarioTile({
  type, title, done, quantity, pct, fullyDone,
  attemptsExhausted, attemptsUsed, maxAttempts, remaining,
  onStart, index, baseDelay, reducedAnimations,
}: Props) {
  const accents = useSimAccents();
  const colors = useColors();

  const meta = TYPE_META[type];
  const accent = meta ? accents[meta.sim] : colors.primary;
  const icon = meta?.icon ?? 'help-circle';

  const barFill = fullyDone ? colors.success : accent;

  const countLabel = fullyDone
    ? `${done}/${quantity} done`
    : attemptsExhausted
      ? `${attemptsUsed}/${maxAttempts}`
      : remaining != null
        ? `${done}/${quantity} | ${remaining} left`
        : `${done}/${quantity}`;

  return (
    <Animated.View
      entering={reducedAnimations ? undefined : FadeInDown.duration(300).delay(baseDelay + index * 60)}
    >
      <View
        className="bg-background rounded-2xl border border-border py-3 pr-3 pl-3.5 flex-row items-center gap-3"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
      >
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${accent}22` }}
        >
          <Ionicons name={icon} size={20} color={accent} />
        </View>

        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground font-bold text-sm flex-1 pr-2" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-muted-foreground text-[11px]">{countLabel}</Text>
          </View>
          <View
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: `${accent}1A` }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: fullyDone ? 100 : pct }}
          >
            <View
              className="h-full rounded-full"
              style={{ width: `${fullyDone ? 100 : pct}%`, backgroundColor: barFill }}
            />
          </View>
        </View>

        {attemptsExhausted ? (
          <View className="bg-muted px-3 py-2 rounded-lg">
            <Text className="text-muted-foreground font-bold text-xs">
              {fullyDone ? 'Done' : 'Limit'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary px-4 py-2.5 rounded-lg"
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={`Start ${title}`}
          >
            <Text className="text-primary-foreground font-bold text-xs">Start</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
