import * as Speech from 'expo-speech';
import { VoiceQuality, type SpeechOptions, type Voice } from 'expo-speech';
import { Platform } from 'react-native';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  type AppLanguageCode,
} from '@/i18n/config';
import { speechLocaleFor } from '@/lib/scenarioI18n';

type SpeakOverrides = Pick<
  SpeechOptions,
  'rate' | 'pitch' | 'onDone' | 'onError' | 'onStart' | 'onStopped'
>;

const VOICE_LOAD_RETRIES = Platform.OS === 'android' ? 8 : 1;
const VOICE_LOAD_RETRY_MS = 350;

let cachedVoices: Voice[] | null = null;
let voicesPromise: Promise<Voice[]> | null = null;

function resolveAppLanguage(lang: string): AppLanguageCode {
  return isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadVoices(): Promise<Voice[]> {
  if (cachedVoices) return cachedVoices;
  if (!voicesPromise) {
    voicesPromise = (async () => {
      for (let attempt = 0; attempt < VOICE_LOAD_RETRIES; attempt += 1) {
        const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
        if (voices.length > 0) {
          cachedVoices = voices;
          return voices;
        }
        if (attempt < VOICE_LOAD_RETRIES - 1) {
          await sleep(VOICE_LOAD_RETRY_MS);
        }
      }
      cachedVoices = [];
      return [];
    })();
  }
  return voicesPromise;
}

function primaryLanguageTag(locale: string): string {
  return locale.toLowerCase().split('-')[0];
}

function languageMatches(voiceLanguage: string, targetLocale: string): boolean {
  const voice = voiceLanguage.toLowerCase();
  const target = targetLocale.toLowerCase();
  const voicePrimary = primaryLanguageTag(voice);
  const targetPrimary = primaryLanguageTag(target);

  if (voice === target || voice.startsWith(`${target}-`) || target.startsWith(`${voice}-`)) {
    return true;
  }
  if (voicePrimary === targetPrimary) return true;

  // iOS/Android sometimes label Chinese voices as cmn/yue instead of zh.
  if (targetPrimary === 'zh' && (voicePrimary === 'zh' || voicePrimary === 'cmn' || voicePrimary === 'yue')) {
    return true;
  }

  return false;
}

function localePreferenceScore(voiceLanguage: string, targetLocale: string): number {
  const voice = voiceLanguage.toLowerCase();
  const target = targetLocale.toLowerCase();
  if (voice === target) return 30;
  if (voice.startsWith(`${target}-`) || target.startsWith(`${voice}-`)) return 20;
  if (primaryLanguageTag(voice) === primaryLanguageTag(target)) return 10;
  return 0;
}

function naturalnessScore(voice: Voice): number {
  const blob = `${voice.identifier} ${voice.name}`.toLowerCase();
  let score = 0;

  if (voice.quality === VoiceQuality.Enhanced) score += 50;

  if (/\benhanced\b|premium|neural|wavenet|natural/.test(blob)) score += 25;
  if (/\bcompact\b|\.compact\.|low_quality|espeak|pico|robot|novelty/.test(blob)) score -= 80;
  if (/\bnetwork\b/.test(blob)) score += 12;
  if (/\blocal\b/.test(blob)) score += 4;

  // Common high-quality English voices on iOS / Google TTS.
  if (
    /\bsamantha\b|\ballison\b|\bava\b|\bzoe\b|\bnicky\b|\bkaren\b|\bdaniel\b|\bserena\b|\bmoira\b/.test(
      blob,
    )
  ) {
    score += 18;
  }

  if (/\bsiri\b/.test(blob) && !/\bcompact\b/.test(blob)) score += 8;

  return score;
}

function pickBestVoice(voices: Voice[], targetLocale: string): Voice | undefined {
  const candidates = voices.filter((voice) => languageMatches(voice.language, targetLocale));
  if (candidates.length === 0) return undefined;

  const ranked = [...candidates].sort((a, b) => {
    const localeScore =
      localePreferenceScore(b.language, targetLocale) -
      localePreferenceScore(a.language, targetLocale);
    if (localeScore !== 0) return localeScore;

    const naturalScore = naturalnessScore(b) - naturalnessScore(a);
    if (naturalScore !== 0) return naturalScore;

    return a.name.localeCompare(b.name);
  });

  const best = ranked[0];
  // A negative score usually means a compact/low-quality voice; locale-only is often better.
  if (naturalnessScore(best) < 0) return undefined;

  return best;
}

function speechRateFor(lang: AppLanguageCode): number {
  // English TTS often sounds less robotic when spoken slightly slower.
  return lang === 'en' ? 0.86 : 0.92;
}

function speechPitchFor(lang: AppLanguageCode): number {
  return lang === 'en' ? 0.97 : 1.0;
}

export async function buildCallSpeechOptions(
  lang: string,
  overrides?: SpeakOverrides,
): Promise<SpeechOptions> {
  const appLanguage = resolveAppLanguage(lang);
  const language = speechLocaleFor(appLanguage);
  const voices = await loadVoices();
  const voice = pickBestVoice(voices, language);

  if (__DEV__) {
    if (!voice) {
      console.info(`[callSpeech] No good voice for ${language}; using locale fallback.`);
    } else {
      console.info(
        `[callSpeech] ${language} -> ${voice.name} (${voice.quality}, score=${naturalnessScore(voice)})`,
      );
    }
  }

  return {
    language,
    pitch: speechPitchFor(appLanguage),
    rate: speechRateFor(appLanguage),
    ...(voice ? { voice: voice.identifier } : {}),
    ...overrides,
  };
}

export async function speakCallDialogue(
  text: string,
  lang: string,
  overrides?: SpeakOverrides,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  Speech.stop();
  const options = await buildCallSpeechOptions(lang, overrides);
  Speech.speak(trimmed, options);
}

export function stopCallSpeech(): void {
  Speech.stop();
}
