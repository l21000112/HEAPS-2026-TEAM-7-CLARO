import { TouchableOpacity, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

type ActionTileProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  meta?: string;
  /** Tailwind class for the icon-chip background, e.g. "bg-accent-assign/15" */
  accentClass?: string;
  /** Hex for the icon glyph (native prop - from useColors) */
  iconColor?: string;
  onPress?: () => void;
};

export function ActionTile({
  icon,
  label,
  meta,
  accentClass = 'bg-secondary',
  iconColor,
  onPress,
}: ActionTileProps) {
  return (
    <TouchableOpacity
      className="w-full bg-card border border-border rounded-2xl p-4"
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
    >
      <View className={`w-11 h-11 rounded-xl items-center justify-center mb-3 ${accentClass}`}>
        <Feather name={icon} size={22} color={iconColor} />
      </View>
      <Text className="text-foreground font-bold text-base">{label}</Text>
      {meta ? <Text className="text-muted-foreground text-xs mt-1">{meta}</Text> : null}
    </TouchableOpacity>
  );
}