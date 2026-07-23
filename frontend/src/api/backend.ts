import { api, ApiError, getApiErrorMessage } from '@/api/client';
import { AiTurnResponse, WhatsAppSession, WhatsAppEvaluation } from '@/features/scam-whatsapp/models';
import type { AssignmentLaunchInput } from '@/api/scam-call';
import { setAnonymousSessionToken } from '@/api/anonymousSessionToken';
import { getAnonymousId } from '@/api/attempts';

export const startBackendSession = async (input?: AssignmentLaunchInput): Promise<WhatsAppSession> => {
  try {
    // API-M4: attach the client anonymousId for anonymous session attribution.
    const anonymousId = input?.anonymousId ?? (await getAnonymousId());
    const response = await api.post<WhatsAppSession>('/sessions/whatsapp/start', { ...input, anonymousId });
    if (response.data.accessToken) {
      await setAnonymousSessionToken(response.data.accessToken);
    }
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(getApiErrorMessage(error, 'Could not connect to the simulation server.'));
  }
};

export const getBackendSession = async (sessionId: string): Promise<WhatsAppSession> => {
  try {
    const response = await api.get<WhatsAppSession>(`/sessions/whatsapp/${sessionId}`);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(getApiErrorMessage(error, 'Could not load the simulation session.'));
  }
};

export const backendSendMessage = async (
  sessionId: string,
  text: string,
): Promise<AiTurnResponse> => {
  try {
    const response = await api.post<AiTurnResponse>(`/sessions/whatsapp/${sessionId}/message`, {
      text
    });
    
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(getApiErrorMessage(error, 'Connection error while communicating with AI.'));
  }
};

export const backendPerformAction = async (
  sessionId: string,
  action: 'block' | 'report' | 'ignore'
): Promise<{ evaluation: WhatsAppEvaluation }> => {
  try {
    const response = await api.post<{ evaluation: WhatsAppEvaluation }>(`/sessions/whatsapp/${sessionId}/action`, {
      action,
    });
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(getApiErrorMessage(error, 'Could not process the action.'));
  }
};
