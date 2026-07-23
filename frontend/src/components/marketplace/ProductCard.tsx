import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/context/CartContext';
import { type MarketplaceScenario } from '@/api/marketshop';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

interface ProductCardProps {
  product: MarketplaceScenario['products'][number];
  scenarioId: string | number;
}

export function ProductCard({ product, scenarioId }: ProductCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addToCart, removeFromCart, items } = useCart();

  const isInCart = items.some((item) => item.id === product.id);

  const handlePress = () => {
    router.push({
      pathname: `/marketplace/item_detail`,
      params: {
        product: JSON.stringify(product),
        scenarioId: String(scenarioId),
        classroomId: params.classroomId,
        assignmentId: params.assignmentId,
        assignmentItemId: params.assignmentItemId,
      },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Card className="flex-row p-3 gap-4 items-center">
        <Image
          source={{ uri: product.imageUrl }}
          className="w-24 h-24 rounded-md bg-muted"
          resizeMode="cover"
        />
        <View className="flex-1 gap-1">
          <Text className="text-foreground font-bold" numberOfLines={2}>{product.name}</Text>
          <Text className="text-primary font-semibold">${product.price.toFixed(2)}</Text>
          <View className="flex-row items-center gap-2 pt-1 flex-wrap">
            <View className="flex-row items-center gap-1">
              <Feather name="star" size={12} color="#F59E0B" />
              <Text className="text-muted-foreground text-xs">{product.rating?.toFixed(1) || t('marketplace.ratingNA')}</Text>
            </View>
            <Text className="text-muted-foreground text-xs">|</Text>
            <Text className="text-muted-foreground text-xs">{t('marketplace.soldCountSuffix', { count: product.soldCount?.toLocaleString() || 0 })}</Text>
            <Text className="text-muted-foreground text-xs">|</Text>
            <Text className="text-muted-foreground text-xs">{t('marketplace.reviewCountSuffix', { count: product.reviewCount?.toLocaleString() || 0 })}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Feather name="user" size={12} color="#9CA3AF" />
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>{product.sellerName}</Text>
            {product.isOfficialSeller && (
               <Feather name="check-circle" size={12} color="#10B981" className="ml-1" />
            )}
          </View>
          <Button
            variant={isInCart ? 'secondary' : 'outline'}
            size="sm"
            className="self-start mt-1"
            onPress={(e) => {
              e.stopPropagation(); // Prevent card press when button is clicked
              if (isInCart) {
                removeFromCart(product.id);
              } else {
                addToCart(product);
              }
            }}
          >
            <Text>{isInCart ? t('marketplace.removeFromCart') : t('marketplace.addToCart')}</Text>
          </Button>
        </View>
      </Card>
    </TouchableOpacity>
  );
}