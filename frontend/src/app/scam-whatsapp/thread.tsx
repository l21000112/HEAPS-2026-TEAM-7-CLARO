import { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Keyboard, Platform, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { translateWhatsAppScenario } from '@/lib/scenarioI18n';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import MessageBubble from '@/components/scam-whatsapp/MessageBubble';
import MessageComposer from '@/components/scam-whatsapp/MessageComposer';
import ThreadHeader from '@/components/scam-whatsapp/ThreadHeader';

import { backendPerformAction, backendSendMessage, getBackendSession } from '@/api/backend';
import { WhatsAppEvaluation, WhatsAppMessage, WhatsAppSession } from '@/features/scam-whatsapp/models';
import { whatsAppStyles } from '@/styles/scam-whatsapp';
import { useTheme } from '@/context/themeContext';
import { isFinishedAssignmentError, useBlockNavigationWhile } from '@/lib/useCompletionNavigation';
import { useAuth } from '@/context/AuthContext';
import { personalizeScenarioText } from '@/lib/scenarioText';
import { useAppAlert } from '@/context/AppAlertContext';

export default function WhatsAppThreadScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { alert } = useAppAlert();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const { sessionId: sessionIdParam } = useLocalSearchParams();
  const sessionId = typeof sessionIdParam === 'string' ? sessionIdParam : '';

  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [pendingEvaluation, setPendingEvaluation] = useState<WhatsAppEvaluation | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isSendingRef = useRef(false);
  const isEndingRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const typingDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowNextNavigation = useBlockNavigationWhile(isLoading);

  useEffect(() => {
    if (!sessionId) {
      alert(t('whatsapp.alertSessionMissingTitle'), t('whatsapp.alertSessionMissingMsg'));
      setLoadError(t('whatsapp.thisSessionMissing'));
      setIsSessionLoading(false);
      return;
    }

    getBackendSession(sessionId)
      .then((loadedSession) => {
        setSession(loadedSession);
        setMessages(
          loadedSession.messages.map((message) => ({
            ...message,
            body: personalizeScenarioText(message.body, profile?.displayName),
          }))
        );
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : t('whatsapp.couldNotLoadSession'));
        alert(
          t('whatsapp.alertSessionUnavailableTitle'),
          error instanceof Error ? error.message : t('whatsapp.alertSessionUnavailableMsg'),
        );
      })
      .finally(() => setIsSessionLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      // Keep the latest message visible once the composer rises above the keyboard.
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingDelayTimerRef.current) {
        clearTimeout(typingDelayTimerRef.current);
        typingDelayTimerRef.current = null;
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, []);

  const displayScenario = session ? translateWhatsAppScenario(session.scenario, i18n.language) : null;
  const openingBodyMap = new Map(
    (displayScenario?.openingMessages ?? []).map((m) => [String(m.id), m.body])
  );
  const displayMessages = messages.map((m) => {
    const translatedBody = openingBodyMap.get(String(m.id));
    return translatedBody
      ? { ...m, body: personalizeScenarioText(translatedBody, profile?.displayName) }
      : m;
  });

  const goToResult = (evaluation: WhatsAppEvaluation) => {
    if (!session) return;
    allowNextNavigation();
    router.replace({
      pathname: './result',
      params: {
        contactName: session.scenario.contact.displayName,
        scenarioId: String(session.scenario.id),
        sessionId,
        classroomId: session.assignment?.classroomId,
        assignmentId: session.assignment?.assignmentId,
        assignmentItemId: session.assignment?.assignmentItemId,
        isCorrect: String(evaluation.isCorrect ?? false),
        reason: evaluation.reason ?? '',
        redFlags: JSON.stringify(evaluation.redFlags ?? []),
      },
    });
  };

  const handleAction = async (action: 'block' | 'report') => {
    if (isEndingRef.current || isSendingRef.current || !session) return;
    isEndingRef.current = true;
    setIsLoading(true);
    let navigatedAway = false;
    try {
      const { evaluation } = await backendPerformAction(sessionId, action);
      navigatedAway = true;
      goToResult(evaluation);
    } catch (error) {
      alert(t('whatsapp.alertErrorTitle'), error instanceof Error ? error.message : t('whatsapp.alertErrorMsg'));
      if (isFinishedAssignmentError(error)) {
        navigatedAway = true;
        allowNextNavigation();
        router.dismissTo('/student');
      }
    } finally {
      if (!navigatedAway) {
        isEndingRef.current = false;
        setIsLoading(false);
      }
    }
  };

  const handleSend = async () => {
    const now = Date.now();
    // Prevent spam-tapping the send button
    if (now - lastTapTimeRef.current < 1000) return;
    if (isLoading || isSendingRef.current || isEndingRef.current || !draft.trim() || !session) return;
    
    lastTapTimeRef.current = now;
    isSendingRef.current = true;
    const userText = draft.trim();
    setDraft('');
    setIsLoading(true);

    const optimisticId = `local-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        direction: 'outbound',
        body: userText,
        timestamp: new Date().toISOString(),
      },
    ]);

    let navigatedAway = false;
    try {
      // Run the AI network request & a 3-second minimum buffer timer at the exact same time
      const [aiResponse] = await Promise.all([
        backendSendMessage(sessionId, userText),
        new Promise<void>((resolve) => {
          // Store the timer so it can be cleared on unmount (LOW fix).
          typingDelayTimerRef.current = setTimeout(resolve, 3000); // 3-second artificial typing delay
        }),
      ]);

      const { aiMessage, evaluation } = aiResponse;
      setMessages((prev) => [...prev, aiMessage]);

      if (evaluation?.completed) {
        setEnded(true);
        completionTimerRef.current = setTimeout(
          () => setPendingEvaluation(evaluation),
          900,
        );
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      // Restore the draft so the user can retry without re-typing.
      setDraft(userText);
      alert(
        t('whatsapp.alertAiUnavailableTitle'),
        error instanceof Error
          ? error.message
          : t('whatsapp.alertAiUnavailableMsg'),
      );
      if (isFinishedAssignmentError(error)) {
        navigatedAway = true;
        allowNextNavigation();
        router.dismissTo('/student');
      }
    } finally {
      // MEDIUM: Only reset submit guards when we are NOT navigating away.
      if (!navigatedAway) {
        isSendingRef.current = false;
        setIsLoading(false);
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 50, paddingBottom:50 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <Stack.Screen options={{ gestureEnabled: !isLoading }} />
      <View style={[whatsAppStyles.container, { marginBottom: keyboardHeight }]}>
          {isSessionLoading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#25d366" size="large" />
              <Text style={{ color: '#8696a0', marginTop: 12 }}>{t('whatsapp.loadingChat')}</Text>
            </View>
          ) : !session || loadError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
              <Text style={{ color: '#8696a0', textAlign: 'center' }}>
                {loadError || t('whatsapp.couldNotLoadSession')}
              </Text>
              <TouchableOpacity
                style={[whatsAppStyles.primaryButton, { marginTop: 16 }]}
                onPress={() => router.dismissTo('/student')}
              >
                <Text style={whatsAppStyles.buttonText}>{t('common.backToHome')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ThreadHeader
                contact={displayScenario?.contact ?? session.scenario.contact}
                onBlock={() => handleAction('block')}
                onReport={() => handleAction('report')}
                actionsDisabled={isLoading || ended}
              />

              <ScrollView
                ref={scrollRef}
                style={whatsAppStyles.messageList}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {displayMessages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading ? <Text style={whatsAppStyles.typingIndicator}>{t('whatsapp.typing')}</Text> : null}
              </ScrollView>
              <MessageComposer
                value={draft}
                onChangeText={setDraft}
                onSend={handleSend}
                disabled={isLoading || ended}
              />
            </>
          )}
      </View>

      {/* Continue-to-results overlay: shown after the last AI reply so the cut to the result screen isn't jarring */}
      <Modal
        visible={!!pendingEvaluation}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (pendingEvaluation) goToResult(pendingEvaluation);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 28 }}>
          <View style={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', borderRadius: 22, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(37,211,102,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="message-circle" size={26} color="#25D366" />
            </View>
            <Text style={{ color: isDark ? '#f3f4f6' : '#111827', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
              {t('whatsapp.conversationCompleteTitle')}
            </Text>
            <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 14, textAlign: 'center' }}>
              {t('whatsapp.conversationCompleteDesc')}
            </Text>
            <TouchableOpacity
              style={{ marginTop: 6, backgroundColor: '#25D366', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 }}
              onPress={() => {
                if (pendingEvaluation) goToResult(pendingEvaluation);
              }}
            >
              <Text style={{ color: '#07301c', fontWeight: '700', fontSize: 16 }}>{t('whatsapp.continueToResults')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
