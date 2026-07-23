import { scenarioTranslations } from '@/i18n/scenarios';

type Lang = string;

/** Minimum shape of a call scenario as received from the API. */
interface CallScenarioLike {
  id: string | number;
  callerName: string;
  dialogue: string;
  options: Array<{ id: string | number; text: string }>;
}

interface WhatsAppScenarioLike {
  id: string | number;
  contact: { displayName: string; phoneNumber?: string };
  openingMessages: Array<{ id: string; body: string; direction?: string }>;
}

function callMap(lang: Lang) {
  return scenarioTranslations[lang]?.call;
}

function whatsappMap(lang: Lang) {
  return scenarioTranslations[lang]?.whatsapp;
}

export function translateCallScenario<T extends CallScenarioLike>(scenario: T, lang: Lang): T {
  if (!scenario) return scenario;
  const tr = callMap(lang)?.[String(scenario.id)];
  if (!tr) return scenario;
  return {
    ...scenario,
    callerName: tr.callerName || scenario.callerName,
    dialogue: tr.dialogue || scenario.dialogue,
    options: (scenario.options ?? []).map((opt) => {
      const otr = tr.options[String(opt.id)];
      return { ...opt, text: otr?.text || opt.text };
    }),
  };
}

export function translateWhatsAppScenario<T extends WhatsAppScenarioLike>(
  scenario: T,
  lang: Lang,
): T {
  if (!scenario) return scenario;
  const tr = whatsappMap(lang)?.[String(scenario.id)];
  if (!tr) return scenario;
  return {
    ...scenario,
    contact: {
      ...scenario.contact,
      displayName: tr.contactName || scenario.contact.displayName,
    },
    openingMessages: (scenario.openingMessages ?? []).map((msg) => {
      const body = tr.openingMessages[String(msg.id)];
      return body ? { ...msg, body } : msg;
    }),
  };
}

export function resolveCallReason(
  lang: Lang,
  scenarioId: string | number,
  outcome: string,
  wantSimple: boolean,
): string | null {
  const tr = callMap(lang)?.[String(scenarioId)];
  if (!tr) return null;

  if (outcome === 'decline' || outcome === 'hangup') {
    if (wantSimple && tr.declineReasonSimple) return tr.declineReasonSimple;
    return tr.declineReason || null;
  }

  const otr = tr.options[String(outcome)];
  if (!otr) return null;
  if (wantSimple && otr.reasonSimple) return otr.reasonSimple;
  return otr.reason || null;
}

export function resolveWhatsAppDeclineReason(
  lang: Lang,
  scenarioId: string | number,
  wantSimple: boolean,
): string | null {
  const tr = whatsappMap(lang)?.[String(scenarioId)];
  if (!tr) return null;
  if (wantSimple && tr.declineReasonSimple) return tr.declineReasonSimple;
  return tr.declineReason || null;
}

/** Maps the active app language to a BCP-47 locale for expo-speech TTS. */
export function speechLocaleFor(lang: Lang): string {
  switch (lang) {
    case 'zh':
      return 'zh-CN';
    case 'ms':
      return 'ms-MY';
    case 'ta':
      return 'ta-IN';
    default:
      return 'en-US';
  }
}
