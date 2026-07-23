import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View, Text, TouchableOpacity, ScrollView, Vibration } from 'react-native';
import { Stack, useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { callStyles } from '@/styles/scam-call';
import { useOnboarding } from '@/context/OnboardingContext';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { useAudioPlayer } from 'expo-audio';
import { SafeAreaView } from 'react-native-safe-area-context';
import PracticeBanner from '@/components/ui/PracticeHeader';
import CallTimer from '@/components/scam-call/CallTimer';
import DialogueOptionButton from '@/components/scam-call/DialogueOption';
import { CatResult } from '@/components/ui/result';
import { Confetti } from '@/components/ui/confetti';
import { useTranslation } from 'react-i18next';
import { speakCallDialogue, stopCallSpeech } from '@/lib/callSpeech';

type Phase = 'incoming' | 'active' | 'result';

type MockOption = { id: number; text: string; isCorrect: boolean };

type MockResult = { isCorrect: boolean; reason: string };

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

export default function MockAssignmentScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const mockScenario = {
    callerName: t('call.mockCallerName'),
    dialogue: t('call.mockDialogue'),
    options: [
      { id: 1, text: t('call.mockOptionEngage'), isCorrect: false },
      { id: 2, text: t('call.mockOptionComply'), isCorrect: false },
      { id: 3, text: t('call.mockOptionEnd'), isCorrect: true },
    ] as MockOption[],
  };
  const audioSource = require('../../../assets/audio/ringtone.mp3');
  const player = useAudioPlayer(audioSource);
  const successPlayer = useAudioPlayer(require('../../../assets/audio/success.mp3'));
  const failurePlayer = useAudioPlayer(require('../../../assets/audio/failure.mp3'));
  const { goToStep } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('incoming');
  const [result, setResult] = useState<MockResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const allowRemoveRef = useRef(false);

  useEffect(() => {
    if (phase !== 'incoming') return;
    // wait 0ms, vibrate 1000ms, pause 1000ms
    const PATTERN = [0, 1000, 1000];
    Vibration.vibrate(PATTERN, true);
    player.loop = true;
    player.play();

    return () => {
      Vibration.cancel();
      player.pause();
    };
  }, [phase, player]);

  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    void speakCallDialogue(mockScenario.dialogue, i18n.language);

    return () => {
      clearInterval(interval);
      stopCallSpeech();
    };
  }, [phase, mockScenario.dialogue, i18n.language]);

  useEffect(() => {
    if (phase === 'result' && result) {
      if (result.isCorrect) {
        successPlayer.volume = 0.2;
        successPlayer.play();
      } else {
        failurePlayer.volume = 0.2;
        failurePlayer.play();
      }
    }
  }, [phase, result, successPlayer, failurePlayer]);

  // Ends the mock assignment and hands the tour off to the next step
  const finishMockAssignment = useCallback(() => {
    allowRemoveRef.current = true;
    goToStep('menu_intro');
    router.dismissTo('/student');
  }, [goToStep, router]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (phase !== 'result' || allowRemoveRef.current) return;
        event.preventDefault();
        finishMockAssignment();
      }),
    [finishMockAssignment, navigation, phase],
  );

  useFocusEffect(
    useCallback(() => {
      if (phase !== 'result') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        finishMockAssignment();
        return true;
      });
      return () => subscription.remove();
    }, [finishMockAssignment, phase]),
  );

  const handleAnswer = () => {
    setPhase('active');
  };

  const handleDecline = () => {
    stopCallSpeech();
    setResult({
      isCorrect: true,
      reason: t('call.mockReasonCorrect'),
    });
    setPhase('result');
  };

  const handleChoice = (option: MockOption) => {
    stopCallSpeech();
    setResult({
      isCorrect: option.isCorrect,
      reason: option.isCorrect
        ? t('call.mockReasonCorrect')
        : t('call.mockReasonIncorrect'),
    });
    setPhase('result');
  };

  if (phase === 'result' && result) {
    return (
      <SafeAreaView className="flex-1 px-5 items-center justify-center" style={{ backgroundColor: result.isCorrect ? '#ecfdf5' : '#fef2f2' }}>
        <Stack.Screen options={{ gestureEnabled: false }} />
        {result.isCorrect && <Confetti />}
        <ColourBlobs colors={["#d97706", "#7c3aed"]}></ColourBlobs>
        <ScrollView className="flex-1" contentContainerClassName="grow items-center justify-center">
          <Text style={[callStyles.heading, { color: result.isCorrect ? '#16a34a' : '#dc2626' }]}>
            {result.isCorrect ? t('call.mockGreatJob') : t('call.mockNotQuite')}
          </Text>
          <CatResult status={result.isCorrect ? 'success' : 'error'}></CatResult>
          <Text style={callStyles.explanation} className="px-5 text-primary text-center">{result.reason}</Text>
          <TouchableOpacity style={callStyles.buttonResult} onPress={finishMockAssignment}>
            <Text style={callStyles.buttonResultText}>{t('call.mockFinishButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
      );
  }

  else if (phase === 'incoming') {
    return (
      <SafeAreaView style={{ flex: 1 }} className={`bg-background`}>
        <Stack.Screen options={{ gestureEnabled: true }} />
        <View style={callStyles.container}>
          <PracticeBanner onSkip={finishMockAssignment} onboardingTargetId="practice_banner" />
          <View style={callStyles.incomingStatusContainer}>
            <MaterialIcons name="phone-in-talk" size={16} color="#cbd5e1" style={callStyles.incomingIcon} />
            <Text style={callStyles.incomingStatusText}>{t('call.mockIncoming')}</Text>
          </View>

          <Text style={callStyles.callerName}>{mockScenario.callerName}</Text>
          <View style={callStyles.profileContainer}>
            <FontAwesome name="user-circle" size={160} color="#cbd5e1" />
          </View>

          <View style={callStyles.buttonContainer}>
            <OnboardingTarget id="practice_call_button">
              <TouchableOpacity
                style={[callStyles.iconButton, callStyles.answerButton]}
                onPress={handleAnswer}
                accessibilityRole="button"
                accessibilityLabel="Answer call"
                accessibilityHint="Accept the incoming call and speak with the caller"
              >
                <MaterialIcons name="call" size={38} color="white" />
              </TouchableOpacity>
            </OnboardingTarget>
            <TouchableOpacity
              style={[callStyles.iconButton, callStyles.declineButton]}
              onPress={handleDecline}
              accessibilityRole="button"
              accessibilityLabel="Decline call"
              accessibilityHint="Reject the incoming call"
            >
              <MaterialIcons name="call-end" size={38} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )} else {
      return (
        <SafeAreaView style={{ flex: 1 }} className={`bg-background`}>
          <Stack.Screen options={{ gestureEnabled: true }} />
          <View style={[globalStyles.container, { backgroundColor: '#1a365d' }]}>
          <PracticeBanner />
          <CallTimer seconds={seconds} />
          <Text style={[callStyles.callerName, { fontSize: 24}]}>{mockScenario.callerName}</Text>

          <View style={callStyles.dialogueBox}>
            <Text style={callStyles.dialogueLabel}>{t('call.theySaid')}</Text>
            <Text style={callStyles.dialogueText}>"{mockScenario.dialogue}"</Text>
          </View>

          <Text style={callStyles.promptLabel}>{t('call.whatDoYouSay')}</Text>

          <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {mockScenario.options.map((option) => (
              <DialogueOptionButton key={option.id} option={option} onPress={() => handleChoice(option)} />
            ))}
          </ScrollView>

          <View style={callStyles.hangupContainer}>
            <TouchableOpacity
              style={[callStyles.iconButton, callStyles.declineButton]}
              onPress={handleDecline}
              accessibilityRole="button"
              accessibilityLabel="Hang up call"
              accessibilityHint="End the current call"
            >
              <MaterialIcons name="call-end" size={38} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )}
  }
