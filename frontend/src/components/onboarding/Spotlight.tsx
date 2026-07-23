import { View, Pressable, useWindowDimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import type { TargetLayout } from '@/context/OnboardingContext';
import { useTranslation } from 'react-i18next';

const SPOTLIGHT_PADDING = 10;
const SPOTLIGHT_RADIUS = 16;
const DIM_COLOR = 'rgba(15, 17, 23, 0.72)';

/** Targets larger than this screen fraction get a full dim + centered card instead of a cutout (else the hole eats the whole overlay). */
const LARGE_TARGET_AREA_RATIO = 0.32;

type SpotlightMaskProps = {
  rect: TargetLayout;
  padding?: number;
  /** When true, dim the whole screen (no cutout). Used for near-full-screen targets. */
  fullDim?: boolean;
};

export function SpotlightMask({ rect, padding = SPOTLIGHT_PADDING, fullDim = false }: SpotlightMaskProps) {
  if (fullDim) {
    return (
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DIM_COLOR }}
      />
    );
  }

  const holeX = Math.max(0, rect.x - padding);
  const holeY = Math.max(0, rect.y - padding);
  const holeW = rect.width + padding * 2;
  const holeH = rect.height + padding * 2;

  return (
    <>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, height: holeY, backgroundColor: DIM_COLOR }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: holeY + holeH,
          right: 0,
          bottom: 0,
          backgroundColor: DIM_COLOR,
        }}
      />
      <View
        style={{ position: 'absolute', left: 0, top: holeY, width: holeX, height: holeH, backgroundColor: DIM_COLOR }}
      />
      <View
        style={{
          position: 'absolute',
          left: holeX + holeW,
          top: holeY,
          right: 0,
          height: holeH,
          backgroundColor: DIM_COLOR,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: holeX,
          top: holeY,
          width: holeW,
          height: holeH,
          borderRadius: SPOTLIGHT_RADIUS,
          borderWidth: 2,
          borderColor: '#818CF8',
          shadowColor: '#818CF8',
          shadowOpacity: 0.9,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </>
  );
}

export function isLargeSpotlightTarget(rect: TargetLayout, screenW: number, screenH: number) {
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  return area >= screenW * screenH * LARGE_TARGET_AREA_RATIO || rect.height >= screenH * 0.5;
}

type TourTooltipProps = {
  title: string;
  body: string;
  anchorRect?: TargetLayout;
  ctaLabel?: string;
  onCta?: () => void;
  onSkip?: () => void;
  stepLabel?: string;
  /** Force the card to the middle of the screen (large targets / full-dim steps). */
  centered?: boolean;
};

const TOOLTIP_WIDTH = 300;
const TOOLTIP_MARGIN = 16;
const TOOLTIP_EST_HEIGHT = 200;

export function TourTooltip({
  title,
  body,
  anchorRect,
  ctaLabel,
  onCta,
  onSkip,
  stepLabel,
  centered = false,
}: TourTooltipProps) {
  const { t } = useTranslation();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const useCentered =
    centered ||
    !anchorRect ||
    isLargeSpotlightTarget(anchorRect, screenW, screenH);

  let top: number;
  let left: number;

  if (useCentered) {
    top = Math.max(TOOLTIP_MARGIN + 48, (screenH - TOOLTIP_EST_HEIGHT) / 2);
    left = (screenW - TOOLTIP_WIDTH) / 2;
  } else {
    const spaceBelow = screenH - (anchorRect.y + anchorRect.height);
    const placeBelow = spaceBelow > 190 || anchorRect.y < screenH * 0.4;
    top = placeBelow
      ? anchorRect.y + anchorRect.height + SPOTLIGHT_PADDING + 14
      : Math.max(60, anchorRect.y - SPOTLIGHT_PADDING - 14 - 150);
    left = Math.min(
      Math.max(anchorRect.x + anchorRect.width / 2 - TOOLTIP_WIDTH / 2, TOOLTIP_MARGIN),
      screenW - TOOLTIP_WIDTH - TOOLTIP_MARGIN,
    );
  }

  // Keep the card fully on-screen even if the anchor math was aggressive.
  top = Math.min(Math.max(top, TOOLTIP_MARGIN + 40), screenH - TOOLTIP_EST_HEIGHT - TOOLTIP_MARGIN);

  return (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width: TOOLTIP_WIDTH,
        zIndex: 20,
        elevation: 20,
      }}
      className="bg-card border border-border rounded-2xl p-4 gap-2 shadow-lg shadow-black/20"
    >
      {stepLabel ? <Text className="text-primary text-xs font-bold tracking-wide">{stepLabel}</Text> : null}
      <Text className="text-foreground text-base font-bold">{title}</Text>
      <Text className="text-muted-foreground text-sm leading-5">{body}</Text>
      <View className="flex-row items-center justify-between mt-2">
        {onSkip ? (
          <Pressable onPress={onSkip} hitSlop={8}>
            <Text className="text-muted-foreground text-xs underline">{t('onboarding.skipTour')}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {ctaLabel && onCta ? (
          <Pressable onPress={onCta} className="bg-primary px-4 py-2 rounded-lg active:opacity-80">
            <Text className="text-primary-foreground text-sm font-bold">{ctaLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
