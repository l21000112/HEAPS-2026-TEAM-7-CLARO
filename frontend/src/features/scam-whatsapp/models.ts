export interface WhatsAppMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  timestamp?: string;
}

export interface WhatsAppContact {
  displayName: string;
  phoneNumber?: string;
}

export interface WhatsAppScenario {
  id: string | number;
  contact: WhatsAppContact;
  openingMessages: WhatsAppMessage[];
}

export interface AssignmentSessionContext {
  assignmentId: string;
  assignmentItemId: string;
  classroomId: string;
  assignedAt?: string;
  deadline?: string | null;
}

export interface WhatsAppSession {
  sessionId: string;
  scenario: WhatsAppScenario;
  messages: WhatsAppMessage[];
  assignment?: AssignmentSessionContext | null;
  /** Backend serializeSession fields (added for type completeness). */
  completed?: boolean;
  phase?: string;
  /** H2: Per-session ownership token for anonymous (unauthenticated) sessions. */
  accessToken?: string;
}

export interface WhatsAppEvaluation {
  vulnerabilityScore?: number | null;
  completed: boolean;
  isCorrect: boolean | null;
  reason: string | null;
  redFlags?: string[]; // B11: Red Flags checklist shown to students on the result screen
}

export interface WhatsAppResult {
  contactName: string;
  isCorrect: boolean;
  reason: string;
  redFlags?: string[]; // B11: Red Flags checklist shown to students
}

export interface AiTurnResponse {
  aiMessage: WhatsAppMessage;
  evaluation: WhatsAppEvaluation;
  provider?: {
    name: 'gemini' | 'rule_based';
    fallbackUsed: boolean;
  };
}
