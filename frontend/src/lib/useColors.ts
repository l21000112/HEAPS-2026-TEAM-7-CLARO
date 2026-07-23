// Literal hex mirrors global.css tokens — native props (icons, placeholderTextColor, tabBarActiveTintColor, StyleSheet) bypass NativeWind and need these. Sim chrome (styles/scam-call.ts) keeps its own palette; SIM_ACCENTS tags scenarios by type. Keep in sync.

import { useTheme } from '@/context/themeContext';

type ColorSet = {
  accentAssign: string;
  accentScenarios: string;
  accentClasses: string;
  accentAnalytics: string;
  placeholder: string;
  primary: string;
  primaryForeground: string;
  mutedForeground: string;
  muted: string;
  foreground: string;
  card: string;
  background: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  destructive: string;
  rose: string;
};

const LIGHT: ColorSet = {
  accentAssign: '#CB6B4D',
  accentScenarios: '#4B8B6B',
  accentClasses: '#598CC0',
  accentAnalytics: '#CF9430',
  placeholder: '#9CA3AF',
  primary: '#5E4E45',
  primaryForeground: '#FBF6F2',
  mutedForeground: '#756861',
  muted: '#E5E0DB',
  foreground: '#231E1A',
  card: '#FEFDFB',
  background: '#FBF7F4',
  border: '#EAE0D7',
  accent: '#F4DAD7',
  success: '#358D5A',
  warning: '#DE8912',
  destructive: '#C73E29',
  rose: '#E2A5A1',
};

const DARK: ColorSet = {
  accentAssign: '#D68467',
  accentScenarios: '#5CA37F',
  accentClasses: '#6FA3D1',
  accentAnalytics: '#DBA84D',
  placeholder: '#6B7280',
  primary: '#C4A997',
  primaryForeground: '#231D18',
  mutedForeground: '#B0A49B',
  muted: '#3A332E',
  foreground: '#F1EBE4',
  card: '#221E1B',
  background: '#1A1614',
  border: '#3E3732',
  accent: '#4B3430',
  success: '#53C683',
  warning: '#F0B042',
  destructive: '#DB604D',
  rose: '#D28E89',
};

export function useColors(): ColorSet {
  const { isDark } = useTheme();
  return isDark ? DARK : LIGHT;
}

/** Non-hook access when you already know the mode (e.g. inside StyleSheet factories). */
export function getColors(isDark: boolean): ColorSet {
  return isDark ? DARK : LIGHT;
}

export type SimType = 'call' | 'chat' | 'marketplace' | 'instagram';

const SIM_LIGHT: Record<SimType, string> = {
  call: '#8764C4',        // muted violet
  chat: '#3D8F66',        // muted green
  marketplace: '#E3791C', // warm orange
  instagram: '#D3699E',   // muted magenta
};

const SIM_DARK: Record<SimType, string> = {
  call: '#AD90DF',
  chat: '#4EBC85',
  marketplace: '#EB9947',
  instagram: '#E085B3',
};

/** Resolve a scam-type accent for the current mode. */
export function useSimAccent(type: SimType): string {
  const { isDark } = useTheme();
  return (isDark ? SIM_DARK : SIM_LIGHT)[type];
}

/** Whole set, for when you need several at once. */
export function useSimAccents(): Record<SimType, string> {
  const { isDark } = useTheme();
  return isDark ? SIM_DARK : SIM_LIGHT;
}

export const SIM_ACCENTS = { light: SIM_LIGHT, dark: SIM_DARK };
