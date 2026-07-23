import { useRef, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import { CatResult } from '@/components/ui/result';
import { Confetti } from '@/components/ui/confetti';
import { useReducedAnimations } from '@/context/reducedAnimationsContext';
import { WhatsAppResult } from '@/features/scam-whatsapp/models';
import { logAttempt } from '@/api/attempts';
import { whatsAppStyles } from '@/styles/scam-whatsapp';
import { useCompletionNavigation } from '@/lib/useCompletionNavigation';

function ColourBlobs({ colors }: { colors: [string, string] }) {
  return (
    <>
      <View
        style={{
          position: "absolute",
          top: -120,
          right: -80,
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
          bottom: 0,
          left: -100,
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

export default function WhatsAppResultScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const { reducedAnimations } = useReducedAnimations();

  const result: WhatsAppResult = (() => {
    let redFlags: string[] = [];
    if (typeof params.redFlags === 'string' && params.redFlags.length > 0) {
      try {
        const parsed = JSON.parse(params.redFlags);
        if (Array.isArray(parsed)) redFlags = parsed.filter((f) => typeof f === 'string');
      } catch {
        // ignore - fall back to empty list
      }
    }
    return {
      contactName: params.contactName as string,
      isCorrect: params.isCorrect === 'true',
      reason: params.reason as string,
      redFlags,
    };
  })();

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
      scenarioType: 'whatsapp',
      scenarioId: params.scenarioId as string,
      sessionId: params.sessionId as string | undefined,
      isCorrect: result.isCorrect,
      reason: result.reason,
      metadata: {
        feature: 'scam-whatsapp',
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
        <Text style={[whatsAppStyles.heading, { color: result.isCorrect ? '#16a34a' : '#dc2626' }]}>
          {result.isCorrect ? t('whatsapp.greatJob') : t('whatsapp.notQuite')}
        </Text>
        <CatResult status={result.isCorrect ? 'success' : 'error'}></CatResult>
        <Text style={whatsAppStyles.explanation} className="px-5 text-primary text-center">{result.reason}</Text>

        {result.redFlags && result.redFlags.length > 0 ? (
          <View style={{ marginTop: 16, width: '85%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="flag" size={15} color="#EF4444" />
              <Text style={[whatsAppStyles.explanation, { fontWeight: 'bold' }]}>
                {t('whatsapp.redFlagsTitle')}
              </Text>
            </View>
            {result.redFlags.map((flag, i) => (
              <Text key={i} style={{ paddingVertical: 4, color: '#475569' }}>• {flag}</Text>
            ))}
          </View>
        ) : null}

        {saveError ? <Text style={whatsAppStyles.explanation}>{saveError}</Text> : null}

        <TouchableOpacity
        style={[whatsAppStyles.buttonResult, isSaving ? { opacity: 0.6 } : null]}
        onPress={() => void finish()}
        disabled={isSaving}
      >
        <Text style={whatsAppStyles.buttonResultText}>{isSaving ? t('common.savingProgress') : t('common.backToHome')}</Text>
      </TouchableOpacity>
      </ScrollView>
      
    </SafeAreaView>
  );
}
