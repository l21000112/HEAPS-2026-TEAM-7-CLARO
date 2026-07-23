import { useEffect, useRef, useState } from 'react';
import { listClassroomStudents, getStudentResults } from '@/api/classrooms';

export type ClassroomStats = {
  students: number;
  avgSuccessRate: number | null; // null = no attempts yet
};

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ClassroomStats };

export function useClassroomStats(classroomId: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  const reqId = useRef(0);

  useEffect(() => {
    const current = ++reqId.current;
    setState({ status: 'loading' });

    (async () => {
      try {
        const students = await listClassroomStudents(classroomId);
        const results = await Promise.all(
          students.map((s) =>
            getStudentResults(classroomId, s.studentUid, { includeSummary: true }),
          ),
        );

        let attempts = 0;
        let correct = 0;
        for (const r of results) {
          if (r.summary) {
            attempts += r.summary.totalAttempts;
            correct += r.summary.correctAttempts;
          }
        }

        if (current !== reqId.current) return;
        setState({
          status: 'ready',
          data: {
            students: students.length,
            avgSuccessRate: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
          },
        });
      } catch {
        if (current !== reqId.current) return;
        setState({ status: 'error' });
      }
    })();

    return () => { reqId.current += 1; };
  }, [classroomId]);

  return state;
}