import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useAppAlert } from '@/context/AppAlertContext';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import {
  translateCallScenario,
  translateWhatsAppScenario,
} from '@/lib/scenarioI18n';
import {
  listCallScenarios,
  listWhatsAppScenarios,
  listMarketplaceScenarios,
  createScenario,
  createMarketplaceScenario,
  type PublicCallScenario,
  type PublicWhatsAppScenario,
  type PublicMarketplaceScenario,
  type ScenarioType,
} from '@/api/scenarios';
import { colors } from '@/styles/global';

type FilterType = 'all' | ScenarioType;
type CreatorStep = 'pickType' | 'form';

interface OptionDraft {
  text: string;
  isCorrect: boolean;
  reason: string;
  _key?: string;
}

interface OpeningMessageDraft {
  body: string;
  _key?: string;
}

interface ProductDraft {
  name: string;
  price: string;
  description: string;
  imageUrl: string;
  sellerName: string;
  isOfficialSeller: boolean;
  _key?: string;
}

function marketplaceDisplayTitle(s: PublicMarketplaceScenario): string {
  const firstProduct = s.products?.[0];
  if (firstProduct?.name?.trim()) return firstProduct.name.trim();
  const trimmed = (s.taskDescription || '').trim();
  if (trimmed) {
    const words = trimmed.split(/\s+/).slice(0, 6).join(' ');
    return words.length < trimmed.length ? `${words}…` : words;
  }
  return `Marketplace #${s.id}`;
}

export default function TeacherScenariosScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { alert } = useAppAlert();
  const insets = useSafeAreaInsets();
  // M14: Stable unique keys for dynamic form lists (options, messages, products).
  const keyCounterRef = useRef(0);
  const mk = () => `k${++keyCounterRef.current}`;

  const [callScenarios, setCallScenarios] = useState<PublicCallScenario[]>([]);
  const [whatsappScenarios, setWhatsappScenarios] = useState<PublicWhatsAppScenario[]>([]);
  const [marketplaceScenarios, setMarketplaceScenarios] = useState<PublicMarketplaceScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [step, setStep] = useState<CreatorStep>('pickType');
  const [chosenType, setChosenType] = useState<ScenarioType | null>(null);

  const [callerName, setCallerName] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [isScam, setIsScam] = useState(true);
  const [options, setOptions] = useState<OptionDraft[]>([
    { text: '', isCorrect: false, reason: '' },
  ]);

  const [contactName, setContactName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scenarioBrief, setScenarioBrief] = useState('');
  const [waDeclineReason, setWaDeclineReason] = useState('');
  const [waIsScam, setWaIsScam] = useState(true);
  const [openingMessages, setOpeningMessages] = useState<OpeningMessageDraft[]>([
    { body: '' },
  ]);

  const [taskDescription, setTaskDescription] = useState('');
  const [mkDeclineReason, setMkDeclineReason] = useState('');
  const [mkIsScam, setMkIsScam] = useState(true);
  const [products, setProducts] = useState<ProductDraft[]>([
    {
      name: '',
      price: '0',
      description: '',
      imageUrl: '',
      sellerName: '',
      isOfficialSeller: false,
      _key: mk(),
    },
  ]);

  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async (showSpinner = false) => {
    const currentRequest = ++requestId.current;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const [calls, wa, mk] = await Promise.all([
        listCallScenarios(),
        listWhatsAppScenarios(),
        // Marketplace titles/descriptions are translated server-side via `lang`.
        listMarketplaceScenarios(i18n.language),
      ]);
      if (currentRequest !== requestId.current) return;
      setCallScenarios(calls);
      setWhatsappScenarios(wa);
      setMarketplaceScenarios(mk);
      setError(null);
    } catch (e: any) {
      if (currentRequest === requestId.current) {
        setError(e?.message || t('teacher.fallbackScenariosLoadError'));
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [t, i18n.language]);

  useFocusEffect(
    useCallback(() => {
      void fetchAll();
      return () => {
        requestId.current += 1;
      };
    }, [fetchAll]),
  );

  const totalCount =
    callScenarios.length + whatsappScenarios.length + marketplaceScenarios.length;

  const filteredItems = useMemo(() => {
    const lang = i18n.language;
    const items: Array<{ key: string; type: ScenarioType; title: string; subtitle: string }> = [];
    if (filter === 'all' || filter === 'phone_call') {
      for (const raw of callScenarios) {
        const s = translateCallScenario(raw, lang);
        items.push({
          key: `call_${s.id}`,
          type: 'phone_call',
          title: s.callerName,
          subtitle: s.dialogue ? s.dialogue.slice(0, 80) : t('teacher.scenarioFallbackCall'),
        });
      }
    }
    if (filter === 'all' || filter === 'whatsapp') {
      for (const raw of whatsappScenarios) {
        const s = translateWhatsAppScenario(raw as any, lang);
        const firstMsg = s.openingMessages?.[0]?.body || '';
        items.push({
          key: `wa_${s.id}`,
          type: 'whatsapp',
          title: s.contact?.displayName || t('teacher.unknownContact'),
          subtitle: firstMsg ? firstMsg.slice(0, 80) : t('teacher.scenarioFallbackWhatsapp'),
        });
      }
    }
    if (filter === 'all' || filter === 'marketplace') {
      for (const s of marketplaceScenarios) {
        items.push({
          key: `mk_${s.id}`,
          type: 'marketplace',
          title: marketplaceDisplayTitle(s),
          subtitle: t('teacher.productsCount', { count: s.products.length }),
        });
      }
    }
    return items;
  }, [filter, callScenarios, whatsappScenarios, marketplaceScenarios, t, i18n.language]);

  const resetForms = () => {
    setStep('pickType');
    setChosenType(null);
    setCallerName('');
    setDialogue('');
    setDeclineReason('');
    setIsScam(true);
    setOptions([{ text: '', isCorrect: false, reason: '', _key: mk() }]);
    setContactName('');
    setPhoneNumber('');
    setScenarioBrief('');
    setWaDeclineReason('');
    setWaIsScam(true);
    setOpeningMessages([{ body: '', _key: mk() }]);
    setTaskDescription('');
    setMkDeclineReason('');
    setMkIsScam(true);
    setProducts([
      {
        name: '',
        price: '0',
        description: '',
        imageUrl: '',
        sellerName: '',
        isOfficialSeller: false,
        _key: mk(),
      },
    ]);
  };

  const openCreator = () => {
    resetForms();
    setCreatorOpen(true);
  };

  const closeCreator = () => {
    setCreatorOpen(false);
    resetForms();
  };

  const addOption = () => setOptions((p) =>
    p.length >= 8 ? p : [...p, { text: '', isCorrect: false, reason: '', _key: mk() }],
  );
  const updateOption = (idx: number, patch: Partial<OptionDraft>) => {
    setOptions((p) => p.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const removeOption = (idx: number) => {
    setOptions((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  };

  const addMessage = () => setOpeningMessages((p) =>
    p.length >= 10 ? p : [...p, { body: '', _key: mk() }],
  );
  const updateMessage = (idx: number, patch: Partial<OpeningMessageDraft>) => {
    setOpeningMessages((p) => p.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };
  const removeMessage = (idx: number) => {
    setOpeningMessages((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  };

  const addProduct = () =>
    setProducts((p) => (p.length >= 30 ? p : [
        ...p,
        {
          name: '',
          price: '0',
          description: '',
          imageUrl: '',
          sellerName: '',
          isOfficialSeller: false,
          _key: mk(),
        },
      ]));
  const updateProduct = (idx: number, patch: Partial<ProductDraft>) => {
    setProducts((p) => p.map((pr, i) => (i === idx ? { ...pr, ...patch } : pr)));
  };
  const removeProduct = (idx: number) => {
    setProducts((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p));
  };

  const buildCallPayload = () => {
    if (!callerName.trim()) throw new Error(t('teacher.valEnterCallerName'));
    if (!dialogue.trim()) throw new Error(t('teacher.valEnterDialogue'));
    if (!declineReason.trim()) throw new Error(t('teacher.valEnterDeclineReason'));

    const cleanedOptions = options
      .map((o, i) => ({
        id: i + 1,
        text: o.text.trim(),
        isCorrect: o.isCorrect,
        reason: o.reason.trim() || t('teacher.defaultOptionReason'),
      }))
      .filter((o) => o.text.length > 0);
    if (cleanedOptions.length === 0) throw new Error(t('teacher.valAddOneOption'));
    const correctCount = cleanedOptions.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) throw new Error(t('teacher.valOneCorrect'));

    return {
      type: 'phone_call' as const,
      title: callerName.trim() || t('teacher.defaultCallScenarioTitle'),
      description: dialogue.trim().slice(0, 180),
      content: {
        isScam,
        callerName: callerName.trim() || t('teacher.defaultCallerName'),
        dialogue: dialogue.trim(),
        declineReason: declineReason.trim(),
        options: cleanedOptions,
      },
    };
  };

  const buildWhatsAppPayload = () => {
    if (!contactName.trim()) throw new Error(t('teacher.valEnterContactName'));
    if (!scenarioBrief.trim()) throw new Error(t('teacher.valEnterScenarioBrief'));
    if (!waDeclineReason.trim()) throw new Error(t('teacher.valEnterDeclineReason'));
    if (phoneNumber.trim() && !/^[+\d\s().-]+$/.test(phoneNumber.trim())) {
      throw new Error(t('teacher.valEnterValidPhone'));
    }

    const cleanedMessages = openingMessages
      .map((m, i) => ({
        id: `m${i + 1}`,
        direction: 'inbound' as const,
        body: m.body.trim(),
      }))
      .filter((m) => m.body.length > 0);
    if (cleanedMessages.length === 0) throw new Error(t('teacher.valAddOneMessage'));

    return {
      type: 'whatsapp' as const,
      title: contactName.trim() || t('teacher.defaultWhatsappScenarioTitle'),
      description: cleanedMessages[0]?.body?.slice(0, 180) || '',
      content: {
        isScam: waIsScam,
        contact: {
          displayName: contactName.trim() || t('teacher.unknownContact'),
          phoneNumber: phoneNumber.trim() || undefined,
        },
        scenarioBrief: scenarioBrief.trim(),
        declineReason: waDeclineReason.trim(),
        openingMessages: cleanedMessages,
      },
      // NOTE: `status` is omitted - backend forces 'published' on create.
    };
  };

  const buildMarketplacePayload = () => {
    if (!taskDescription.trim()) throw new Error(t('teacher.valEnterTaskDescription'));
    if (!mkDeclineReason.trim()) throw new Error(t('teacher.valEnterDeclineReason'));

    const cleanedProducts = products
      .map((product, index) => {
        const number = index + 1;
        const price = Number(product.price);
        if (!product.name.trim()) throw new Error(t('teacher.valEnterProductName', { number }));
        if (!product.description.trim()) throw new Error(t('teacher.valEnterProductDesc', { number }));
        if (!product.sellerName.trim()) throw new Error(t('teacher.valEnterProductSeller', { number }));
        if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
          throw new Error(t('teacher.valEnterValidPrice', { number }));
        }
        if (product.imageUrl.trim() && !/^https?:\/\//i.test(product.imageUrl.trim())) {
          throw new Error(t('teacher.valImageUrlHttp', { number }));
        }
        return {
          id: `prod_${number}`,
          name: product.name.trim(),
          price,
          description: product.description.trim(),
          imageUrl: product.imageUrl.trim() || undefined,
          sellerName: product.sellerName.trim(),
          isOfficialSeller: product.isOfficialSeller,
        };
      });

    // Target is always the first listed product - no need for teachers to pick an ID.
    const finalTargetId = cleanedProducts[0]?.id;
    if (!finalTargetId) throw new Error(t('teacher.valAddOneProduct'));

    return {
      type: 'marketplace' as const,
      title: taskDescription.trim().slice(0, 80) || t('teacher.defaultMarketplaceScenarioTitle'),
      description: `${cleanedProducts.length} products`,
      content: {
        isScam: mkIsScam,
        taskDescription: taskDescription.trim(),
        targetProductId: finalTargetId,
        declineReason: mkDeclineReason.trim(),
        products: cleanedProducts,
      },
      // NOTE: `status` is omitted - backend forces 'published' on create.
    };
  };

  const submitCreator = async () => {
    if (!chosenType || submitting) return;
    setSubmitting(true);
    try {
      if (chosenType === 'marketplace') {
        await createMarketplaceScenario(buildMarketplacePayload());
      } else if (chosenType === 'phone_call') {
        await createScenario(buildCallPayload());
      } else {
        await createScenario(buildWhatsAppPayload());
      }

      alert(t('teacher.alertCreatedTitle'), t('teacher.alertCreatedMsg'));
      closeCreator();
      await fetchAll(false);
    } catch (e: any) {
      alert(t('teacher.alertScenarioCreateFailedTitle'), e?.message || t('teacher.unknownError'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `bg-input text-foreground rounded-xl px-4 py-3 text-base mb-3`;
  const placeholderColor = isDark ? '#6B7280' : '#9CA3AF';
  const mutedColor = isDark ? '#9CA3AF' : '#4B5563';

  if (loading) {
    return (
      <View className={`flex-1 bg-background items-center justify-center ${isDark ? 'dark' : ''}`}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-muted-foreground mt-4">{t('teacher.scenariosLoading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <Stack.Screen options={{ title: t('teacher.stackTitle') }} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-4 gap-4"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchAll()}
            tintColor={isDark ? '#F9FAFB' : '#111827'}
          />
        )}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="mr-2 p-1"
            >
              <Feather name="chevron-left" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <Text className="text-foreground text-xl font-bold font-bold" numberOfLines={1}>
              {t('teacher.scenariosLabel')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void fetchAll()}
            disabled={refreshing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('teacher.refreshScenariosPressed')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={mutedColor} />
            ) : (
              <Feather name="refresh-cw" size={20} color={mutedColor} />
            )}
          </TouchableOpacity>
        </View>

        <View className="mb-1">
          <Text className="text-muted-foreground text-sm mt-1">
            {t('teacher.scenarioCount', { count: totalCount, unit: totalCount === 1 ? t('teacher.scenarioCountSingular') : t('teacher.scenarioCountPlural') })}
          </Text>
        </View>

        {error && (
          <View className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl">
            <Text className="text-destructive font-medium">{error}</Text>
            <TouchableOpacity className="mt-3 self-start" onPress={() => void fetchAll(true)}>
              <Text className="text-primary font-bold">{t('teacher.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row flex-wrap gap-2 mb-2">
          {(
            [
              { value: 'all', label: t('teacher.filterAll') },
              { value: 'phone_call', label: t('teacher.filterCalls') },
              { value: 'whatsapp', label: t('teacher.filterWhatsApp') },
              { value: 'marketplace', label: t('teacher.filterMarketplace') },
            ] as { value: FilterType; label: string }[]
          ).map((tab) => {
            const active = filter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-full border ${
                  active
                    ? 'bg-primary border-primary'
                    : 'bg-input border-border'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-sm font-medium ${
                    active ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <OnboardingTarget id="scenarios_create">
          <Button onPress={openCreator} className="mb-2" size="lg">
            <Feather name="plus-circle" size={20} color="#fff" />
            <Text className="text-primary-foreground font-bold text-base">
              {t('teacher.createScenarioButton')}
            </Text>
          </Button>
        </OnboardingTarget>

        <OnboardingTarget id="scenarios_body" className="gap-4">
        {filteredItems.length === 0 ? (
          <View className="items-center justify-center py-12 gap-3">
            <Feather name="inbox" size={48} color={mutedColor} />
            <Text className="text-muted-foreground text-base">
              {t('teacher.noScenariosInCategory')}
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <View
              key={item.key}
              className="bg-input p-4 rounded-2xl border border-border"
            >
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-foreground font-semibold text-base flex-1" numberOfLines={1}>
                  {item.title}
                </Text>
                <View className="bg-secondary px-2 py-0.5 rounded-full">
                  <Text className="text-secondary-foreground text-xs font-medium">
                    {item.type === 'phone_call'
                      ? t('teacher.badgeCall')
                      : item.type === 'whatsapp'
                      ? t('teacher.badgeWhatsApp')
                      : t('teacher.badgeMarketplace')}
                  </Text>
                </View>
              </View>
              <Text className="text-muted-foreground text-sm" numberOfLines={2}>
                {item.subtitle}
              </Text>
            </View>
          ))
        )}
        </OnboardingTarget>
      </ScrollView>

      <Modal
        visible={creatorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submitting) closeCreator();
        }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View className="flex-1 bg-card mt-12 rounded-t-3xl">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <TouchableOpacity onPress={closeCreator} disabled={submitting}>
                <Text className="text-muted-foreground font-bold">{t('teacher.cancelButton')}</Text>
              </TouchableOpacity>
              <Text className="text-foreground font-bold text-lg">{t('teacher.newScenarioTitle')}</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="px-5 pt-4"
              contentContainerStyle={{
                // Extra space above the sticky footer (form) or system nav (type picker).
                paddingBottom: step === 'form' ? 28 : 16 + insets.bottom,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'pickType' && (
                <View className="gap-3">
                  <Text className="text-foreground text-base mb-2">
                    {t('teacher.pickTypePrompt')}
                  </Text>
                  {(
                    [
                      {
                        type: 'phone_call' as ScenarioType,
                        label: t('teacher.typePhoneCall'),
                        desc: t('teacher.typePhoneCallDesc'),
                        icon: 'phone' as const,
                      },
                      {
                        type: 'whatsapp' as ScenarioType,
                        label: t('teacher.typeWhatsApp'),
                        desc: t('teacher.typeWhatsAppDesc'),
                        icon: 'message-circle' as const,
                      },
                      {
                        type: 'marketplace' as ScenarioType,
                        label: t('teacher.typeMarketplace'),
                        desc: t('teacher.typeMarketplaceDesc'),
                        icon: 'shopping-cart' as const,
                      },
                    ]
                  ).map((opt) => (
                    <TouchableOpacity
                      key={opt.type}
                      onPress={() => {
                        setChosenType(opt.type);
                        setStep('form');
                      }}
                      className="bg-input p-4 rounded-2xl border border-border flex-row items-center gap-4"
                      activeOpacity={0.7}
                    >
                      <Feather name={opt.icon} size={28} color={mutedColor} />
                      <View className="flex-1">
                        <Text className="text-foreground font-semibold text-base">
                          {opt.label}
                        </Text>
                        <Text className="text-muted-foreground text-sm">{opt.desc}</Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={mutedColor} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {step === 'form' && chosenType === 'phone_call' && (
                <View>
                  <Text className="text-foreground text-lg font-bold mb-3">{t('teacher.formPhoneCall')}</Text>
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelCallerName')}</Text>
                  <TextInput
                    className={inputClass}
                    placeholder={t('teacher.placeholderCallerName')}
                    placeholderTextColor={placeholderColor}
                    value={callerName}
                    onChangeText={setCallerName}
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelDialogue')}</Text>
                  <TextInput
                    className={`${inputClass} h-24`}
                    placeholder={t('teacher.placeholderDialogue')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={dialogue}
                    onChangeText={setDialogue}
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelDeclineReason')}</Text>
                  <TextInput
                    className={`${inputClass} h-20`}
                    placeholder={t('teacher.placeholderDeclineReason')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={declineReason}
                    onChangeText={setDeclineReason}
                  />

                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                      onPress={() => setIsScam(true)}
                      className={`flex-1 py-3 rounded-xl border ${
                        isScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          isScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleScam')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsScam(false)}
                      className={`flex-1 py-3 rounded-xl border ${
                        !isScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          !isScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleNotScam')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-foreground font-semibold mb-2">{t('teacher.optionsTitle')}</Text>
                  {options.map((opt, idx) => (
                    <View key={opt._key ?? idx} className="bg-input p-3 rounded-xl mb-3 border border-border">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-foreground font-medium">{t('teacher.optionLabel', { n: idx + 1 })}</Text>
                        <TouchableOpacity onPress={() => removeOption(idx)} disabled={options.length === 1}>
                          <Feather name="x" size={18} color={mutedColor} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderOptionText')}
                        placeholderTextColor={placeholderColor}
                        multiline
                        value={opt.text}
                        onChangeText={(v) => updateOption(idx, { text: v })}
                      />
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderOptionReason')}
                        placeholderTextColor={placeholderColor}
                        multiline
                        value={opt.reason}
                        onChangeText={(v) => updateOption(idx, { reason: v })}
                      />
                      <TouchableOpacity
                        onPress={() => {
                          // Single-correct: setting one clears the others
                          setOptions((p) =>
                            p.map((o, i) => ({ ...o, isCorrect: i === idx })),
                          );
                        }}
                        className="flex-row items-center gap-2"
                      >
                        <Feather
                          name={opt.isCorrect ? 'check-circle' : 'circle'}
                          size={20}
                          color={opt.isCorrect ? '#10B981' : mutedColor}
                        />
                        <Text className="text-foreground text-sm">{t('teacher.markCorrect')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Button variant="outline" onPress={addOption} className="mb-2" disabled={options.length >= 8}>
                    <Feather name="plus" size={16} color={mutedColor} />
                    <Text>{t('teacher.addOptionButton')}</Text>
                  </Button>
                </View>
              )}

              {step === 'form' && chosenType === 'whatsapp' && (
                <View>
                  <Text className="text-foreground text-lg font-bold mb-3">{t('teacher.formWhatsApp')}</Text>
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelContactName')}</Text>
                  <TextInput
                    className={inputClass}
                    placeholder={t('teacher.placeholderContactName')}
                    placeholderTextColor={placeholderColor}
                    value={contactName}
                    onChangeText={setContactName}
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelPhoneNumber')}</Text>
                  <TextInput
                    className={inputClass}
                    placeholder={t('teacher.placeholderPhoneNumber')}
                    placeholderTextColor={placeholderColor}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelScenarioBrief')}</Text>
                  <TextInput
                    className={`${inputClass} h-20`}
                    placeholder={t('teacher.placeholderScenarioBrief')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={scenarioBrief}
                    onChangeText={setScenarioBrief}
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelWaDeclineReason')}</Text>
                  <TextInput
                    className={`${inputClass} h-20`}
                    placeholder={t('teacher.placeholderWaDeclineReason')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={waDeclineReason}
                    onChangeText={setWaDeclineReason}
                  />

                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                      onPress={() => setWaIsScam(true)}
                      className={`flex-1 py-3 rounded-xl border ${
                        waIsScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          waIsScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleScam')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setWaIsScam(false)}
                      className={`flex-1 py-3 rounded-xl border ${
                        !waIsScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          !waIsScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleNotScam')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-foreground font-semibold mb-2">{t('teacher.openingMessagesTitle')}</Text>
                  {openingMessages.map((msg, idx) => (
                    <View key={msg._key ?? idx} className="bg-input p-3 rounded-xl mb-3 border border-border">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-foreground font-medium">{t('teacher.messageLabel', { n: idx + 1 })}</Text>
                        <TouchableOpacity onPress={() => removeMessage(idx)} disabled={openingMessages.length === 1}>
                          <Feather name="x" size={18} color={mutedColor} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderMessage')}
                        placeholderTextColor={placeholderColor}
                        multiline
                        value={msg.body}
                        onChangeText={(v) => updateMessage(idx, { body: v })}
                      />
                    </View>
                  ))}
                  <Button variant="outline" onPress={addMessage} className="mb-2" disabled={openingMessages.length >= 10}>
                    <Feather name="plus" size={16} color={mutedColor} />
                    <Text>{t('teacher.addMessageButton')}</Text>
                  </Button>
                </View>
              )}

              {step === 'form' && chosenType === 'marketplace' && (
                <View>
                  <Text className="text-foreground text-lg font-bold mb-3">{t('teacher.formMarketplace')}</Text>
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelTaskDescription')}</Text>
                  <TextInput
                    className={`${inputClass} h-20`}
                    placeholder={t('teacher.placeholderTaskDescription')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={taskDescription}
                    onChangeText={setTaskDescription}
                  />
                  <Text className="text-muted-foreground text-xs mb-2">{t('teacher.labelMkDeclineReason')}</Text>
                  <TextInput
                    className={`${inputClass} h-20`}
                    placeholder={t('teacher.placeholderMkDeclineReason')}
                    placeholderTextColor={placeholderColor}
                    multiline
                    value={mkDeclineReason}
                    onChangeText={setMkDeclineReason}
                  />
                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                      onPress={() => setMkIsScam(true)}
                      className={`flex-1 py-3 rounded-xl border ${
                        mkIsScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          mkIsScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleScam')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setMkIsScam(false)}
                      className={`flex-1 py-3 rounded-xl border ${
                        !mkIsScam ? 'bg-primary border-primary' : 'bg-input border-border'
                      }`}
                    >
                      <Text
                        className={`text-center font-medium ${
                          !mkIsScam ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {t('teacher.toggleNotScam')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text className="text-foreground font-semibold mb-2">{t('teacher.productsTitle')}</Text>
                  {products.map((prod, idx) => (
                    <View key={prod._key ?? idx} className="bg-input p-3 rounded-xl mb-3 border border-border">
                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-foreground font-medium">{t('teacher.productLabel', { n: idx + 1 })}</Text>
                        <TouchableOpacity onPress={() => removeProduct(idx)} disabled={products.length === 1}>
                          <Feather name="x" size={18} color={mutedColor} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderProductName')}
                        placeholderTextColor={placeholderColor}
                        value={prod.name}
                        onChangeText={(v) => updateProduct(idx, { name: v })}
                      />
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderProductPrice')}
                        placeholderTextColor={placeholderColor}
                        keyboardType="decimal-pad"
                        value={prod.price}
                        onChangeText={(v) => updateProduct(idx, { price: v })}
                      />
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderProductDesc')}
                        placeholderTextColor={placeholderColor}
                        multiline
                        value={prod.description}
                        onChangeText={(v) => updateProduct(idx, { description: v })}
                      />
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderProductImage')}
                        placeholderTextColor={placeholderColor}
                        autoCapitalize="none"
                        value={prod.imageUrl}
                        onChangeText={(v) => updateProduct(idx, { imageUrl: v })}
                      />
                      <TextInput
                        className={inputClass}
                        placeholder={t('teacher.placeholderProductSeller')}
                        placeholderTextColor={placeholderColor}
                        value={prod.sellerName}
                        onChangeText={(v) => updateProduct(idx, { sellerName: v })}
                      />
                      <TouchableOpacity
                        onPress={() => updateProduct(idx, { isOfficialSeller: !prod.isOfficialSeller })}
                        className="flex-row items-center gap-2"
                      >
                        <Feather
                          name={prod.isOfficialSeller ? 'check-circle' : 'circle'}
                          size={20}
                          color={prod.isOfficialSeller ? '#10B981' : mutedColor}
                        />
                        <Text className="text-foreground text-sm">{t('teacher.markOfficialSeller')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Button variant="outline" onPress={addProduct} className="mb-2" disabled={products.length >= 30}>
                    <Feather name="plus" size={16} color={mutedColor} />
                    <Text>{t('teacher.addProductButton')}</Text>
                  </Button>
                </View>
              )}
            </ScrollView>

            {step === 'form' && (
              <View
                className="px-5 pt-4 border-t border-border flex-row gap-3"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              >
                <Button
                  variant="outline"
                  className="flex-1"
                  onPress={() => setStep('pickType')}
                  disabled={submitting}
                >
                  <Text>{t('teacher.backButton')}</Text>
                </Button>
                <Button
                  className="flex-1"
                  onPress={submitCreator}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-primary-foreground font-bold">{t('teacher.createButtonPlain')}</Text>
                  )}
                </Button>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
