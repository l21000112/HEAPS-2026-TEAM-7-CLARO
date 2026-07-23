import { useMemo } from 'react';
import { useQueries, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getClassroom,
  getClassroomAssignments,
  getStudentResults,
  listClassroomInvites,
  listClassroomStudents,
  listClassrooms,
  setClassroomAssignment,
  type Classroom,
  type ClassroomAssignment,
  type ClassroomInvite,
  type ClassroomStudent,
  type StudentResult,
  type StudentResultsParams,
} from '@/api/classrooms';

export const queryKeys = {
  classrooms: {
    all: ['classrooms'] as const,
    list: (filter?: ClassroomListFilter) =>
      filter ? (['classrooms', 'list', filter] as const) : (['classrooms', 'list'] as const),
    detail: (id: string) => ['classrooms', 'detail', id] as const,
    invites: (classroomId: string) => ['classrooms', 'detail', classroomId, 'invites'] as const,
    students: (classroomId: string) => ['classrooms', 'detail', classroomId, 'students'] as const,
    studentResults: (classroomId: string, studentUid: string, params?: StudentResultsParams) =>
      [
        'classrooms',
        'detail',
        classroomId,
        'students',
        studentUid,
        'results',
        params ?? null,
      ] as const,
    assignment: (classroomId: string) => ['classrooms', 'detail', classroomId, 'assignment'] as const,
    assignments: (classroomId: string) =>
      ['classrooms', 'detail', classroomId, 'assignments'] as const,
  },
  students: {
    all: ['students'] as const,
    list: (filter?: StudentListFilter) =>
      filter ? (['students', 'list', filter] as const) : (['students', 'list'] as const),
    detail: (id: string) => ['students', 'detail', id] as const,
  },
};

export type ClassroomListFilter = {
  teacherUid?: string;
};

export type StudentListFilter = {
  classroomId?: string;
};

export function useClassroomsQuery(
  filter?: ClassroomListFilter,
  options?: Omit<UseQueryOptions<Classroom[], Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Classroom[], Error>({
    queryKey: queryKeys.classrooms.list(filter),
    queryFn: () => listClassrooms(),
    staleTime: 30_000,
    ...options,
  });
}

export function useClassroomQuery(
  classroomId: string | null | undefined,
  options?: Omit<UseQueryOptions<Classroom, Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<Classroom, Error>({
    queryKey: queryKeys.classrooms.detail(classroomId ?? ''),
    queryFn: () => getClassroom(classroomId as string),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    ...options,
  });
}

export function useClassroomStudentsQuery(
  classroomId: string | null | undefined,
  options?: Omit<UseQueryOptions<ClassroomStudent[], Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<ClassroomStudent[], Error>({
    queryKey: queryKeys.classrooms.students(classroomId ?? ''),
    queryFn: () => listClassroomStudents(classroomId as string),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    ...options,
  });
}

export function useClassroomInvitesQuery(
  classroomId: string | null | undefined,
  options?: Omit<UseQueryOptions<ClassroomInvite[], Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<ClassroomInvite[], Error>({
    queryKey: queryKeys.classrooms.invites(classroomId ?? ''),
    queryFn: () => listClassroomInvites(classroomId as string),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    ...options,
  });
}

export function useClassroomAssignmentsQuery(
  classroomId: string | null | undefined,
  options?: Omit<UseQueryOptions<ClassroomAssignment[], Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<ClassroomAssignment[], Error>({
    queryKey: queryKeys.classrooms.assignments(classroomId ?? ''),
    queryFn: () => getClassroomAssignments(classroomId as string),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    ...options,
  });
}

export function useAssignmentsForClassrooms(
  classrooms: Classroom[],
): Record<string, ReturnType<typeof useClassroomAssignmentsQuery>> {
  const queries = useQueries({
    queries: classrooms.map((classroom) => ({
      queryKey: queryKeys.classrooms.assignments(classroom.id),
      queryFn: () => getClassroomAssignments(classroom.id),
      enabled: Boolean(classroom.id),
      staleTime: 30_000,
    })),
  });
  return useMemo(() => {
    const result: Record<string, ReturnType<typeof useClassroomAssignmentsQuery>> = {};
    classrooms.forEach((classroom, index) => {
      result[classroom.id] = queries[index] as ReturnType<typeof useClassroomAssignmentsQuery>;
    });
    return result;
  }, [classrooms, queries]);
}

export function useStudentsQuery(
  filter?: StudentListFilter,
  options?: Omit<UseQueryOptions<ClassroomStudent[], Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const classroomId = filter?.classroomId ?? null;
  return useQuery<ClassroomStudent[], Error>({
    queryKey: classroomId
      ? queryKeys.classrooms.students(classroomId)
      : queryKeys.students.list(),
    queryFn: () => listClassroomStudents(classroomId as string),
    enabled: Boolean(classroomId),
    staleTime: 30_000,
    ...options,
  });
}

export function useStudentQuery(
  args: { classroomId: string | null | undefined; studentUid: string | null | undefined },
  options?: Omit<UseQueryOptions<StudentResult, Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<StudentResult, Error>({
    queryKey: queryKeys.classrooms.studentResults(args.classroomId ?? '', args.studentUid ?? ''),
    queryFn: () => getStudentResults(args.classroomId as string, args.studentUid as string),
    enabled: Boolean(args.classroomId) && Boolean(args.studentUid),
    staleTime: 30_000,
    ...options,
  });
}

export function useStudentResultsQuery(
  args: {
    classroomId: string | null | undefined;
    studentUid: string | null | undefined;
    params?: StudentResultsParams;
  },
  options?: Omit<UseQueryOptions<StudentResult, Error>, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  return useQuery<StudentResult, Error>({
    queryKey: queryKeys.classrooms.studentResults(
      args.classroomId ?? '',
      args.studentUid ?? '',
      args.params,
    ),
    queryFn: () =>
      getStudentResults(args.classroomId as string, args.studentUid as string, args.params),
    enabled: Boolean(args.classroomId) && Boolean(args.studentUid),
    staleTime: 30_000,
    ...options,
  });
}

export function useClassroomInvalidator() {
  const queryClient = useQueryClient();
  return (classroomId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.all });
    if (classroomId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.detail(classroomId) });
    }
  };
}

export function useSetClassroomAssignmentMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    ClassroomAssignment,
    Error,
    { classroomId: string; assignment: Parameters<typeof setClassroomAssignment>[1] }
  >({
    mutationFn: ({ classroomId, assignment }) =>
      setClassroomAssignment(classroomId, assignment),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classrooms.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.classrooms.assignments(variables.classroomId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.classrooms.assignment(variables.classroomId),
      });
    },
  });
}

export function useStudentRosters(
  classrooms: Classroom[],
): Record<string, ClassroomStudent[]> {
  const queries = useQueries({
    queries: classrooms.map((classroom) => ({
      queryKey: queryKeys.classrooms.students(classroom.id),
      queryFn: () => listClassroomStudents(classroom.id),
      enabled: Boolean(classroom.id),
      staleTime: 30_000,
    })),
  });
  return useMemo(() => {
    const result: Record<string, ClassroomStudent[]> = {};
    classrooms.forEach((classroom, index) => {
      result[classroom.id] = queries[index]?.data ?? [];
    });
    return result;
  }, [classrooms, queries]);
}

export function useInvitesForClassrooms(
  classrooms: Classroom[],
): Record<string, ReturnType<typeof useClassroomInvitesQuery>> {
  const queries = useQueries({
    queries: classrooms.map((classroom) => ({
      queryKey: queryKeys.classrooms.invites(classroom.id),
      queryFn: () => listClassroomInvites(classroom.id),
      enabled: Boolean(classroom.id),
      staleTime: 30_000,
    })),
  });
  return useMemo(() => {
    const result: Record<string, ReturnType<typeof useClassroomInvitesQuery>> = {};
    classrooms.forEach((classroom, index) => {
      result[classroom.id] = queries[index] as ReturnType<typeof useClassroomInvitesQuery>;
    });
    return result;
  }, [classrooms, queries]);
}

export function useStudentResultsBatch(
  rosters: Record<string, ClassroomStudent[]>,
  enabled: boolean,
) {
  const pairs = useMemo(() => {
    const out: Array<{ classroomId: string; studentUid: string }> = [];
    for (const [classroomId, students] of Object.entries(rosters)) {
      for (const student of students) {
        out.push({ classroomId, studentUid: student.studentUid });
      }
    }
    return out;
  }, [rosters]);

  return useQueries({
    queries: pairs.map((pair) => ({
      queryKey: queryKeys.classrooms.studentResults(pair.classroomId, pair.studentUid, {
        includeSummary: true,
      }),
      queryFn: () =>
        getStudentResults(pair.classroomId, pair.studentUid, { includeSummary: true }),
      enabled: enabled && Boolean(pair.classroomId) && Boolean(pair.studentUid),
      staleTime: 30_000,
    })),
  });
}
