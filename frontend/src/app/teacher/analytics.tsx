import { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from "@/context/themeContext";
import { Feather } from '@expo/vector-icons';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { listClassrooms, listClassroomStudents, getStudentResults } from '@/api/classrooms';
import { useTranslation } from 'react-i18next';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { colors } from '@/styles/global';

type AnalyticsStudent = {
  studentUid: string;
  displayName: string;
  classroomId: string;
};

type WatchlistStudent = {
  key: string;
  studentUid: string;
  name: string;
  score: number;
  classroomId: string;
};

export default function AnalyticsScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [activeHelper, setActiveHelper] = useState<'vuln' | 'student' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const [vulnerabilityData, setVulnerabilityData] = useState<Array<{ id: string; title: string; failRate: number }>>([]);
  const [studentWatchlist, setStudentWatchlist] = useState<WatchlistStudent[]>([]);

  const fetchAnalytics = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);

    try {
      const classes = await listClassrooms();
      const studentGroups = await Promise.all(
        classes.map(async (classroom) => {
          const students = await listClassroomStudents(classroom.id);
          return students.map<AnalyticsStudent>((student) => ({
            studentUid: student.studentUid,
            displayName: student.displayName || student.email || t('teacher.unknownStudent'),
            classroomId: classroom.id,
          }));
        }),
      );
      const allStudents = studentGroups.flat();
      const resultRows = await Promise.all(
        allStudents.map(async (student) => ({
          student,
          results: await getStudentResults(student.classroomId, student.studentUid, { includeSummary: true }),
        })),
      );

      const studentScores: WatchlistStudent[] = [];
      const scenarioStats: Record<string, { total: number; correct: number; title: string }> = {};

      for (const { student, results } of resultRows) {
        if (!results.summary || results.summary.totalAttempts === 0) continue;

        const accuracy = Math.max(0, Math.min(100, Math.round(results.summary.accuracy * 100)));
        studentScores.push({
          key: `${student.classroomId}:${student.studentUid}`,
          studentUid: student.studentUid,
          name: student.displayName,
          score: accuracy,
          classroomId: student.classroomId,
        });

        for (const [scenarioType, stats] of Object.entries(results.summary.byScenarioType)) {
          if (!scenarioStats[scenarioType]) {
            const title =
              scenarioType === 'phone_call' ? t('teacher.scenarioTypePhoneCall') :
              scenarioType === 'whatsapp' ? t('teacher.scenarioTypeWhatsapp') :
              scenarioType === 'marketplace' ? t('teacher.scenarioTypeMarketplace') :
              scenarioType;
            scenarioStats[scenarioType] = { total: 0, correct: 0, title };
          }
          scenarioStats[scenarioType].total += stats.total;
          scenarioStats[scenarioType].correct += stats.correct;
        }
      }

      const vulnData = Object.entries(scenarioStats).map(([id, stats]) => ({
        id,
        title: stats.title,
        failRate: stats.total > 0
          ? Math.max(0, Math.min(100, Math.round((1 - stats.correct / stats.total) * 100)))
          : 0,
      }));

      if (currentRequest !== requestId.current) return;
      setVulnerabilityData(vulnData);
      setStudentWatchlist(studentScores.sort((a, b) => a.score - b.score));
      setError(null);
    } catch (e: any) {
      if (currentRequest === requestId.current) {
        setError(e?.message || t('teacher.fallbackAnalyticsError'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void fetchAnalytics();
      return () => {
        requestId.current += 1;
      };
    }, [fetchAnalytics]),
  );

  const displayedStudents = isExpanded ? studentWatchlist : studentWatchlist.slice(0, 3);
  const hasMoreStudents = studentWatchlist.length > 3;

  // Dynamic Risk Assessment Calculation using colour scale (More red = Higher fail rate)
  const getRiskAssessment = (rate: number, isDark: boolean) => {
    const cappedRate = Math.max(0, Math.min(rate, 100));
    const hue = 120 - (cappedRate * 1.2);
    
    const textLightness = isDark ? 60 : 35;
    const colour = `hsl(${hue}, 85%, ${textLightness}%)`;
    const bgColour = `hsla(${hue}, 85%, 50%, 0.15)`;

    return { colour, bgColour };
  };

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color={colors.primary}/>
        <Text className="text-muted-foreground mt-4">{t('teacher.loadingAnalytics')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className={`flex-1 bg-background items-center justify-center px-6 ${isDark ? 'dark' : ''}`}>
        <Feather name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-destructive text-lg font-bold mt-4 text-center">{error}</Text>
        <View className="flex-row gap-5 mt-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-muted-foreground font-bold">{t('teacher.goBack')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void fetchAnalytics(true)}>
            <Text className="text-primary font-bold">{t('teacher.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hasData = vulnerabilityData.length > 0 || studentWatchlist.length > 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="mr-2 p-1"
        >
          <Feather name="chevron-left" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="text-foreground text-xl font-bold">{t('teacher.analyticsTitle')}</Text>
      </View>

      {!hasData ? (
        <OnboardingTarget id="analytics_body" className="flex-1">
          <View className="flex-1 items-center justify-center px-6">
            <Feather name="bar-chart-2" size={48} color="#6B7280" />
            <Text className="text-muted-foreground text-lg font-bold mt-4">{t('teacher.noDataTitle')}</Text>
            <Text className="text-muted-foreground text-sm text-center mt-2">
              {t('teacher.noDataDesc')}
            </Text>
            <TouchableOpacity className="mt-5" onPress={() => void fetchAnalytics(true)}>
              <Text className="text-primary font-bold">{t('teacher.refresh')}</Text>
            </TouchableOpacity>
          </View>
        </OnboardingTarget>
      ) : (
      <OnboardingTarget id="analytics_body" className="flex-1">
      <ScrollView
        contentContainerClassName="p-5 gap-8"
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchAnalytics()}
            tintColor={isDark ? '#F9FAFB' : '#111827'}
          />
        )}
      >
        <View className="z-50">
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-foreground text-lg font-bold">
              {t('teacher.vulnerabilityTitle')}
            </Text>

            <TouchableOpacity
              onPress={() => setActiveHelper('vuln')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="info" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          <View className="gap-4">
            {vulnerabilityData.map((item) => {
            const risk = getRiskAssessment(item.failRate, isDark);
        
            return (
              <View key={item.id} className="bg-input p-4 rounded-xl border-l-4" style={{ borderLeftColor: risk.colour }}>
                <View className="flex-row justify-between items-end mb-4">
                  <View>
                    <Text className="text-foreground font-bold text-base">{item.title}</Text>
                  </View>
                  <Text
                    className="text-lg font-bold rounded-xl px-4 py-1"
                    style={{ color: risk.colour, backgroundColor: risk.bgColour }}
                  >
                    {item.failRate}%
                  </Text>
                </View>

                <View className="h-2.5 w-full bg-background rounded-full overflow-hidden mb-1">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${item.failRate}%`,
                      backgroundColor: risk.colour
                    }}
                  />
                </View>
              </View>
            );
            })}
          </View>
        </View>

        <View className="z-50">
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-foreground text-lg font-bold">
              {t('teacher.studentFailRateTitle')}
            </Text>

            <TouchableOpacity
              onPress={() => setActiveHelper('student')}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="info" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          <Animated.View 
            layout={LinearTransition.springify().damping(20).stiffness(80)} 
            className="bg-input rounded-2xl p-2 overflow-hidden"
          >
            {displayedStudents.map((student, index) => {
              const showBottomBorder = index !== displayedStudents.length - 1 || (!isExpanded && hasMoreStudents);
              const failRate = 100 - student.score;
              const risk = getRiskAssessment(failRate, isDark);
              return (
                <TouchableOpacity 
                  key={student.key}
                  onPress={() => router.push({
                    pathname: '/teacher/view-student/[id]',
                    params: { id: student.studentUid, classroomId: student.classroomId },
                  })}
                  activeOpacity={0.7}
                  className={`flex-row justify-between items-center p-3 ${showBottomBorder ? 'border-b border-background' : ''}`}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-background rounded-full items-center justify-center">
                      <Feather name="user" size={16} color="#9CA3AF" />
                    </View>
                    <Text className="text-foreground font-medium text-base">{student.name}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="px-3 py-1 rounded-xl" style={{ backgroundColor: risk.bgColour }}>
                      <Text className="font-bold" style={{ color: risk.colour }}>{failRate}%</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#9CA3AF"/>
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasMoreStudents && (
              <TouchableOpacity 
                onPress={() => setIsExpanded(!isExpanded)}
                className="flex-row items-center justify-center py-4 gap-2"
                activeOpacity={0.7}
              >
                <Text className="text-primary font-bold text-sm">
                  {isExpanded ? t('teacher.viewLess') : t('teacher.viewMore')}
                </Text>
                <Feather 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </ScrollView>
      </OnboardingTarget>
      )}

      {/* A5: Info helper modal - centered & constrained so translated text never overflows the screen */}
      <Modal
        visible={activeHelper !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveHelper(null)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-center px-6"
          activeOpacity={1}
          onPress={() => setActiveHelper(null)}
        >
          <View className={`bg-background rounded-2xl p-6 w-full max-w-sm ${isDark ? 'dark' : ''}`}>
            <Text className="text-foreground text-base leading-6">
              {activeHelper === 'vuln'
                ? t('teacher.vulnerabilityHelper')
                : activeHelper === 'student'
                ? t('teacher.studentFailRateHelper')
                : ''}
            </Text>
            <TouchableOpacity
              className="self-end mt-4"
              onPress={() => setActiveHelper(null)}
            >
              <Text className="text-primary font-bold">{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
