import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useClassroomStats } from '@/lib/useClassroomStats';
import { useColors } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';

export function ClassroomStatStrip({ classroomId }: { classroomId: string }) {
  const { t } = useTranslation();
  const state = useClassroomStats(classroomId);
  const colors = useColors();

  if (state.status === 'loading') {
    return (
      <View className="flex-row items-center gap-2 mt-2">
        <ActivityIndicator size="small" color={colors.mutedForeground} />
        <Text className="text-muted-foreground text-xs">{t('commonUI.loadingStats')}</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return <Text className="text-muted-foreground text-xs mt-2">{t('commonUI.statsUnavailable')}</Text>;
  }

  const { students, avgSuccessRate } = state.data;
  return (
    <View className="flex-row items-center gap-2 mt-2">
      <Text className="text-muted-foreground text-xs">
        {students === 1
          ? t('commonUI.studentCountSingular', { count: students })
          : t('commonUI.studentCountPlural', { count: students })}
      </Text>
      {avgSuccessRate !== null && (
        <>
          <Text className="text-muted-foreground text-xs">|</Text>
          <Text className="text-primary text-xs font-semibold">{t('commonUI.avgSuffix', { rate: avgSuccessRate })}</Text>
        </>
      )}
    </View>
  );
}