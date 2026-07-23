import { api } from '@/api/client';
import type { ScenarioType } from '@/api/scenarioTypes';

// Re-export ScenarioType from the single source of truth.
export type { ScenarioType };

export type ScenarioOption = {
  id: string | number;
  text: string;
};

export type PublicCallScenario = {
  id: string | number;
  callerName: string;
  dialogue: string;
  options: ScenarioOption[];
};

export type PublicWhatsAppScenario = {
  id: string | number;
  contact: { displayName: string; phoneNumber?: string };
  openingMessages: Array<{ id: string | number; direction: string; body: string }>;
};

export type PublicMarketplaceProduct = {
  id: string | number;
  name: string;
  price: number;
  description: string;
  imageUrl?: string;
  sellerName: string;
  isOfficialSeller?: boolean;
};

export type PublicMarketplaceScenario = {
  id: string | number;
  taskDescription: string;
  targetProductId: string | number;
  products: PublicMarketplaceProduct[];
};

export type PublicScenario =
  | PublicCallScenario
  | PublicWhatsAppScenario
  | PublicMarketplaceScenario;

export type OwnerScenario = {
  id: string;
  scenarioId: string;
  type: ScenarioType;
  status: 'draft' | 'published' | 'archived';
  source: string;
  title: string;
  description?: string;
  tags: string[];
  ownerUid?: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type ScenarioCreateInput = {
  type: ScenarioType;
  title?: string;
  description?: string;
  content: any; // Type-specific content object
  tags?: string[];
};

export type BulkCreateResult = {
  created: number;
  failed: number;
  results: Array<{ index: number; status: 'ok' | 'error'; id?: string; message?: string }>;
};

export async function listCallScenarios() {
  const { data } = await api.get<PublicCallScenario[]>('/scenarios', {
    params: { limit: 200 },
  });
  return data;
}

export async function listWhatsAppScenarios() {
  const { data } = await api.get<PublicWhatsAppScenario[]>('/scenarios/whatsapp');
  return data;
}

// Marketplace functions re-exported from marketshop.ts (single source of truth).
export { listMarketplaceScenarios, getMarketplaceScenarioById } from '@/api/marketshop';

export async function pickRandomCallScenario() {
  const { data } = await api.get<PublicCallScenario>('/scenarios/random');
  return data;
}

export async function pickRandomWhatsAppScenario() {
  const { data } = await api.get<PublicWhatsAppScenario>('/scenarios/whatsapp/random');
  return data;
}

export async function pickRandomMarketplaceScenario() {
  const { data } = await api.get<PublicMarketplaceScenario>('/scenarios/marketplace/random');
  return data;
}

export async function createScenario(input: ScenarioCreateInput) {
  const { data } = await api.post<OwnerScenario>('/scenarios', input);
  return data;
}

export async function createMarketplaceScenario(
  input: Omit<ScenarioCreateInput, 'type'> & { type?: 'marketplace' },
) {
  const { data } = await api.post<OwnerScenario>('/scenarios/marketplace', {
    ...input,
    type: 'marketplace',
  });
  return data;
}

export async function bulkCreateScenarios(scenarios: ScenarioCreateInput[]) {
  const { data } = await api.post<BulkCreateResult>('/scenarios/bulk', { scenarios });
  return data;
}

export async function updateScenario(scenarioId: string, input: Partial<ScenarioCreateInput>) {
  const { data } = await api.patch<OwnerScenario>(`/scenarios/${scenarioId}`, input);
  return data;
}

export async function deleteScenario(scenarioId: string) {
  await api.delete(`/scenarios/${scenarioId}`);
}
