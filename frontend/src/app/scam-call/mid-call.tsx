import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/context/themeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { callStyles } from "../../styles/scam-call";
import { globalStyles } from "../../styles/global";
import CallTimer from '../../components/scam-call/CallTimer';
import DialogueOptionButton from '../../components/scam-call/DialogueOption';
import { useAuth } from '@/context/AuthContext';
import { personalizeScenarioText } from '@/lib/scenarioText';

import { CallSession, DialogueOption } from "../../features/scam-call/models";
import { getCallSession, performCallAction, submitCallAnswer } from '../../api/scam-call';
import { isFinishedAssignmentError, useBlockNavigationWhile } from '@/lib/useCompletionNavigation';
import { useTranslation } from 'react-i18next';
import { translateCallScenario } from '@/lib/scenarioI18n';
import { speakCallDialogue, stopCallSpeech } from '@/lib/callSpeech';
import { useAppAlert } from '@/context/AppAlertContext';

// Fisher-Yates (Knuth) shuffle - uniform random permutation.
const randomizeOptions = (array: DialogueOption[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function MidCallScreen() {
  const router = useRouter();
  const { alert } = useAppAlert();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { sessionId: sessionIdParam } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const sessionId = typeof sessionIdParam === 'string' ? sessionIdParam : '';
  const [session, setSession] = useState<CallSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [options, setOptions] = useState<DialogueOption[]>([]);
  const scenario = session?.scenario ?? null;
  const allowNextNavigation = useBlockNavigationWhile(isSubmitting);
  const displayScenario = scenario
    ? translateCallScenario({ ...scenario, options }, i18n.language)
    : null;
  const dialogueText = displayScenario
    ? personalizeScenarioText(displayScenario.dialogue, profile?.displayName)
    : '';

  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      alert(t('call.alertSessionMissingTitle'), t('call.alertSessionMissingMsg'));
      setLoadError(t('call.thisCallSessionMissing'));
      setIsSessionLoading(false);
      return;
    }

    getCallSession(sessionId)
      .then((loadedSession) => {
        setSession(loadedSession);
        setOptions(randomizeOptions(loadedSession.scenario.options ?? []));
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : t('call.couldNotLoadThisCall'));
        alert(
          t('call.alertSessionUnavailableTitle'),
          error instanceof Error ? error.message : t('call.alertSessionUnavailableMsg'),
        );
      })
      .finally(() => setIsSessionLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!scenario || !session) return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    void speakCallDialogue(dialogueText, i18n.language);

    // Stops TTS audio if they navigate away early
    return () => {
      clearInterval(interval);
      stopCallSpeech();
    };
  }, [scenario, session, dialogueText, i18n.language]);

  const replaySpeech = (dialogue: string) => {
    void speakCallDialogue(dialogue, i18n.language);
  };

  const handleChoice = async (option: DialogueOption) => {
    if (!scenario || !session || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    stopCallSpeech();
    try {
      const { evaluation } = await submitCallAnswer(sessionId, option.id);
      allowNextNavigation();
      router.replace({
        pathname: './result',
        params: { 
          callerName: scenario.callerName, 
          scenarioId: String(scenario.id),
          sessionId,
          classroomId: session.assignment?.classroomId,
          assignmentId: session.assignment?.assignmentId,
          assignmentItemId: session.assignment?.assignmentItemId,
          selectedOptionId: String(option.id),
          durationSeconds: String(seconds),
          isCorrect: String(evaluation.isCorrect),
          reason: evaluation.reason
        }
      });
    } catch (error) {
      if (isFinishedAssignmentError(error)) {
        alert(t('call.alertCallCompletedTitle'), error instanceof Error ? error.message : t('call.alertCallCompletedMsg'));
        allowNextNavigation();
        router.dismissTo('/student');
        return;
      }
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      alert(t('call.alertCouldNotScoreTitle'), error instanceof Error ? error.message : t('call.alertCouldNotScoreMsg'));
    }
  };

  // handles mid-call hang up, can sometimes be good or bad depending if call is a scam
  const handleMidCallHangup = async () => {
    if (!scenario || !session || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    stopCallSpeech();
    try {
      const { evaluation } = await performCallAction(sessionId, 'hangup');
      allowNextNavigation();
      router.replace({
        pathname: './result',
        params: { 
          callerName: scenario.callerName, 
          scenarioId: String(scenario.id),
          sessionId,
          classroomId: session.assignment?.classroomId,
          assignmentId: session.assignment?.assignmentId,
          assignmentItemId: session.assignment?.assignmentItemId,
          selectedOptionId: 'hangup',
          durationSeconds: String(seconds),
          isCorrect: String(evaluation.isCorrect),
          reason: evaluation.reason
        }
      });
    } catch (error) {
      if (isFinishedAssignmentError(error)) {
        alert(t('call.alertCallCompletedTitle'), error instanceof Error ? error.message : t('call.alertCallCompletedMsg'));
        allowNextNavigation();
        router.dismissTo('/student');
        return;
      }
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      alert(t('call.alertCouldNotEndTitle'), error instanceof Error ? error.message : t('call.alertCouldNotEndMsg'));
    }
  };

  if (isSessionLoading) {
    return (
      <View style={globalStyles.container}>
        <Stack.Screen options={{ gestureEnabled: true }} />
        <ActivityIndicator color="#ffffff" size="large" />
        <Text style={{ color: '#cbd5e1', marginTop: 16 }}>{t('call.loadingCall')}</Text>
      </View>
    );
  }

  if (!scenario || loadError) {
    return (
      <View style={globalStyles.container}>
        <Stack.Screen options={{ gestureEnabled: true }} />
        <Text style={{ color: '#cbd5e1', marginBottom: 16, textAlign: 'center' }}>
          {loadError || t('call.couldNotLoadThisCall')}
        </Text>
        <TouchableOpacity style={callStyles.buttonResult} onPress={() => router.dismissTo('/student')}>
          <Text style={callStyles.buttonResultText}>{t('common.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className={`bg-background`}>
      <Stack.Screen options={{ gestureEnabled: !isSubmitting }} />
      <View style={globalStyles.container} className={`bg-background ${isDark ? 'dark' : ''}`}>

      <CallTimer seconds={seconds} />
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 20, marginBottom: 30 }} className='text-primary'>
        {displayScenario?.callerName}
      </Text>

        <View style={callStyles.dialogueBox}>
          <View className='flex-row justify-between items-center'>
            <Text style={callStyles.dialogueLabel}>{t('call.theySaid')}</Text>
            <View className='flex-row gap-x-3'>
              <TouchableOpacity onPress={() => { stopCallSpeech(); }}>
                <MaterialIcons name='stop' size={18} color={"#94a3b8"}></MaterialIcons>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {replaySpeech(dialogueText)}}
                accessibilityRole="button"
                accessibilityLabel="Replay audio"
                accessibilityHint="Replay the caller's speech"
              >
                <MaterialIcons name='replay' size={18} color={"#94a3b8"}></MaterialIcons>
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={callStyles.dialogueText}>"{dialogueText}"</Text>
          
        </View>

        <Text style={callStyles.promptLabel}>{t('call.whatDoYouSay')}</Text>

        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 0 }} persistentScrollbar={true}>
        {(displayScenario?.options ?? options).map((option) => (
          <DialogueOptionButton key={option.id} option={option} onPress={handleChoice} disabled={isSubmitting}/>
        ))}
        </ScrollView>

        <View className="pb-5 items-center">
          <TouchableOpacity
            style={[callStyles.iconButton, callStyles.declineButton, isSubmitting ? { opacity: 0.6 } : null]}
            onPress={handleMidCallHangup}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Hang up call"
            accessibilityHint="End the current call"
            accessibilityState={{ disabled: isSubmitting }}
          >
            <MaterialIcons name="call-end" size={38} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
