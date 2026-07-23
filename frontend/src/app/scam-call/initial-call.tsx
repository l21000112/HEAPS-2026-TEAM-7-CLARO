import { callStyles } from "../../styles/scam-call";
import IncomingStatus from "../../components/scam-call/IncomingStatus";
import CallerProfile from "../../components/scam-call/CallerProfile";
import CallButtons from "../../components/scam-call/CallButtons";

import { CallSession } from '../../features/scam-call/models';
import { performCallAction, startCallSession } from "../../api/scam-call";
import { isFinishedAssignmentError, useBlockNavigationWhile } from '@/lib/useCompletionNavigation';
import { useSimpleLanguage } from '@/context/simpleLanguageContext';

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View, Vibration } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { translateCallScenario } from '@/lib/scenarioI18n';
import { useAppAlert } from '@/context/AppAlertContext';

export default function ScamCallScreen() {
  const router = useRouter();
  const { alert } = useAppAlert();
  const params = useLocalSearchParams();
  const { simpleLanguage, ready: simpleLanguageReady } = useSimpleLanguage();
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<CallSession | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const scenario = session?.scenario ?? null;
  const displayScenario = scenario ? translateCallScenario(scenario, i18n.language) : null;

  const audioSource = require('../../../assets/audio/ringtone.mp3');
  const player = useAudioPlayer(audioSource);

  // Refs back the 10s auto-decline timeout
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHandledRef = useRef(false);
  const sessionRequestKeyRef = useRef<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const allowNextNavigation = useBlockNavigationWhile(isActionLoading);

  const handleUserActionRef = useRef<((action: 'Answer' | 'Decline') => Promise<void>) | null>(null);

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
    isHandledRef.current = false;
    setCountdown(10);
    setSession(null);
    setLoadingScenario(true);
    startCallSession({
      classroomId: typeof params.classroomId === 'string' ? params.classroomId : undefined,
      assignmentId: typeof params.assignmentId === 'string' ? params.assignmentId : undefined,
      assignmentItemId: typeof params.assignmentItemId === 'string' ? params.assignmentItemId : undefined,
      simpleLanguage,
    })
      .then((startedSession) => {
        if (sessionRequestKeyRef.current === requestKey) {
          setSession(startedSession);
        }
      })
      .catch((error) => {
        alert(
          t('call.alertScenarioUnavailableTitle'),
          error instanceof Error ? error.message : t('call.alertScenarioUnavailableMsg'),
        );
        if (isFinishedAssignmentError(error)) {
          router.dismissTo('/student');
        }
      })
      .finally(() => {
        if (sessionRequestKeyRef.current === requestKey) {
          setLoadingScenario(false);
        }
      });
  }, [params.classroomId, params.assignmentId, params.assignmentItemId, simpleLanguage, simpleLanguageReady]);

  useEffect(() => {
    if (!scenario) return;
    // wait 0ms, vibrate 1000ms, pause 1000ms
    const PATTERN = [0, 1000, 1000];
    Vibration.vibrate(PATTERN, true);
    player.loop = true;
    player.play();

    timerRef.current = setTimeout(() => {
      if (!isHandledRef.current) {
        handleUserActionRef.current?.('Decline');
      }
    }, 10000);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      Vibration.cancel();
      try {
        if (player) {
          player.pause();
        }
      } catch (error) {
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [player, scenario]); 

  const handleUserAction = async (action: 'Answer' | 'Decline') => {
    if (!scenario || !session || isHandledRef.current) return;
    Vibration.cancel();
    player.pause();
    isHandledRef.current = true;
    setIsActionLoading(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (action === 'Answer') {
      allowNextNavigation();
      router.replace({
        pathname: './mid-call',
        params: { sessionId: session.sessionId }
      });
      return;
    }

    try {
      const { evaluation } = await performCallAction(session.sessionId, 'decline');
      allowNextNavigation();
      router.replace({
        pathname: './result',
        params: {
          callerName: scenario.callerName,
          scenarioId: String(scenario.id),
          sessionId: session.sessionId,
          classroomId: session.assignment?.classroomId,
          assignmentId: session.assignment?.assignmentId,
          assignmentItemId: session.assignment?.assignmentItemId,
          isCorrect: String(evaluation.isCorrect),
          reason: evaluation.reason,
        }
      });
    } catch (error) {
      isHandledRef.current = false;
      setIsActionLoading(false);
      alert(
        t('call.alertDeclineFailedTitle'),
        error instanceof Error ? error.message : t('call.alertDeclineFailedMsg'),
      );
    }
  };

  handleUserActionRef.current = handleUserAction;

  return (
    <SafeAreaView style={{ flex: 1 }} className={`bg-background`}>
      <Stack.Screen options={{ gestureEnabled: !isActionLoading }} />
      <View style={callStyles.container}>
        {loadingScenario ? (
          <>
            <ActivityIndicator color="#ffffff" size="large" />
            <Text style={{ color: '#cbd5e1', marginTop: 16 }}>{t('call.loading')}</Text>
          </>
        ) : scenario ? (
          <>
        
            <IncomingStatus />

            <CallerProfile callerName={displayScenario?.callerName ?? scenario.callerName} />

            <Text style={{ color: countdown <= 3 ? '#fca5a5' : '#cbd5e1', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
              {t('call.autoDeclineIn', { n: countdown })}
            </Text>

            <CallButtons onAction={handleUserAction} disabled={isActionLoading} />
          </>
        ) : (
          <>
            <Text style={{ color: '#cbd5e1', marginBottom: 16 }}>{t('call.couldNotLoad')}</Text>
            <TouchableOpacity style={callStyles.buttonResult} onPress={() => router.dismissTo('/student')}>
              <Text style={callStyles.buttonResultText}>{t('common.backToHome')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
