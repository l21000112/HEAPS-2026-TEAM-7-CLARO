import { useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { getMarketplaceScenario, getMarketplaceScenarioById } from '@/api/marketshop';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useCart } from '@/context/CartContext';
import { useSimpleLanguage } from '@/context/simpleLanguageContext';
import { useColors } from '@/lib/useColors';
import { useTranslation } from 'react-i18next';

export default function MarketShopScreen() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { simpleLanguage } = useSimpleLanguage();
  const { items, totalItems, clearCart } = useCart();
  const router = useRouter();
  const params = useLocalSearchParams();
  const scenarioId = typeof params.scenarioId === 'string' ? params.scenarioId : '';
  const iconColor = isDark ? '#9CA3AF' : '#4B5563';
  const colors = useColors();

  const cartScale = useSharedValue(1);
  useEffect(() => {
    if (totalItems > 0) {
      cartScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 650 }),
          withTiming(1, { duration: 650 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(cartScale);
      cartScale.value = 1;
    }
  }, [totalItems, cartScale]);
  const cartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }],
  }));

  const { data: scenario, isLoading } = useQuery({
    queryKey: ['marketplaceScenario', scenarioId, i18n.language],
    queryFn: () => scenarioId ? getMarketplaceScenarioById(scenarioId, i18n.language) : getMarketplaceScenario(i18n.language),
  });

  const handleCheckout = () => {
    if (!scenario) return;
    const cartItem = items[0];
    const isCorrect = cartItem?.id === scenario.targetProductId;
    let reason = t('marketplace.emptyCartReason');
    if (cartItem) {
      const selectedProduct = scenario.products.find(p => p.id === cartItem.id);
      // API-H1: surface the per-product feedback the backend already returns.
      reason = selectedProduct?.reason ?? t('marketplace.emptyCartReason');
    }

    router.push({
      pathname: '/marketplace/result',
      params: {
        isCorrect: String(isCorrect),
        reason,
        actionTaken: cartItem ? t('marketplace.checkedOutWithPrefix', { name: cartItem.name }) : t('marketplace.checkedOutEmpty'),
        scenarioId: scenario.id,
        classroomId: params.classroomId ?? '',
        assignmentId: params.assignmentId ?? '',
        assignmentItemId: params.assignmentItemId ?? '',
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <Stack.Screen options={{ title: t('marketplace.stackTitle') }} />
      <View className="p-4 pt-4 gap-4">
        {scenario && (
          <View className="bg-secondary p-4 rounded-lg gap-2">
            <Text className="text-foreground font-semibold text-base">{t('marketplace.yourTask')}</Text>
            <Text className="text-muted-foreground">{scenario.taskDescription}</Text>
          </View>
        )}
  
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-foreground">{t('marketplace.products')}</Text>
            <Pressable
              onPress={handleCheckout}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={totalItems > 0 ? { backgroundColor: `${colors.primary}1F` } : undefined}
            >
              <Animated.View style={[cartAnimatedStyle, { position: 'relative' }]}>
                <Ionicons
                  name={totalItems > 0 ? 'cart' : 'cart-outline'}
                  size={24}
                  color={totalItems > 0 ? colors.primary : iconColor}
                />
                {totalItems > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -6,
                      backgroundColor: colors.primary,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 }}>
                      {totalItems}
                    </Text>
                  </View>
                )}
              </Animated.View>
              <Text
                className="text-sm font-bold"
                style={{ color: totalItems > 0 ? colors.primary : iconColor }}
              >
                {t('marketplace.checkout')}
              </Text>
            </Pressable>
          </View>
      </View>
      <ScrollView contentContainerClassName="px-4 pb-4 gap-4">
        {isLoading ? (
          <ActivityIndicator size="large" className="mt-8" />
        )  : (
          scenario?.products.map((product) => (
            <ProductCard key={product.id} product={product} scenarioId={scenario.id} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
