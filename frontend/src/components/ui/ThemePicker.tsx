import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/context/themeContext';
import { useTranslation } from 'react-i18next';
import { useColors } from '@/lib/useColors';

type ThemeMode = 'light' | 'dark' | 'system';

const OPTIONS: Array<{
  value: ThemeMode;
  icon: keyof typeof Feather.glyphMap;
  labelKey: 'settings.themeLight' | 'settings.themeDark' | 'settings.themeSystem';
}> = [
  { value: 'light', icon: 'sun', labelKey: 'settings.themeLight' },
  { value: 'dark', icon: 'moon', labelKey: 'settings.themeDark' },
  { value: 'system', icon: 'smartphone', labelKey: 'settings.themeSystem' },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <View className="flex-row bg-input border border-border rounded-full p-1">
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => setTheme(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(option.labelKey)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full ${
              active ? 'bg-primary' : ''
            }`}
          >
            <Feather
              name={option.icon}
              size={14}
              color={active ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              className={`text-xs font-semibold ${
                active ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
