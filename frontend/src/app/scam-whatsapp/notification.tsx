import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { translateWhatsAppScenario } from '@/lib/scenarioI18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/themeContext';
import { useSimpleLanguage } from '@/context/simpleLanguageContext';
import { whatsAppStyles } from '@/styles/scam-whatsapp';
import { startBackendSession, backendPerformAction } from '@/api/backend';
import { WhatsAppSession } from '@/features/scam-whatsapp/models';
import { isFinishedAssignmentError, useBlockNavigationWhile } from '@/lib/useCompletionNavigation';
import { useAuth } from '@/context/AuthContext';
import { personalizeScenarioText } from '@/lib/scenarioText';
import { useAppAlert } from '@/context/AppAlertContext';

export default function WhatsAppNotificationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { alert } = useAppAlert();
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const { isDark } = useTheme();
  const { simpleLanguage, ready: simpleLanguageReady } = useSimpleLanguage();
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [isScenarioLoading, setIsScenarioLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const isActionLoadingRef = useRef(false);
  const sessionRequestKeyRef = useRef<string | null>(null);
  const allowNextNavigation = useBlockNavigationWhile(isActionLoading);

  useEffect(() => {
    if (!simpleLanguageReady) return;

    const requestKey = [
      params.classroomId,
      params.assignmentId,
      params.assignmentItemId,
      simpleLanguage ? 'simple' : 'default',
    ]
      .map((value) => (typeof value === 'string' ? value : ''))
      .join(':');
    if (sessionRequestKeyRef.current === requestKey) return;

    sessionRequestKeyRef.current = requestKey;
    setSession(null);
    setLoadError(null);
    setIsScenarioLoading(true);
    startBackendSession({
      classroomId: typeof params.classroomId === 'string' ? params.classroomId : undefined,
      assignmentId: typeof params.assignmentId === 'string' ? params.assignmentId : undefined,
      assignmentItemId: typeof params.assignmentItemId === 'string' ? params.assignmentItemId : undefined,
      simpleLanguage,
      language: i18n.language,
    })
      .then((data) => {
        if (sessionRequestKeyRef.current === requestKey) {
          setSession(data);
        }
      })
      .catch((error) => {
        if (sessionRequestKeyRef.current !== requestKey) return;
        setLoadError(error instanceof Error ? error.message : t('whatsapp.fallbackLoadError'));
        alert(
          t('whatsapp.alertScenarioUnavailableTitle'),
          error instanceof Error ? error.message : t('whatsapp.alertScenarioUnavailableMsg'),
        );
        if (isFinishedAssignmentError(error)) {
          router.dismissTo('/student');
        }
      })
      .finally(() => {
        if (sessionRequestKeyRef.current === requestKey) {
          setIsScenarioLoading(false);
        }
      });
  }, [params.classroomId, params.assignmentId, params.assignmentItemId, simpleLanguage, simpleLanguageReady]);

  const displayScenario = session?.scenario
    ? translateWhatsAppScenario(session.scenario, i18n.language)
    : null;
  const preview = displayScenario?.openingMessages?.[0];
  const previewText = preview ? personalizeScenarioText(preview.body, profile?.displayName) : '';
  const contactName = displayScenario?.contact?.displayName ?? t('whatsapp.contactFallback');

  const openThread = () => {
    if (!session || isActionLoadingRef.current) return;
    isActionLoadingRef.current = true;
    setIsActionLoading(true);
    allowNextNavigation();
    router.replace({
      pathname: './thread',
      params: { sessionId: session.sessionId },
    });
  };

  const ignoreMessage = async () => {
    if (!session || isActionLoadingRef.current) return;
    
    isActionLoadingRef.current = true;
    setIsActionLoading(true);
    try {
      // Tell the backend user ignored the message
      const { evaluation } = await backendPerformAction(session.sessionId, 'ignore');
      allowNextNavigation();
      router.replace({
        pathname: './result',
        params: {
          contactName: session.scenario.contact.displayName,
          scenarioId: String(session.scenario.id),
          sessionId: session.sessionId,
          classroomId: session.assignment?.classroomId,
          assignmentId: session.assignment?.assignmentId,
          assignmentItemId: session.assignment?.assignmentItemId,
          isCorrect: String(evaluation.isCorrect),
          reason: evaluation.reason,
          redFlags: JSON.stringify(evaluation.redFlags ?? []),
        },
      });
    } catch (error) {
      alert(t('whatsapp.alertErrorTitle'), error instanceof Error ? error.message : t('whatsapp.alertErrorMsg'));
      if (isFinishedAssignmentError(error)) {
        allowNextNavigation();
        router.dismissTo('/student');
        return;
      }
      isActionLoadingRef.current = false;
      setIsActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <Stack.Screen options={{ gestureEnabled: !isActionLoading }} />
      <View style={whatsAppStyles.container}>
        {isScenarioLoading ? <ActivityIndicator color="#25d366" size="large" /> : null}
        {loadError ? <Text className="text-red-500 px-6 text-center">{loadError}</Text> : null}
        {loadError ? (
          <TouchableOpacity style={whatsAppStyles.primaryButton} onPress={() => router.dismissTo('/student')} className='bg-primary'>
            <Text style={whatsAppStyles.buttonText}>{t('common.backToHome')}</Text>
          </TouchableOpacity>
        ) : null}
        <Text className="text-primary px-6">{t('whatsapp.newMessage')}</Text>
        <View style={whatsAppStyles.notificationCard} className='bg-input'>
          <Text style={whatsAppStyles.notificationApp}>{t('whatsapp.appLabel')}</Text>
          <Text style={whatsAppStyles.notificationTitle} className='text-primary'>{contactName}</Text>
          <Text style={whatsAppStyles.notificationBody} numberOfLines={3} className='text-foreground'>
            {previewText || t('whatsapp.loading')}
          </Text>
        </View>

        <View style={whatsAppStyles.buttonRow}>
          <TouchableOpacity
            style={[whatsAppStyles.secondaryButton, isActionLoading ? { opacity: 0.6 } : null]}
            onPress={ignoreMessage}
            disabled={!session || isActionLoading}
            className='bg-red-500'
          >
            <Text style={whatsAppStyles.buttonText}>{t('whatsapp.ignore')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[whatsAppStyles.primaryButton, isActionLoading ? { opacity: 0.6 } : null]}
            onPress={openThread}
            disabled={!session || isActionLoading}
            className='bg-primary'
          >
            <Text style={whatsAppStyles.buttonText}>{t('whatsapp.open')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
