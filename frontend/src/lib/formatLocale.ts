import { isSupportedLanguage, type AppLanguageCode } from '@/i18n/config';

const LOCALE_TAGS: Record<AppLanguageCode, string> = {
  en: 'en-SG',
  zh: 'zh-CN',
  ms: 'ms-MY',
  ta: 'ta-IN',
};

export function appLocaleTag(lang: string): string {
  if (isSupportedLanguage(lang)) return LOCALE_TAGS[lang];
  return LOCALE_TAGS.en;
}

export function formatAppDate(
  value: Date | string | number,
  lang: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(appLocaleTag(lang), options);
}
