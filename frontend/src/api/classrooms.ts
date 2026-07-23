import { api } from '@/api/client';

export type Classroom = {
  id: string;
  name: string;
  description?: string;
  teacherUid: string;
  teacherEmail?: string;
  teacherDisplayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassroomStudent = {
  studentUid: string; // canonical key is studentUid
  email?: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentResult = {
  classroomId: string;
  student: { uid: string; email?: string; displayName?: string };
  attempts: Array<{
    id: string;
    scenarioType: string;
    scenarioId: string;
    selectedOptionId?: string;
    isCorrect: boolean;
    reason: string;
    durationSeconds?: number;
    createdAt: string;
  }>;
  summary?: {
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    byScenarioType: Record<string, { total: number; correct: number; accuracy: number }>;
    truncated?: boolean;
  };
  page: { limit: number; nextPageToken: string | null; hasMore: boolean };
};

export async function createClassroom(input: { name: string; description?: string }) {
  const { data } = await api.post<Classroom>('/classrooms', input);
  return data;
}

export async function listClassrooms() {
  const { data } = await api.get<Classroom[]>('/classrooms');
  return data;
}

export async function getClassroom(classroomId: string) {
  const { data } = await api.get<Classroom>(`/classrooms/${classroomId}`);
  return data;
}

export async function updateClassroom(classroomId: string, input: { name?: string; description?: string }) {
  const { data } = await api.patch<Classroom>(`/classrooms/${classroomId}`, input);
  return data;
}

export async function addStudentToClassroom(classroomId: string, studentUid: string, extra?: { email?: string; displayName?: string }) {
  const { data } = await api.post<ClassroomStudent>(`/classrooms/${classroomId}/students`, { studentUid, ...extra });
  return data;
}

export async function listClassroomStudents(classroomId: string) {
  const { data } = await api.get<ClassroomStudent[]>(`/classrooms/${classroomId}/students`);
  return data;
}

export type ClassroomInvite = {
  // Create returns code/displayCode (no id); list returns id (no code/displayCode).
  id?: string;
  code?: string;
  displayCode?: string;
  type: string;
  classroomId: string;
  classroomName?: string;
  status: string;
  expiresAt?: string;
  maxUses: number;
  useCount?: number; // list endpoint strips this; only create returns it
  createdAt: string;
};

export async function listClassroomInvites(classroomId: string) {
  const { data } = await api.get<ClassroomInvite[]>(`/classrooms/${classroomId}/invites`);
  return data;
}

export async function createClassroomInvite(classroomId: string, options?: { maxUses?: number; ttlHours?: number }) {
  const { data } = await api.post<ClassroomInvite>(`/classrooms/${classroomId}/invites`, options || {});
  return data;
}

export type AssignmentScenario = {
  itemId: string;
  id: string;
  scenarioId?: string;
  type: string;
  title: string;
  quantity: number;
  maxAttempts: number | null;
  progress?: {
    attempts: number;
    completed: number;
    remaining: number;
    complete: boolean;
    maxAttemptsReached: boolean;
  };
};

export type ClassroomAssignment = {
  id: string;
  classroomId?: string;
  scenarios: AssignmentScenario[];
  deadline: string | null;
  assignedAt: string;
  expired?: boolean;
};

export async function setClassroomAssignment(
  classroomId: string,
  assignment: { scenarios: Array<{ id: string; scenarioId?: string; type: string; title: string; quantity: number; maxAttempts?: number | null }>; deadline?: string }
) {
  const { data } = await api.put<ClassroomAssignment>(`/classrooms/${classroomId}/assignment`, assignment);
  return data;
}

export async function getClassroomAssignment(classroomId: string) {
  const { data } = await api.get<ClassroomAssignment | null>(`/classrooms/${classroomId}/assignment`);
  return data;
}

export async function getClassroomAssignments(classroomId: string) {
  const { data } = await api.get<ClassroomAssignment[]>(`/classrooms/${classroomId}/assignments`);
  return data;
}

export type StudentResultsParams = {
  scenarioType?: string;
  from?: string;
  to?: string;
  limit?: number;
  pageToken?: string;
  includeSummary?: boolean;
};

export async function getStudentResults(classroomId: string, studentUid: string, params?: StudentResultsParams) {
  const { data } = await api.get<StudentResult>(`/classrooms/${classroomId}/students/${studentUid}/results`, { params: params as any });
  return data;
}
