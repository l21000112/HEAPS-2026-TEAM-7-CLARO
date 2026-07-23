import "../../../global.css";
import { View, ScrollView, Switch } from "react-native";
import Slider from "@react-native-community/slider";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogoutButton } from "@/components/ui/Log-out";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { DeleteAccountButton } from "@/components/ui/deleteAccount";
import { useTheme } from "@/context/themeContext";
import { useFontSize, FONT_SCALE_STEPS } from "@/context/fontSizeContext";
import { useSimpleLanguage } from "@/context/simpleLanguageContext";
import { useReducedAnimations } from "@/context/reducedAnimationsContext";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { isDark } = useTheme();
  const { fontScale, setFontScale } = useFontSize();
  const { simpleLanguage, setSimpleLanguage } = useSimpleLanguage();
  const { reducedAnimations, setReducedAnimations } = useReducedAnimations();
  const { t } = useTranslation();
  const FONT_SIZE_LABELS = [
    t('settings.textSizeSmall'),
    t('settings.textSizeDefault'),
    t('settings.textSizeLarge'),
    t('settings.textSizeExtraLarge'),
  ];
  const stepIndex = FONT_SCALE_STEPS.indexOf(fontScale);
  const safeIndex = stepIndex === -1 ? 1 : stepIndex;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-4 pb-4 gap-4">
        <Text className="text-2xl font-bold text-foreground">{t('settings.title')}</Text>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.appearance')}</CardTitle>
            <CardDescription>{t('settings.appearanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <ThemePicker />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.language')}</CardTitle>
            <CardDescription>{t('settings.languageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <LanguagePicker hideLabel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.textSize')}</CardTitle>
            <CardDescription>{t('settings.textSizeDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Text className="text-center text-foreground" style={{ fontSize: 20 * fontScale }}>
              Aa
            </Text>
            <Slider
              minimumValue={0}
              maximumValue={FONT_SCALE_STEPS.length - 1}
              step={1}
              value={safeIndex}
              onSlidingComplete={(index) => setFontScale(FONT_SCALE_STEPS[index])}
              minimumTrackTintColor={isDark ? '#ffffff' : '#000000'}
              maximumTrackTintColor={isDark ? '#3f3f46' : '#e4e4e7'}
              accessibilityRole="adjustable"
              accessibilityLabel={t('settings.textSize')}
              accessibilityValue={{
                min: 0,
                max: FONT_SCALE_STEPS.length - 1,
                now: safeIndex,
                text: FONT_SIZE_LABELS[safeIndex],
              }}
            />
            <Text className="text-center text-muted-foreground text-sm">
              {FONT_SIZE_LABELS[safeIndex]}
            </Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.accessibility')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-foreground">{t('settings.simplerExplanations')}</Text>
              <Text className="text-primary text-xs">{t('settings.simplerExplanationsDescription')}</Text>
            </View>
            <Switch
              value={simpleLanguage}
              onValueChange={setSimpleLanguage}
              accessibilityLabel={t('settings.simplerExplanations')}
              accessibilityHint={t('settings.simplerExplanationsHint')}
            />
          </CardContent>
          <CardContent className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-foreground">{t('settings.reducedAnimations')}</Text>
              <Text className="text-primary text-xs">{t('settings.reducedAnimationsDescription')}</Text>
            </View>
            <Switch
              value={reducedAnimations}
              onValueChange={setReducedAnimations}
              accessibilityLabel={t('settings.reducedAnimations')}
              accessibilityHint={t('settings.reducedAnimationsHint')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.account')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LogoutButton />
            <DeleteAccountButton role="student" />
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}