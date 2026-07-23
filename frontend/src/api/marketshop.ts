import { api, normalizeApiError } from '@/api/client';

export interface PublicMarketplaceProduct {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  sellerName: string;
  isOfficialSeller: boolean;
  soldCount?: number;
  rating?: number;
  reviewCount?: number;
  reviews?: string[];
  // Backend includes per-product feedback via sanitizePublicProducts.
  reason?: string;
}

export interface MarketplaceScenario {
  id: string | number;
  // Answer-key fields (isScam, declineReason...) are optional: public endpoints strip them via sanitizeScenarioForClient.
  isScam?: boolean;
  taskDescription: string;
  targetProductId: string;
  declineReason?: string;
  declineReasonSimple?: string;
  correctReason?: string;
  correctReasonSimple?: string;
  products: PublicMarketplaceProduct[];
}

/** Pick full or simple result copy based on the accessibility preference. */
export function marketplaceResultReason(
  scenario: MarketplaceScenario,
  isCorrect: boolean,
  simpleLanguage: boolean,
): string {
  if (isCorrect) {
    if (simpleLanguage && scenario.correctReasonSimple?.trim()) {
      return scenario.correctReasonSimple.trim();
    }
    return scenario.correctReason || scenario.declineReason || '';
  }
  if (simpleLanguage && scenario.declineReasonSimple?.trim()) {
    return scenario.declineReasonSimple.trim();
  }
  return scenario.declineReason || '';
}

export type Product = PublicMarketplaceProduct;

export async function listMarketplaceScenarios(lang?: string): Promise<MarketplaceScenario[]> {
  try {
    const { data } = await api.get<MarketplaceScenario[]>('/scenarios/marketplace', {
      params: lang ? { lang } : undefined,
    });
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not load marketplace scenarios.');
  }
}

export async function getMarketplaceScenario(lang?: string): Promise<MarketplaceScenario> {
  try {
    const { data } = await api.get<MarketplaceScenario>('/scenarios/marketplace/random', {
      params: lang ? { lang } : undefined,
    });
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not load a marketplace scenario.');
  }
}

export async function getMarketplaceScenarioById(
  id: string,
  lang?: string,
): Promise<MarketplaceScenario> {
  try {
    const { data } = await api.get<MarketplaceScenario>(`/scenarios/marketplace/${id}`, {
      params: lang ? { lang } : undefined,
    });
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not load the marketplace scenario.');
  }
}