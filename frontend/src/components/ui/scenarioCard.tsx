import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';

interface Scenario {
  id?: string; // Made optional to match your usage
  title: string;
  description: string;
  route?: string;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onPress: () => void;
  disabled?: boolean;
}

export function ScenarioCard({ 
  scenario, 
  onPress, 
  disabled = false 
}: ScenarioCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withTiming(0.97, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withTiming(1, { duration: 150 });
    }
  };

  return (
    <TextClassContext.Provider value="text-card-foreground">
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={t('commonUI.startScenarioA11y', { title: scenario.title })}
        accessibilityState={{ disabled }}
        className={cn(
          "active:opacity-70",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <Animated.View style={animatedStyle}>
          <Card>
            <CardContent className="gap-1 py-4">
              <Text className="text-lg font-semibold text-card-foreground">
                {scenario.title}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {scenario.description}
              </Text>
            </CardContent>
          </Card>
        </Animated.View>
      </Pressable>
    </TextClassContext.Provider>
  );
}