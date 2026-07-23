import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from "@/context/themeContext";
import { useTranslation } from 'react-i18next';
import { getStudentResults, type StudentResult } from '@/api/classrooms';

export default function StudentAnalyticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    classroomId?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const classroomId = Array.isArray(params.classroomId) ? params.classroomId[0] : params.classroomId;
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StudentResult | null>(null);
  const [expandedAttempts, setExpandedAttempts] = useState<Set<string>>(new Set());
  const requestId = useRef(0);

  const fetchResults = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (!id || !classroomId) {
      setResults(null);
      setError(t('teacher.missingIds'));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getStudentResults(classroomId, id, { includeSummary: true });
      if (currentRequest !== requestId.current) return;
      setResults(data);
      setError(null);
    } catch (e: any) {
      if (currentRequest === requestId.current) {
        setError(e?.message || t('teacher.fallbackStudentLoadError'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [classroomId, id]);

  useFocusEffect(
    useCallback(() => {
      void fetchResults();
      return () => {
        requestId.current += 1;
      };
    }, [fetchResults]),
  );

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-muted-foreground mt-4">{t('teacher.loadingStudent')}</Text>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View className={`flex-1 bg-background items-center justify-center px-6 ${isDark ? 'dark' : ''}`}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-destructive text-lg font-bold mt-4 text-center">{error || t('teacher.studentNotFound')}</Text>
        <View className="flex-row gap-5 mt-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-muted-foreground font-bold">{t('teacher.goBack')}</Text>
          </TouchableOpacity>
          {id && classroomId ? (
            <TouchableOpacity onPress={() => void fetchResults(true)}>
              <Text className="text-primary font-bold">{t('teacher.tryAgain')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  const { student, attempts, summary } = results;
  const displayName = student.displayName || student.email || t('teacher.studentFallbackName');
  const accuracy = summary ? Math.max(0, Math.min(100, Math.round(summary.accuracy * 100))) : 0;
  const totalAttempts = summary?.totalAttempts || attempts.length;

  // Color by correctness
  const correctnessColor = (isCorrect: boolean) => isCorrect ? '#10B981' : '#EF4444';
  const correctnessBg = (isCorrect: boolean) => isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10';

  // A6.3: Attempt history expand/collapse - collapsed by default on first load.
  const allExpanded = attempts.length > 0 && expandedAttempts.size === attempts.length;
  const toggleAttempt = (key: string) => {
    setExpandedAttempts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleAllAttempts = () => {
    if (allExpanded) {
      setExpandedAttempts(new Set());
    } else {
      setExpandedAttempts(new Set(attempts.map((a, idx) => a.id || String(idx))));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <View className="px-5 pt-4 pb-4 flex-row items-center border-b border-input">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-2 p-1"
        >
          <Feather name="chevron-left" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="text-primary text-xl font-bold">{t('teacher.studentProfileTitle')}</Text>
      </View>

      <ScrollView
        contentContainerClassName="p-5 gap-5"
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchResults()}
            tintColor={isDark ? '#F9FAFB' : '#111827'}
          />
        )}
      >

        <View className="bg-input p-6 rounded-3xl items-center">
          <View className="w-20 h-20 bg-background rounded-full items-center justify-center mb-3">
            <Feather name="user" size={32} color="#9CA3AF" />
          </View>
          <Text className="text-primary text-2xl font-bold">{displayName}</Text>
          <Text className="text-foreground text-sm mt-1">{t('teacher.studentAttemptsShown', { total: totalAttempts, shown: attempts.length })}</Text>
          <View className="flex-row gap-2 mt-4 w-full">
            <View className="bg-emerald-500/10 px-2 py-2 rounded-xl items-center flex-1">
              <Text className="text-emerald-500 font-bold text-lg">{summary?.correctAttempts || 0}</Text>
              <Text className="text-emerald-500/70 text-xs">{t('teacher.statCorrect')}</Text>
            </View>
            <View className="bg-red-500/10 px-2 py-2 rounded-xl items-center flex-1">
              <Text className="text-red-500 font-bold text-lg">{Math.max(0, totalAttempts - (summary?.correctAttempts || 0))}</Text>
              <Text className="text-red-500/70 text-xs">{t('teacher.statIncorrect')}</Text>
            </View>
            <View className="bg-primary/10 px-2 py-2 rounded-xl items-center flex-1">
              <Text className="text-primary font-bold text-lg">{accuracy}%</Text>
              <Text className="text-primary/70 text-xs">{t('teacher.statAccuracy')}</Text>
            </View>
          </View>
        </View>

        {summary?.byScenarioType && Object.keys(summary.byScenarioType).length > 0 && (
          <View className="bg-input p-4 rounded-2xl">
            <Text className="text-foreground text-lg font-bold mb-4">{t('teacher.byScenarioType')}</Text>
            {Object.entries(summary.byScenarioType).map(([type, stats]) => {
              // A6.1: Ensure every scenario type renders a proper label, not the raw key.
              const typeLabel =
                type === 'phone_call' ? t('teacher.scenarioTypePhoneCall') :
                type === 'whatsapp' ? t('teacher.scenarioTypeWhatsapp') :
                type === 'marketplace' ? t('teacher.scenarioTypeMarketplace') :
                type;
              const pct = Math.max(0, Math.min(100, Math.round(stats.accuracy * 100)));
              return (
                <View key={type} className="mb-4 last:mb-0">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-foreground text-sm font-medium">{typeLabel}</Text>
                    <Text className="text-muted-foreground text-sm">{stats.correct}/{stats.total} ({pct}%)</Text>
                  </View>
                  <View className="h-2.5 bg-background rounded-full overflow-hidden">
                    <View className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-foreground text-lg font-bold">
              {t('teacher.attemptHistoryTitle', { count: attempts.length })}
            </Text>
            {attempts.length > 0 && (
              <TouchableOpacity
                onPress={toggleAllAttempts}
                className="flex-row items-center gap-1"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-primary font-bold text-sm">
                  {allExpanded ? t('teacher.collapseAll') : t('teacher.expandAll')}
                </Text>
                <Feather
                  name={allExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6366F1"
                />
              </TouchableOpacity>
            )}
          </View>

          {attempts.length === 0 ? (
            <View className="bg-input p-5 rounded-2xl items-center">
              <Text className="text-muted-foreground">{t('teacher.noAttempts')}</Text>
            </View>
          ) : (
            <View className="gap-2">
              {attempts.map((attempt, idx) => {
                const attemptKey = attempt.id || String(idx);
                const isExpanded = expandedAttempts.has(attemptKey);
                const scenarioLabel = attempt.scenarioType === 'phone_call'
                  ? t('teacher.scenarioTypePhoneCall') : attempt.scenarioType === 'whatsapp'
                  ? t('teacher.scenarioTypeWhatsapp') : attempt.scenarioType === 'marketplace'
                  ? t('teacher.scenarioTypeMarketplace') : attempt.scenarioType;
                const createdAt = attempt.createdAt ? new Date(attempt.createdAt) : null;
                const dateStr = createdAt && !Number.isNaN(createdAt.getTime())
                  ? createdAt.toLocaleDateString('en-SG', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : '';

                return (
                  <TouchableOpacity
                    key={attemptKey}
                    className={`p-4 rounded-xl border-l-4 ${correctnessBg(attempt.isCorrect)}`}
                    style={{ borderLeftColor: correctnessColor(attempt.isCorrect) }}
                    onPress={() => toggleAttempt(attemptKey)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-foreground font-bold text-sm">{scenarioLabel}</Text>
                          <View className={`px-2 py-0.5 rounded-full ${
                            attempt.isCorrect ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                            <Text className={`text-xs font-bold ${
                              attempt.isCorrect ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {attempt.isCorrect ? t('teacher.correctBadge') : t('teacher.incorrectBadge')}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-muted-foreground text-xs mt-1">{dateStr}</Text>
                      </View>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9CA3AF"
                      />
                    </View>

                    {isExpanded && (
                      <View className="mt-3 pt-3 border-t border-background gap-2">
                        {attempt.selectedOptionId && (
                          <View>
                            <Text className="text-muted-foreground text-xs font-bold mb-1">{t('teacher.selectedOptionLabel')}</Text>
                            <Text className="text-foreground text-sm">{t('teacher.selectedOptionValue', { id: attempt.selectedOptionId })}</Text>
                          </View>
                        )}
                        <View>
                          <Text className="text-muted-foreground text-xs font-bold mb-1">{t('teacher.reasoningLabel')}</Text>
                          <Text className="text-foreground text-sm">{attempt.reason}</Text>
                        </View>
                        {attempt.durationSeconds !== undefined && (
                          <View>
                            <Text className="text-muted-foreground text-xs font-bold mb-1">{t('teacher.timeTakenLabel')}</Text>
                            <Text className="text-foreground text-sm">{attempt.durationSeconds}s</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
