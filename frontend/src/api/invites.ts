import { api } from '@/api/client';

export type TeacherCodeResponse = { code: string };

export async function getTeacherCode() {
  const { data } = await api.get<TeacherCodeResponse>('/users/teacher-code');
  return data;
}
