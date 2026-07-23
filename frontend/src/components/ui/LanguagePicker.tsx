import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES, type AppLanguageCode } from '@/i18n/config';
import { useTranslation } from 'react-i18next';

interface LanguagePickerProps {
  /** Hide the surrounding label row (useful on the register screen). */
  hideLabel?: boolean;
}

const NAVBAR_LABELS: Record<AppLanguageCode, string> = {
  en: 'English',
  zh: '中文',
  ms: 'Melayu',
  ta: 'தமிழ்',
};

export function LanguagePicker({ hideLabel = false }: LanguagePickerProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <View>
      {!hideLabel && (
        <Text className="text-foreground mb-2">{t('language.settingsLabel')}</Text>
      )}
      <View className="flex-row bg-input border border-border rounded-full p-1">
        {LANGUAGES.map((meta) => {
          const active = meta.code === language;
          return (
            <Pressable
              key={meta.code}
              onPress={() => setLanguage(meta.code)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={meta.englishName}
              className={`flex-1 items-center justify-center py-2.5 rounded-full ${
                active ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
                numberOfLines={1}
              >
                {NAVBAR_LABELS[meta.code]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
