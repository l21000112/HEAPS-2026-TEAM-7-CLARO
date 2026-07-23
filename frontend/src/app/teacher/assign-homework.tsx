import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import PagerView from 'react-native-pager-view';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "@/context/themeContext";
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { useAppAlert } from '@/context/AppAlertContext';
import {
  listCallScenarios,
  listWhatsAppScenarios,
  listMarketplaceScenarios,
} from '@/api/scenarios';
import { listClassrooms, setClassroomAssignment, type Classroom } from '@/api/classrooms';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import {
  translateCallScenario,
  translateWhatsAppScenario,
} from '@/lib/scenarioI18n';
import { colors } from '@/styles/global';

type ScamType = { id: string; scenarioId: string; type: string; title: string; desc: string };

const MIN_DEADLINE_LEAD_MS = 60 * 60 * 1000;

function combineDeadline(date: Date, time: Date) {
  const deadline = new Date(date);
  deadline.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return deadline;
}

function hasInvalidAttemptLimits(
  quantities: Record<string, number>,
  maxAttempts: Record<string, number | null>,
) {
  return Object.entries(quantities).some(([id, quantity]) => {
    const limit = maxAttempts[id];
    return limit != null && limit < quantity;
  });
}

function firstNWords(text: string, n: number) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const words = trimmed.split(/\s+/).slice(0, n).join(' ');
  return words.length < trimmed.length ? `${words}…` : words;
}

export default function AssignHomeworkScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { alert } = useAppAlert();
  const insets = useSafeAreaInsets();

  // Order here defines the swipe order of the subtabs.
  const TABS = [
    { key: 'phone_call', label: t('teacher.tabScamCall') },
    { key: 'whatsapp', label: t('teacher.tabScamMessage') },
    { key: 'marketplace', label: t('teacher.tabMarketplace') },
  ] as const;
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [maxAttempts, setMaxAttempts] = useState<Record<string, number | null>>({});
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [scamTypes, setScamTypes] = useState<ScamType[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const requestId = useRef(0);

  const minDate = new Date();

  const [date, setDate] = useState(() => new Date(Date.now() + 2 * MIN_DEADLINE_LEAD_MS));
  const [time, setTime] = useState(() => new Date(Date.now() + 2 * MIN_DEADLINE_LEAD_MS));
  const [timeError, setTimeError] = useState<string | null>(null);

  const fetchData = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoadingScenarios(true);
    else setRefreshing(true);

    try {
      const [callScenarios, whatsappScenarios, marketplaceScenarios, classes] = await Promise.all([
        listCallScenarios(),
        listWhatsAppScenarios(),
        listMarketplaceScenarios(i18n.language),
        listClassrooms(),
      ]);

      const lang = i18n.language;
      const built: ScamType[] = [];
      for (const raw of callScenarios) {
        const scenario = translateCallScenario(raw, lang);
        built.push({
          id: `call_${scenario.id}`,
          scenarioId: String(scenario.id),
          type: 'phone_call',
          title: t('teacher.scenarioTitleCall', { name: scenario.callerName }),
          desc: scenario.dialogue
            ? scenario.dialogue.length > 100 ? scenario.dialogue.substring(0, 100) + '...' : scenario.dialogue
            : t('teacher.scenarioFallbackCall'),
        });
      }
      for (const raw of whatsappScenarios) {
        const scenario = translateWhatsAppScenario(raw, lang);
        const firstMsg = scenario.openingMessages?.[0]?.body || '';
        built.push({
          id: `whatsapp_${scenario.id}`,
          scenarioId: String(scenario.id),
          type: 'whatsapp',
          title: t('teacher.scenarioTitleChat', {
            name: scenario.contact?.displayName || t('teacher.unknownContact'),
          }),
          desc: firstMsg
            ? firstMsg.length > 100 ? firstMsg.substring(0, 100) + '...' : firstMsg
            : t('teacher.scenarioFallbackWhatsapp'),
        });
      }
      for (const scenario of marketplaceScenarios) {
      const item = scenario.products?.[0]?.name ?? 'Item';
      built.push({
        id: `marketplace_${scenario.id}`,
        scenarioId: String(scenario.id),
        type: 'marketplace',
        title: item,
        desc: scenario.taskDescription,
      });
    }

      if (currentRequest !== requestId.current) return;
      const validIds = new Set(built.map((scenario) => scenario.id));
      setClassrooms(classes);
      setSelectedClassroom((current) =>
        classes.find((classroom) => classroom.id === current?.id) || classes[0] || null,
      );
      setScamTypes(built);
      setQuantities((current) => Object.fromEntries(
        Object.entries(current).filter(([id]) => validIds.has(id)),
      ));
      setMaxAttempts((current) => Object.fromEntries(
        Object.entries(current).filter(([id]) => validIds.has(id)),
      ));
      setLoadError(null);
    } catch (e: any) {
      if (currentRequest === requestId.current) {
        setLoadError(e?.message || t('teacher.fallbackLoadError'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoadingScenarios(false);
        setRefreshing(false);
      }
    }
  }, [t, i18n.language]);

  useFocusEffect(
    useCallback(() => {
      void fetchData();
      return () => {
        requestId.current += 1;
      };
    }, [fetchData]),
  );

  const grouped = useMemo(() => {
    const map: Record<string, ScamType[]> = { phone_call: [], whatsapp: [], marketplace: [] };
    for (const scam of scamTypes) {
      (map[scam.type] ??= []).push(scam);
    }
    return map;
  }, [scamTypes]);

  const selectedCountFor = useCallback(
    (key: string) => (grouped[key] ?? []).reduce((n, scam) => n + (quantities[scam.id] ? 1 : 0), 0),
    [grouped, quantities],
  );

  const goToTab = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(50, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const validateDeadline = (nextDate: Date, nextTime: Date) => {
    const isValid = combineDeadline(nextDate, nextTime).getTime() >= Date.now() + MIN_DEADLINE_LEAD_MS;
    setTimeError(isValid ? null : t('teacher.deadlineMustBeFuture'));
    return isValid;
  };

  const onDateChange = (_event: DateTimePickerChangeEvent, selectedDate: Date) => {
    setDate(selectedDate);
    validateDeadline(selectedDate, time);
    setShowPicker(false);
  };

  const onTimeChange = (_event: DateTimePickerChangeEvent, selectedTime: Date) => {
    setTime(selectedTime);
    validateDeadline(date, selectedTime);
    setShowTimePicker(false);
  };

  const openConfirm = () => {
    if (Object.keys(quantities).length === 0) {
      alert(t('teacher.alertNothingSelectedTitle'), t('teacher.alertNothingSelectedMsg'));
      return;
    }
    if (hasInvalidAttemptLimits(quantities, maxAttempts)) {
      alert(t('teacher.alertInvalidLimitTitle'), t('teacher.alertInvalidLimitMsg'));
      return;
    }
    setShowConfirm(true);
  };

  const handleAssign = async () => {
    if (sending) return;
    if (!selectedClassroom) {
      alert(t('teacher.alertNoClassroomTitle'), t('teacher.alertNoClassroomMsg'));
      return;
    }
    if (Object.keys(quantities).length === 0) {
      alert(t('teacher.alertMissingInfoTitle'), t('teacher.alertMissingInfoMsg'));
      return;
    }
    const invalidAttemptLimit = hasInvalidAttemptLimits(quantities, maxAttempts);
    if (invalidAttemptLimit) {
      alert(t('teacher.alertInvalidLimitTitle'), t('teacher.alertInvalidLimitMsg'));
      return;
    }

    const deadline = combineDeadline(date, time);
    if (deadline.getTime() < Date.now() + MIN_DEADLINE_LEAD_MS) {
      setTimeError(t('teacher.deadlineMustBeFuture'));
      alert(t('teacher.alertInvalidDeadlineTitle'), t('teacher.alertInvalidDeadlineMsg'));
      return;
    }

    setSending(true);
    try {
      const scenarioEntries = Object.entries(quantities).filter(([, qty]) => qty > 0);
      const scenarios = scenarioEntries.map(([id, quantity]) => {
        const scam = scamTypes.find(s => s.id === id);
        if (!scam) throw new Error(t('teacher.scenarioStaleError'));
        const max = maxAttempts[id]; // undefined = unlimited, number = limit
        return {
          id,
          scenarioId: scam.scenarioId,
          type: scam.type,
          title: scam.title,
          quantity,
          maxAttempts: max ?? null, // null = unlimited
        };
      });

      await setClassroomAssignment(selectedClassroom.id, {
        scenarios,
        deadline: deadline.toISOString(),
      });

      setQuantities({});
      setMaxAttempts({});
      setShowConfirm(false);
      router.replace('/teacher');
      alert(t('teacher.alertAssignedTitle'), t('teacher.alertAssignedMsg', { name: selectedClassroom.name }));
    } catch (e: any) {
      alert(t('teacher.alertAssignErrorTitle'), e?.message || t('teacher.alertAssignErrorMsg'));
    } finally {
      setSending(false);
    }
  };

  const hasInvalidAttemptLimit = hasInvalidAttemptLimits(quantities, maxAttempts);
  const totalSelected = Object.keys(quantities).length;
  const hasSelection = totalSelected > 0 && !hasInvalidAttemptLimit;
  const isHomeworkValid =
    totalSelected > 0 &&
    !hasInvalidAttemptLimit &&
    timeError === null &&
    selectedClassroom !== null &&
    combineDeadline(date, time).getTime() >= Date.now() + MIN_DEADLINE_LEAD_MS;

  const renderScenarioCard = (scam: ScamType) => {
    const count = quantities[scam.id] || 0;
    const isActive = count > 0;
    return (
      <View
        key={scam.id}
        className={
          isActive
            ? 'p-4 rounded-xl border-2 border-primary bg-input'
            : 'p-4 rounded-xl border-2 border-transparent bg-input'
        }
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-foreground text-lg font-bold" numberOfLines={2}>{scam.title}</Text>
            <Text className="text-primary text-xs mt-1 italic">{scam.desc}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            {isActive && (
              <TouchableOpacity
                onPress={() => updateQuantity(scam.id, -1)}
                className="bg-background p-2 rounded-lg"
              >
                <Text className="text-primary font-bold">-</Text>
              </TouchableOpacity>
            )}
            <Text className="text-foreground font-bold w-6 text-center">{count}</Text>
            <TouchableOpacity
              onPress={() => updateQuantity(scam.id, 1)}
              className="bg-primary p-2 rounded-lg"
            >
              <Text className="text-primary-foreground font-bold">+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-background">
          <Text className="text-foreground text-xs">{t('teacher.maxAttemptsLabel')}</Text>
          {maxAttempts[scam.id] === undefined || maxAttempts[scam.id] === null ? (
            <>
              <View className="bg-primary/10 px-3 py-1 rounded-full">
                <Text className="text-primary font-bold text-xs">{t('teacher.maxAttemptsUnlimited')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMaxAttempts(prev => ({ ...prev, [scam.id]: Math.max(3, count) }))}
                className="ml-1"
              >
                <Text className="text-muted-foreground text-xs underline">{t('teacher.maxAttemptsSetLimit')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  const cur = maxAttempts[scam.id] || 3;
                  if (cur <= 1) {
                    setMaxAttempts(prev => { const n = { ...prev }; delete n[scam.id]; return n; });
                  } else {
                    setMaxAttempts(prev => ({ ...prev, [scam.id]: cur - 1 }));
                  }
                }}
                className="bg-background p-1.5 rounded-lg"
              >
                <Text className="text-primary font-bold text-xs">-</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold w-5 text-center text-sm">
                {maxAttempts[scam.id] || 3}
              </Text>
              <TouchableOpacity
                onPress={() => setMaxAttempts(prev => ({ ...prev, [scam.id]: Math.min(50, (prev[scam.id] || 3) + 1) }))}
                className="bg-primary p-1.5 rounded-lg"
              >
                <Text className="text-primary-foreground font-bold text-xs">+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMaxAttempts(prev => { const n = { ...prev }; delete n[scam.id]; return n; })}
                className="ml-1"
              >
                <Text className="text-muted-foreground text-xs underline">{t('teacher.maxAttemptsUnlimited')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <View className="px-5 pt-3 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="mr-2 p-1"
        >
          <Feather name="chevron-left" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold" numberOfLines={1}>{t('teacher.assignHomeworkTitle')}</Text>

        {loadError && (
          <View className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
            <Text className="text-destructive font-medium">{loadError}</Text>
            <TouchableOpacity className="mt-3 self-start" onPress={() => void fetchData(true)}>
              <Text className="text-primary font-bold">{t('teacher.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <OnboardingTarget id="assign_homework_body" className="flex-1">
      <View className="flex-row px-5 mt-4 border-b border-input">
        {TABS.map((tab, i) => {
          const active = activeTab === i;
          const count = selectedCountFor(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => goToTab(i)}
              activeOpacity={0.7}
              className="flex-1 items-center pt-1"
            >
              <View className="flex-row items-center gap-1.5 pb-2.5">
                <Text
                  className={
                    active
                      ? 'text-primary font-bold text-sm'
                      : 'text-muted-foreground text-sm'
                  }
                >
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View className="bg-primary rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center">
                    <Text className="text-primary-foreground text-[10px] font-bold">{count}</Text>
                  </View>
                )}
              </View>
              <View className={`h-0.5 w-full rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`} />
            </TouchableOpacity>
          );
        })}
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
      >
        {TABS.map((tab) => {
          const items = grouped[tab.key] ?? [];
          return (
            <View key={tab.key} style={{ flex: 1 }}>
              <ScrollView
                className="flex-1 bg-background"
                contentContainerClassName="px-5 pt-4 pb-6 gap-3"
                refreshControl={(
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => void fetchData()}
                    tintColor={isDark ? '#F9FAFB' : '#111827'}
                  />
                )}
              >
                {loadingScenarios ? (
                  <View className="items-center py-10">
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text className="text-muted-foreground mt-2">{t('teacher.loadingScenarios')}</Text>
                  </View>
                ) : items.length === 0 ? (
                  <View className="bg-input p-5 rounded-xl items-center">
                    <Text className="text-muted-foreground">{t('teacher.noScenariosPrefix', { type: tab.label })}</Text>
                  </View>
                ) : (
                  items.map(renderScenarioCard)
                )}
              </ScrollView>
            </View>
          );
        })}
      </PagerView>

      <View className="px-5 pt-3 pb-3 bg-background border-t border-input gap-2">
        {hasInvalidAttemptLimit && (
          <Text className="text-destructive text-sm">
            {t('teacher.invalidAttemptsMsg')}
          </Text>
        )}
        <TouchableOpacity
          className={
            hasSelection
              ? 'bg-primary py-3.5 rounded-xl flex-row items-center justify-center gap-2'
              : 'bg-input py-3.5 rounded-xl flex-row items-center justify-center gap-2'
          }
          onPress={openConfirm}
          activeOpacity={0.85}
          disabled={!hasSelection}
        >
          <Text
            className={
              hasSelection
                ? 'text-primary-foreground font-semibold text-base'
                : 'text-muted-foreground font-semibold text-base'
            }
          >
            {t('teacher.sendToClassroom')}
          </Text>
          {totalSelected > 0 && (
            <View className="bg-primary-foreground/20 rounded-full min-w-[22px] h-[22px] px-1.5 items-center justify-center">
              <Text className="text-primary-foreground text-xs font-bold">{totalSelected}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      </OnboardingTarget>

      {/* Confirm sheet: classroom + deadline live here, not on the main screen */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setShowConfirm(false)}
          />
          <View className={`bg-background rounded-t-3xl max-h-[90%] ${isDark ? 'dark' : ''}`}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pt-4 pb-4 gap-5"
              keyboardShouldPersistTaps="handled"
            >
            <View className="items-center">
              <View className="w-10 h-1 rounded-full bg-input mb-1" />
            </View>
            <Text className="text-foreground text-lg font-bold">{t('teacher.confirmAssignmentTitle')}</Text>

            <View className="gap-2">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t('teacher.confirmClassroomLabel')}
              </Text>
              {classrooms.length === 0 ? (
                <View className="bg-input p-4 rounded-xl">
                  <Text className="text-muted-foreground">{t('teacher.confirmNoClassrooms')}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
                  {classrooms.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      className={`px-4 py-2 rounded-lg ${selectedClassroom?.id === c.id ? 'bg-primary' : 'bg-input'}`}
                      onPress={() => setSelectedClassroom(c)}
                    >
                      <Text
                        className={
                          selectedClassroom?.id === c.id
                            ? 'text-primary-foreground font-bold text-sm'
                            : 'text-foreground text-sm'
                        }
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            <View className="gap-2">
              <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t('teacher.confirmDeadlineLabel')}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TouchableOpacity
                    className="bg-input rounded-xl px-3 py-3 flex-row items-center gap-2"
                    onPress={() => setShowPicker(true)}
                  >
                    <Feather name="calendar" size={18} color="#6B7280" />
                    <Text className="text-foreground text-sm font-medium">
                      {date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  {showPicker && (
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="default"
                      minimumDate={minDate}
                      onValueChange={onDateChange}
                      onDismiss={() => setShowPicker(false)}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <TouchableOpacity
                    className="bg-input rounded-xl px-3 py-3 flex-row items-center gap-2"
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Feather name="clock" size={18} color="#6B7280" />
                    <Text className="text-foreground text-sm font-medium">
                      {time.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={time}
                      mode="time"
                      display="default"
                      minimumDate={minDate}
                      onValueChange={onTimeChange}
                      onDismiss={() => setShowTimePicker(false)}
                    />
                  )}
                </View>
              </View>
              {timeError && (
                <Text className="text-destructive text-sm font-medium">{timeError}</Text>
              )}
            </View>
            </ScrollView>

            <View
              className="px-5 pt-3 border-t border-border flex-row gap-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <TouchableOpacity
                className="bg-input w-1/3 items-center justify-center py-4 rounded-xl"
                onPress={() => setShowConfirm(false)}
                disabled={sending}
              >
                <Text className="text-foreground font-semibold text-base">{t('teacher.backButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={
                  isHomeworkValid
                    ? 'flex-1 bg-primary py-4 rounded-xl items-center justify-center'
                    : 'flex-1 bg-input py-4 rounded-xl items-center justify-center'
                }
                onPress={handleAssign}
                activeOpacity={0.85}
                disabled={!isHomeworkValid || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    className={
                      isHomeworkValid
                        ? 'text-primary-foreground font-semibold text-base'
                        : 'text-muted-foreground font-semibold text-base'
                    }
                  >
                    {selectedClassroom ? t('teacher.assignButtonPrefix', { name: selectedClassroom.name }) : t('teacher.assignButtonPlain')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
