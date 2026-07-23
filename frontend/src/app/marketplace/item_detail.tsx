import { View, ScrollView, Image, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { getMarketplaceScenarioById, type Product } from '@/api/marketshop';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/themeContext';
import { useSimpleLanguage } from '@/context/simpleLanguageContext';
import { useTranslation } from 'react-i18next';

export default function ProductDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ product: string; scenarioId: string; classroomId?: string; assignmentId?: string; assignmentItemId?: string; }>();
  const { addToCart, removeFromCart, totalItems, items } = useCart();
  const { isDark } = useTheme();
  const { simpleLanguage } = useSimpleLanguage();
  const iconColor = isDark ? '#e5e7eb' : '#111827';

  const { data: scenario } = useQuery({
    queryKey: ['marketplaceScenario', params.scenarioId, i18n.language],
    queryFn: () => getMarketplaceScenarioById(params.scenarioId!, i18n.language),
    enabled: !!params.scenarioId,
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
        classroomId: params.classroomId,
        assignmentId: params.assignmentId,
        assignmentItemId: params.assignmentItemId,
      },
    });
  };

  const product: Product | null = params.product
    ? JSON.parse(params.product)
    : null;

  const isInCart = product ? items.some((item) => item.id === product.id) : false;

  const handleCartAction = () => {
    if (product) {
      if (isInCart) {
        removeFromCart(product.id);
      } else {
        addToCart(product);
      }
    }
  };

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-4 gap-4">
        <Stack.Screen options={{ title: t('marketplace.notFoundTitle') }} />
        <Text className="text-lg text-destructive font-semibold">{t('marketplace.productNotFound')}</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>{t('marketplace.goBack')}</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className={`bg-background ${isDark ? 'dark' : ''}`}>
      <Stack.Screen
        options={{
          title: product.name,
          headerShown: true,
          headerTitleStyle: { color: iconColor },
          headerStyle: { backgroundColor: isDark ? '#000' : '#fff' },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="p-2 -ml-2">
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleCheckout}
              className="relative p-2"
            >
              <Ionicons name="cart-outline" size={28} color={iconColor} />
              {totalItems > 0 && (
                <View className="absolute top-0 right-0 bg-primary rounded-full w-5 h-5 justify-center items-center">
                  <Text className="text-primary-foreground text-xs font-bold">
                    {totalItems}
                  </Text>
                </View>
              )}
            </Pressable>
          ),
        }}
      />
      <ScrollView className='px-4' contentContainerClassName="gap-4">
        <Image source={{ uri: product.imageUrl }} className="w-full h-64 rounded-lg bg-muted" resizeMode="cover" />
        
        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">{product.name}</Text>
          <Text className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</Text>
        </View>

        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-muted-foreground">
            {t('marketplace.soldCountSuffix', { count: product.soldCount?.toLocaleString() || 0 })}
          </Text>
          <View className="flex-row items-center gap-1">
            <Feather name="star" size={14} color="#F59E0B" />
            <Text className="text-sm font-bold text-foreground">
              {product.rating?.toFixed(1) || t('marketplace.ratingNA')}
            </Text>
            <Text className="text-sm text-muted-foreground">({product.reviewCount || 0})</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2 bg-secondary p-3 rounded-lg">
          <Feather name="user" size={16} color="#9CA3AF" />
          <Text className="text-muted-foreground">{t('marketplace.soldBy')}</Text>
          <Text className="text-foreground font-semibold">{product.sellerName}</Text>
          {product.isOfficialSeller && (
             <Feather name="check-circle" size={16} color="#10B981" className="ml-1" />
          )}
        </View>

        <View className="gap-2">
          <Text className="text-lg font-bold text-foreground">{t('marketplace.descriptionTitle')}</Text>
          <Text className="text-base text-muted-foreground leading-6">{product.description}</Text>
        </View>

        {product.reviews && product.reviews.length > 0 && (
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">{t('marketplace.customerReviews')}</Text>
            {product.reviews.map((review, index) => (
              <View key={index} className="bg-secondary p-3 rounded-lg">
                <Text className="text-secondary-foreground italic">"{review}"</Text>
              </View>
            ))}
          </View>
        )}

        <Button className='mb-4' variant={isInCart ? 'secondary' : 'default'} size="lg" onPress={handleCartAction}>
          <Text>{isInCart ? t('marketplace.removeFromCart') : t('marketplace.addToCart')}</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}