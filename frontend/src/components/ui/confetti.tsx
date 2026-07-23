import { useEffect, useMemo } from "react";
import { View, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EC4899", "#38BDF8", "#A855F7", "#F97316"];
const DEFAULT_PIECE_COUNT = 40;

function ConfettiPiece({ index }: { index: number }) {
  const progress = useSharedValue(0);

  // Randomize once per piece rather than on every render.
  const config = useMemo(() => {
    const startX = Math.random() * SCREEN_WIDTH;
    const drift = (Math.random() - 0.5) * 140;
    const size = 6 + Math.random() * 6;
    const color = COLORS[index % COLORS.length];
    const delay = Math.random() * 300;
    const duration = 1600 + Math.random() * 900;
    const rotateStart = Math.random() * 360;
    const spin = 360 + Math.random() * 360;
    const rotateEnd = rotateStart + (Math.random() > 0.5 ? spin : -spin);
    const isCircle = Math.random() > 0.5;
    return { startX, drift, size, color, delay, duration, rotateStart, rotateEnd, isCircle };
  }, []);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: config.duration, easing: Easing.in(Easing.quad) })
    );
  }, []);

  const style = useAnimatedStyle(() => {
    const translateY = progress.value * (SCREEN_HEIGHT + 40) - 40;
    const translateX = config.drift * progress.value;
    const rotate = config.rotateStart + (config.rotateEnd - config.rotateStart) * progress.value;
    // Fade out over the last 15% of the fall so pieces don't just vanish abruptly at the bottom edge.
    const opacity = progress.value > 0.85 ? 1 - (progress.value - 0.85) / 0.15 : 1;

    return {
      transform: [{ translateY }, { translateX }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: config.startX,
          top: 0,
          width: config.size,
          height: config.size,
          backgroundColor: config.color,
          borderRadius: config.isCircle ? config.size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

export function Confetti({ pieceCount = DEFAULT_PIECE_COUNT }: { pieceCount?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
    >
      {Array.from({ length: pieceCount }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}
