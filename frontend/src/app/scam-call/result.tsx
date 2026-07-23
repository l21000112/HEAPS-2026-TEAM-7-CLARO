import { callStyles } from "../../styles/scam-call";
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useRef, useEffect } from "react";
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from 'expo-audio';
import { CatResult } from "@/components/ui/result";
import { Confetti } from "@/components/ui/confetti";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { CallResult } from "@/features/scam-call/models";
import { logAttempt } from '@/api/attempts';
import { useCompletionNavigation } from '@/lib/useCompletionNavigation';
import { useTranslation } from 'react-i18next';
import { useSimpleLanguage } from '@/context/simpleLanguageContext';
import { resolveCallReason } from '@/lib/scenarioI18n';

function ColourBlobs({ colors }: { colors: [string, string] }) {
  return (
    <>
      <View
        style={{
          position: "absolute",
          top: -170,
          right: -50,
          width: 300,
          height: 300,
          borderRadius: 300,
          backgroundColor: colors[0],
          opacity: 0.16,
          zIndex: -20,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -60,
          left: -50,
          width: 250,
          height: 250,
          borderRadius: 300,
          backgroundColor: colors[1],
          opacity: 0.14,
          zIndex: -20,
        }}
      />
    </>
  );
}

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const { reducedAnimations } = useReducedAnimations();
  const { t, i18n } = useTranslation();
  const { simpleLanguage } = useSimpleLanguage();

  const result: CallResult = {
    callerName: params.callerName as string,
    isCorrect: params.isCorrect === 'true',
    reason: params.reason as string,
  };

  const callOutcome = (params.selectedOptionId as string) || 'decline';
  const translatedReason = params.scenarioId
    ? resolveCallReason(i18n.language, String(params.scenarioId), callOutcome, simpleLanguage)
    : null;
  const displayReason = translatedReason ?? result.reason;

  const soundSource = result.isCorrect
    ? require('../../../assets/audio/success.mp3')
    : require('../../../assets/audio/failure.mp3');
  const player = useAudioPlayer(soundSource);
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    player.volume = 0.2;
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;
    player.play();
  }, [player]);

  const { finish, isSaving, saveError } = useCompletionNavigation(async () => {
    if (!params.scenarioId) return;
    await logAttempt({
      scenarioType: 'phone_call',
      scenarioId: params.scenarioId as string,
      sessionId: params.sessionId as string | undefined,
      selectedOptionId: params.selectedOptionId as string | undefined,
      durationSeconds:
        typeof params.durationSeconds === 'string'
          ? Number(params.durationSeconds)
          : undefined,
      isCorrect: result.isCorrect,
      reason: result.reason,
      metadata: {
        feature: 'scam-call',
        classroomId: typeof params.classroomId === 'string' ? params.classroomId : undefined,
        assignmentId: typeof params.assignmentId === 'string' ? params.assignmentId : undefined,
        assignmentItemId: typeof params.assignmentItemId === 'string' ? params.assignmentItemId : undefined,
      },
    });
  });

  return (
    <SafeAreaView className="flex-1 px-5 items-center justify-center" style={{ backgroundColor: result.isCorrect ? '#ecfdf5' : '#fef2f2' }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      {result.isCorrect && !reducedAnimations && <Confetti />}
      <ColourBlobs colors={["#d97706", "#7c3aed"]}></ColourBlobs>
      <ScrollView className="flex-1" contentContainerClassName="grow items-center justify-center">
        <Text style={[callStyles.heading, { color: result.isCorrect ? '#16a34a' : '#dc2626' }]}>
          {result.isCorrect ? t('call.greatJob') : t('call.notQuite')}
        </Text>
        <CatResult status={result.isCorrect ? 'success' : 'error'}></CatResult>
        <Text style={callStyles.explanation} className="px-5 text-center">{displayReason}</Text>

        {saveError ? <Text style={callStyles.explanation}>{saveError}</Text> : null}
        <TouchableOpacity
          style={[callStyles.buttonResult, isSaving ? { opacity: 0.6 } : null]}
          onPress={() => void finish()}
          disabled={isSaving}
        >
          <Text style={callStyles.buttonResultText}>{isSaving ? t('common.savingProgress') : t('common.backToHome')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
