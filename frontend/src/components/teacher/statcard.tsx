import { View, Text } from 'react-native';

type StatCardProps = {
  value: string;
  label: string;
  /** Optional accent for the value, e.g. "text-accent-classes". Defaults to primary. */
  accentClass?: string;
};

export function StatCard({ value, label, accentClass = 'text-primary' }: StatCardProps) {
  return (
    <View
      className="flex-1 bg-card border border-border rounded-2xl px-3 py-4"
      accessibilityRole="text"
      accessibilityLabel={`${value} ${label}`}
    >
      <Text className={`text-2xl font-bold ${accentClass}`}>{value}</Text>
      <Text className="text-muted-foreground text-xs mt-1">{label}</Text>
    </View>
  );
}