import { Modal, View, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { CatChubby } from '@/lib/images';
import { useSimAccents, useColors, type SimType } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';

const TYPE_SIM: Record<string, SimType> = {
  phone_call: 'call',
  whatsapp: 'chat',
  marketplace: 'marketplace',
};

export type ScenarioSheetData = {
  type: string;
  title: string;
  description: string;
  done: number;
  quantity: number;
  fullyDone: boolean;
  attemptsExhausted: boolean;
  attemptsUsed: number;
  maxAttempts: number | null;
  remaining: number | null;
};

type Props = {
  data: ScenarioSheetData | null;
  reducedAnimations?: boolean;
  onStart: () => void;
  onClose: () => void;
};

export function ScenarioDetailSheet({ data, onStart, onClose }: Props) {
  const { t } = useTranslation();
  const accents = useSimAccents();
  const colors = useColors();
  if (!data) return null;

  const accent = TYPE_SIM[data.type] ? accents[TYPE_SIM[data.type]] : colors.primary;

  const countLabel = data.fullyDone
    ? t('student.progressCompletedCount', { done: data.done, total: data.quantity })
    : data.attemptsExhausted
      ? t('student.attemptsUsedCount', { used: data.attemptsUsed, max: data.maxAttempts })
      : data.remaining != null
        ? t('student.progressRemainingCount', {
            done: data.done,
            total: data.quantity,
            remaining: data.remaining,
          })
        : t('student.doneCount', { done: data.done, total: data.quantity });

  const actionLabel = data.done > 0 ? t('common.continue') : t('student.startButton');
  const disabledLabel = data.fullyDone
    ? t('student.completedBadge')
    : t('student.noAttemptsLeft');

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.closeDetails')}
      >
        <Pressable
          style={[styles.sheet, { borderTopColor: accent, backgroundColor: colors.card }]}
          onPress={() => {}}
        >
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.muted }]} />
              </View>

              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: colors.muted }]}
                accessibilityRole="button"
                accessibilityLabel={t('common.closeDetails')}
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={colors.mutedForeground} />
              </Pressable>

              <View style={styles.speechRow}>
                <View style={styles.speechFlex}>
                  <View style={[styles.bubble, { backgroundColor: colors.muted }]}>
                    <Text className="text-foreground font-bold text-lg">{data.title}</Text>
                    <Text className="text-muted-foreground text-sm leading-5">{data.description}</Text>
                  </View>
                </View>
                <Image source={CatChubby} style={styles.cat} resizeMode="contain" />
              </View>

              <View style={styles.metaRow}>
                <Ionicons
                  name={data.fullyDone ? 'checkmark-circle' : 'flag-outline'}
                  size={16}
                  color={data.fullyDone ? colors.success : accent}
                />
                <Text className="text-muted-foreground text-sm">{countLabel}</Text>
              </View>

              {data.attemptsExhausted ? (
                <View style={[styles.actionBtn, { backgroundColor: colors.muted }]}>
                  <Text className="text-muted-foreground font-bold">{disabledLabel}</Text>
                </View>
              ) : (
                <Pressable
                  onPress={onStart}
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${actionLabel} ${data.title}`}
                >
                  <Text className="text-primary-foreground font-bold text-base">{actionLabel}</Text>
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 3,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  handleWrap: {
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 6,
    borderRadius: 999,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  speechRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  speechFlex: {
    flex: 1,
  },
  bubble: {
    borderRadius: 16,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  cat: {
    width: 96,
    height: 96,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
