import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/api/client';
import type { ScenarioType } from '@/api/scenarioTypes';

export type { ScenarioType };

const ANONYMOUS_ID_KEY = 'heaps.anonymousId';

export type AttemptInput = {
  scenarioType: ScenarioType;
  scenarioId: string | number;
  sessionId?: string;
  selectedOptionId?: string | number;
  isCorrect: boolean;
  reason: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
};

/** Shape returned by POST /api/attempts. */
export type AttemptResponse = {
  id: string;
  owner: { uid?: string | null; anonymousId?: string | null };
  scenarioType: ScenarioType;
  scenarioId: string;
  selectedOptionId?: string;
  isCorrect: boolean;
  reason: string;
  durationSeconds?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export async function getAnonymousId() {
  const existing = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) {
    return existing;
  }

  const id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, id);
  return id;
}

export async function logAttempt(input: AttemptInput) {
  const anonymousId = await getAnonymousId();
  const { data } = await api.post<AttemptResponse>('/attempts', {
    anonymousId,
    ...input,
    scenarioId: String(input.scenarioId),
    selectedOptionId:
      input.selectedOptionId === undefined
        ? undefined
        : String(input.selectedOptionId),
  });
  return data;
}

export type AttemptSummary = {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  byScenarioType: Record<string, { total: number; correct: number; accuracy: number }>;
};

export async function getAttemptSummary() {
  const anonymousId = await getAnonymousId();
  const { data } = await api.get<AttemptSummary>('/attempts/summary', {
    params: { anonymousId },
  });
  return data;
}
