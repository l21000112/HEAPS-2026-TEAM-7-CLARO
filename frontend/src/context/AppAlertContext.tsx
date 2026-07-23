import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useColors } from '@/lib/useColors';

type AlertVariant = 'info' | 'success' | 'error';

const VARIANT_ICON: Record<AlertVariant, { name: keyof typeof Feather.glyphMap; bg: string }> = {
  info: { name: 'info', bg: 'primary' },
  success: { name: 'check-circle', bg: 'success' },
  error: { name: 'alert-circle', bg: 'destructive' },
};

type AlertConfig = {
  title: string;
  message?: string;
  variant?: AlertVariant;
  buttons?: Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }>;
};

type AppAlertContextValue = {
  alert: (title: string, message?: string, buttons?: AlertConfig['buttons'], variant?: AlertVariant) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const colors = useColors();

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertConfig['buttons'],
      variant?: AlertVariant,
    ) => {
      setConfig({ title, message, variant, buttons });
    },
    [],
  );

  const close = useCallback((onPress?: () => void) => {
    setConfig(null);
    onPress?.();
  }, []);

  const value = useMemo(() => ({ alert }), [alert]);

  const cfg = config;
  const variant = cfg?.variant ?? 'info';
  const iconMeta = VARIANT_ICON[variant];

  const iconColorMap: Record<AlertVariant, string> = {
    info: colors.primary,
    success: colors.success,
    error: colors.destructive,
  };
  const iconBgMap: Record<AlertVariant, string> = {
    info: `${colors.primary}22`,
    success: `${colors.success}22`,
    error: `${colors.destructive}22`,
  };

  const buttons = cfg?.buttons?.length
    ? cfg.buttons
    : [{ text: 'OK', style: 'default' as const }];

  return (
    <AppAlertContext.Provider value={value}>
      {children}

      <Modal
        visible={cfg !== null}
        transparent
        animationType="fade"
        onRequestClose={() => close()}
        statusBarTranslucent
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPress={() => close()}
        >
          <Pressable
            onPress={() => {}}
            style={{ width: '100%', maxWidth: 340 }}
            className="bg-card border border-border rounded-3xl p-5"
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className="w-11 h-11 rounded-2xl items-center justify-center"
                style={{ backgroundColor: iconBgMap[variant] }}
              >
                <Feather name={iconMeta.name} size={22} color={iconColorMap[variant]} />
              </View>
              <Text className="text-foreground text-lg font-bold flex-1">{cfg?.title}</Text>
            </View>

            {cfg?.message ? (
              <Text className="text-muted-foreground text-sm leading-5 mb-4">{cfg.message}</Text>
            ) : (
              <View style={{ height: 8 }} />
            )}

            <View className={`flex-row gap-3 ${buttons.length === 1 ? 'justify-end' : ''}`}>
              {buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <Pressable
                    key={i}
                    onPress={() => close(btn.onPress)}
                    className={`${
                      buttons.length > 1 ? 'flex-1' : 'px-6'
                    } py-3 rounded-xl items-center active:opacity-80 ${
                      isDestructive
                        ? 'bg-destructive'
                        : isCancel
                          ? 'bg-muted'
                          : 'bg-primary'
                    }`}
                  >
                    <Text
                      className={`font-bold text-sm ${
                        isDestructive
                          ? 'text-white'
                          : isCancel
                            ? 'text-muted-foreground'
                            : 'text-primary-foreground'
                      }`}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) throw new Error('useAppAlert must be used within an AppAlertProvider');
  return ctx;
}
