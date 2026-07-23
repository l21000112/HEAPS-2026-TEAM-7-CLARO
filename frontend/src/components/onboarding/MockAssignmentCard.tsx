import { View, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingTarget } from '@/components/onboarding/OnboardingTarget';
import { useOnboarding } from '@/context/OnboardingContext';
import { useTranslation } from 'react-i18next';

export function MockAssignmentCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { goToStep } = useOnboarding();

  const handleStart = () => {
    goToStep('practice_banner_intro');
    router.push('/scam-call/mock-call' as Href);
  };

  return (
    <OnboardingTarget id="mock_assignment_card">
      <Card className="border-2 border-primary">
        <CardContent className="gap-3 py-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="flask-outline" size={20} color="#6366F1" />
            <Text className="text-foreground font-bold">{t('onboarding.mockTitle')}</Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            {t('onboarding.mockDesc')}
          </Text>
          <TouchableOpacity className="bg-primary py-3 rounded-xl items-center" onPress={handleStart}>
            <Text className="text-primary-foreground font-bold">{t('onboarding.mockStart')}</Text>
          </TouchableOpacity>
        </CardContent>
      </Card>
    </OnboardingTarget>
  );
}
