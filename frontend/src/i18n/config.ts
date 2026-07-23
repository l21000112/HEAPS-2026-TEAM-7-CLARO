import * as Localization from 'expo-localization';

export type AppLanguageCode = 'en' | 'zh' | 'ms' | 'ta';

export interface LanguageMeta {
  /** i18next language code used as the resource key. */
  code: AppLanguageCode;
  /** Name shown in the language picker, written in that language. */
  nativeName: string;
  /** English name, used for accessibility / fallback. */
  englishName: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil' },
];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export const DEFAULT_LANGUAGE: AppLanguageCode = 'en';

export const LANGUAGE_STORAGE_KEY = 'app-language-preference';

export function isSupportedLanguage(value: unknown): value is AppLanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as string[]).includes(value);
}

function mapLocaleCodeToAppLanguage(code: string | null | undefined): AppLanguageCode | null {
  if (!code) return null;
  const normalized = code.toLowerCase();
  if (isSupportedLanguage(normalized)) return normalized;
  if (normalized.startsWith('zh')) return 'zh';
  return null;
}

/** Pick the best app language from the device locale list, else English. */
export function resolveDeviceLanguage(): AppLanguageCode {
  try {
    for (const locale of Localization.getLocales()) {
      const mapped = mapLocaleCodeToAppLanguage(locale.languageCode);
      if (mapped) return mapped;
    }
  } catch {
    // Ignore - fall back to English below.
  }
  return DEFAULT_LANGUAGE;
}

export function getLanguageMeta(code: AppLanguageCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
