export interface CallResult {
  callerName: string;
  scenarioId?: string;
  sessionId?: string;
  selectedOptionId?: string;
  durationSeconds?: number;
  isCorrect: boolean;
  reason: string;
}

export interface DialogueOption {
  id: string | number;
  text: string;
}

export interface CallScenario {
  id: string | number;
  callerName: string;
  dialogue: string;
  options: DialogueOption[];
}

export interface AssignmentSessionContext {
  assignmentId: string;
  assignmentItemId: string;
  classroomId: string;
  assignedAt?: string;
  deadline?: string | null;
}

export interface CallSession {
  sessionId: string;
  scenario: CallScenario;
  assignment?: AssignmentSessionContext | null;
  /** Backend serializeSession fields (added for type completeness). */
  completed?: boolean;
  phase?: string;
  /** H2: Per-session ownership token for anonymous (unauthenticated) sessions. */
  accessToken?: string;
}

export interface CallEvaluation {
  completed: boolean;
  isCorrect: boolean;
  reason: string;
  selectedOptionId?: string;
}
