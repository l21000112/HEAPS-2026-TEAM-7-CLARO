import type { AppLanguageCode } from '../config';
import type { Resource } from 'i18next';
import en from './en';
import zh from './zh';
import ms from './ms';
import ta from './ta';

export const resources: Resource = {
  en: { translation: en },
  zh: { translation: zh },
  ms: { translation: ms },
  ta: { translation: ta },
} as unknown as Resource;

export const SUPPORTED_LANGUAGES: AppLanguageCode[] = ['en', 'zh', 'ms', 'ta'];

export type { ResourceBundle } from './en';
