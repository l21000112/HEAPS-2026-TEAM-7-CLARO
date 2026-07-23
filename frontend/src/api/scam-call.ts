import { CallEvaluation, CallSession } from '../features/scam-call/models';
import { api, normalizeApiError } from '@/api/client';
import { setAnonymousSessionToken } from '@/api/anonymousSessionToken';
import { getAnonymousId } from '@/api/attempts';

export type AssignmentLaunchInput = {
  classroomId?: string;
  assignmentId?: string;
  assignmentItemId?: string;
  /** When true, WhatsApp Gemini writes result reasons in simpler language. */
  simpleLanguage?: boolean;
  /** Active app language code (en/zh/ms/ta). Drives WhatsApp AI reply language. */
  language?: string;
  anonymousId?: string;
};

export const startCallSession = async (input?: AssignmentLaunchInput): Promise<CallSession> => {
  try {
    const anonymousId = input?.anonymousId ?? (await getAnonymousId());
    const { data } = await api.post<CallSession>('/sessions/call/start', { ...input, anonymousId });
    if (data.accessToken) {
      await setAnonymousSessionToken(data.accessToken);
    }
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not start call session.');
  }
};

export const getCallSession = async (sessionId: string): Promise<CallSession> => {
  try {
    const { data } = await api.get<CallSession>(`/sessions/call/${sessionId}`);
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not load call session.');
  }
};

export const submitCallAnswer = async (
  sessionId: string,
  selectedOptionId: string | number,
): Promise<{ evaluation: CallEvaluation }> => {
  try {
    const { data } = await api.post<{ evaluation: CallEvaluation }>(
      `/sessions/call/${sessionId}/answer`,
      { selectedOptionId },
    );
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not submit answer.');
  }
};

export const performCallAction = async (
  sessionId: string,
  action: 'decline' | 'hangup',
): Promise<{ evaluation: CallEvaluation }> => {
  try {
    const { data } = await api.post<{ evaluation: CallEvaluation }>(
      `/sessions/call/${sessionId}/action`,
      { action },
    );
    return data;
  } catch (error) {
    return normalizeApiError(error, 'Could not process call action.');
  }
};
