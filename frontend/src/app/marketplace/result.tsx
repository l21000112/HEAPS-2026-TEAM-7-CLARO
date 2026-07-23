import { callStyles } from "../../styles/scam-call";
import { CatResult } from "@/components/ui/result";
import { Confetti } from "@/components/ui/confetti";
import { useReducedAnimations } from '@/context/reducedAnimationsContext';
import { logAttempt } from '@/api/attempts';
import { useCompletionNavigation } from '@/lib/useCompletionNavigation'; // Kept for re-enabling saving later
import { useTranslation } from 'react-i18next';
import { View, ScrollView, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";

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

interface MarketplaceResult {
    isCorrect: boolean;
    reason: string;
}

export default function MarketplaceResultScreen() {
  const { t } = useTranslation();
  const { reducedAnimations } = useReducedAnimations();
  const params = useLocalSearchParams();

  const result: MarketplaceResult = {
    isCorrect: params.isCorrect === 'true',
    reason: params.reason as string,
  };

  const soundSource = result.isCorrect
      ? require('../../../assets/audio/success.mp3')
      : require('../../../assets/audio/failure.mp3');
    const player = useAudioPlayer(soundSource);
    player.volume = 0.2;
    const soundPlayedRef = useRef(false);

    useEffect(() => {
      if (soundPlayedRef.current) return;
      soundPlayedRef.current = true;
      player.play();
    }, [player]);

  const { finish, isSaving } = useCompletionNavigation(async () => {
    if (!params.scenarioId) return;
    await logAttempt({
      scenarioType: 'marketplace',
      scenarioId: params.scenarioId as string,
      isCorrect: result.isCorrect,
      reason: result.reason,
      metadata: {
        feature: 'marketplace',
        classroomId: typeof params.classroomId === 'string' ? params.classroomId : undefined,
        assignmentId: typeof params.assignmentId === 'string' ? params.assignmentId : undefined,
        assignmentItemId: typeof params.assignmentItemId === 'string' ? params.assignmentItemId : undefined,
      },
    });
  });

  return (
    <SafeAreaView className="flex-1 px-5 items-center justify-center" style={{ backgroundColor: result.isCorrect ? '#ecfdf5' : '#fef2f2' }}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
      {result.isCorrect && !reducedAnimations && <Confetti />}
      <ColourBlobs colors={["#d97706", "#7c3aed"]}></ColourBlobs>
      <ScrollView className="flex-1" contentContainerClassName="grow items-center justify-center">
        <Text style={[callStyles.heading, { color: result.isCorrect ? '#16a34a' : '#dc2626' }]}>
          {result.isCorrect ? t('marketplace.greatJob') : t('marketplace.notQuite')}
        </Text>
        <CatResult status={result.isCorrect ? 'success' : 'error'}></CatResult>
        <Text style={callStyles.explanation} className="px-5 text-center">{result.reason}</Text>

        <TouchableOpacity
          style={[callStyles.buttonResult, isSaving && { opacity: 0.5 }]}
          onPress={finish}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={callStyles.buttonResultText}>{t('common.backToHome')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}