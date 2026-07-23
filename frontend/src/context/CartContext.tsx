import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type MarketplaceScenario } from '@/api/marketshop';

const STORAGE_KEY = 'shopping-cart';

export type Product = MarketplaceScenario['products'][number];

export interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const loadCart = async () => {
      const storedCart = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedCart) {
        setItems(JSON.parse(storedCart));
      }
    };
    loadCart();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, [items]);

  const addToCart = useCallback((product: Product) => {
    setItems((prevItems) => {
      const isAlreadyInCart = prevItems.some((item) => item.id === product.id);
      if (isAlreadyInCart) {
        return prevItems;
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string | number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === productId ? { ...item, quantity } : item,
        ),
      );
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
