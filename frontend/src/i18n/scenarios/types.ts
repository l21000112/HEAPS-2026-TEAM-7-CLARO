export interface CallOptionTranslation {
  /** The option's answer text shown during the call. */
  text: string;
  /** Full explanation shown on the result screen. */
  reason: string;
  /** Simplified explanation (used when Simple Language is on). */
  reasonSimple?: string;
}

export interface CallScenarioTranslation {
  callerName: string;
  dialogue: string;
  /** Reason shown when the user declines/hangs up. */
  declineReason: string;
  declineReasonSimple?: string;
  /** Keyed by the option id (as a string, e.g. "1"). */
  options: Record<string, CallOptionTranslation>;
}

export interface WhatsAppScenarioTranslation {
  /** contact.displayName */
  contactName: string;
  /** Keyed by the opening message id (e.g. "m1"). */
  openingMessages: Record<string, string>;
  /** Reason shown when the user blocks/reports/ignores. */
  declineReason: string;
  declineReasonSimple?: string;
}

export interface ScenarioTranslationMap {
  call: Record<string, CallScenarioTranslation>;
  whatsapp: Record<string, WhatsAppScenarioTranslation>;
}

/** Per-language registry. English is intentionally absent (API is the source). */
export type ScenarioTranslations = Partial<Record<string, ScenarioTranslationMap>>;
