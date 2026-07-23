import { cn } from '@/lib/utils';
import * as ProgressPrimitive from '@rn-primitives/progress';
import { Platform, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

function Progress({
  className,
  value,
  indicatorClassName,
  animate = true,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  /** When false, the indicator snaps to value with no spring. */
  animate?: boolean;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}>
      <Indicator value={value} className={indicatorClassName} animate={animate} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

const Indicator = Platform.select({
  web: WebIndicator,
  native: NativeIndicator,
  default: NullIndicator,
});

type IndicatorProps = {
  value: number | undefined | null;
  className?: string;
  animate?: boolean;
};

function WebIndicator({ value, className }: IndicatorProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View
      className={cn('bg-primary h-full w-full flex-1 transition-all', className)}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}>
      <ProgressPrimitive.Indicator className={cn('h-full w-full', className)} />
    </View>
  );
}

function NativeIndicator({ value, className, animate = true }: IndicatorProps) {
  const target = interpolate(value ?? 0, [0, 100], [1, 100], Extrapolation.CLAMP);
  const width = useDerivedValue(() => {
    return animate
      ? withSpring(target, { overshootClamping: true })
      : target;
  }, [value, animate]);

  const indicator = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  if (Platform.OS === 'web') return null;

  return (
    <Animated.View
      style={indicator}
      className={cn('bg-primary h-full rounded-full', className)}
    />
  );
}

function NullIndicator(_props: IndicatorProps) {
  return null;
}
