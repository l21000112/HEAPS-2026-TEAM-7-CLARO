import type { Feather } from "@expo/vector-icons";

export const ACHIEVEMENTS_V2 = true;

export type BadgeTierId = "rookie" | "apprentice" | "adept" | "expert" | "master";

export type BadgeTier = {
  id: BadgeTierId;
  /** i18n key for the localized tier name. */
  nameKey: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  /** Minimum totalAttempts (completed scenarios) required. */
  minDone: number;
  /** Minimum accuracy % (0-100) required. 0 means no accuracy gate. */
  minAccuracy: number;
};

// Ordered lowest -> highest. computeBadge relies on this ordering.
export const BADGE_TIERS: BadgeTier[] = [
  { id: "rookie", nameKey: "student.badgeTierRookie", icon: "shield", color: "#94A3B8", minDone: 1, minAccuracy: 0 },
  { id: "apprentice", nameKey: "student.badgeTierApprentice", icon: "flag", color: "#38BDF8", minDone: 5, minAccuracy: 60 },
  { id: "adept", nameKey: "student.badgeTierAdept", icon: "award", color: "#10B981", minDone: 12, minAccuracy: 70 },
  { id: "expert", nameKey: "student.badgeTierExpert", icon: "target", color: "#8B5CF6", minDone: 25, minAccuracy: 80 },
  { id: "master", nameKey: "student.badgeTierMaster", icon: "star", color: "#F59E0B", minDone: 50, minAccuracy: 85 },
];

export type BadgeProgress = {
  /** -1 when no tier is earned yet (0 attempts). */
  tierIndex: number;
  current: BadgeTier | null;
  next: BadgeTier | null;
  isMax: boolean;
  totalTiers: number;
  /** 0-100 progress toward the next tier's done requirement. 100 when maxed. */
  doneProgressPct: number;
  /** 0-100 progress toward the next tier's accuracy requirement. 100 when maxed. */
  accuracyProgressPct: number;
};

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function meetsTier(done: number, accuracy: number, tier: BadgeTier): boolean {
  return done >= tier.minDone && accuracy >= tier.minAccuracy;
}

export function computeBadge(done: number, accuracyPct: number): BadgeProgress {
  const totalTiers = BADGE_TIERS.length;
  let tierIndex = -1;
  for (let i = 0; i < BADGE_TIERS.length; i++) {
    if (meetsTier(done, accuracyPct, BADGE_TIERS[i])) {
      tierIndex = i;
    } else {
      break; // tiers are ordered; stop at the first unmet tier
    }
  }

  const current = tierIndex >= 0 ? BADGE_TIERS[tierIndex] : null;
  const next = tierIndex < totalTiers - 1 ? BADGE_TIERS[tierIndex + 1] : null;
  const isMax = tierIndex === totalTiers - 1;

  let doneProgressPct = 100;
  let accuracyProgressPct = 100;
  if (next) {
    // Done progress measured from the current tier's threshold to the next's.
    const baseDone = current ? current.minDone : 0;
    const doneSpan = Math.max(1, next.minDone - baseDone);
    doneProgressPct = clampPct(((done - baseDone) / doneSpan) * 100);

    // Accuracy progress measured from the current tier's gate to the next's.
    const baseAcc = current ? current.minAccuracy : 0;
    const accSpan = Math.max(1, next.minAccuracy - baseAcc);
    accuracyProgressPct = clampPct(((accuracyPct - baseAcc) / accSpan) * 100);
  }

  return { tierIndex, current, next, isMax, totalTiers, doneProgressPct, accuracyProgressPct };
}
