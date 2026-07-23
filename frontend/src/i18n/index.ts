import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LANGUAGE } from './config';
import { resources } from './resources';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      // React already escapes; escapeValue:false avoids double-escaping user values like {{name}}.
      escapeValue: false,
    },
    returnNull: false,
    parseMissingKeyHandler: (key) => key,
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
