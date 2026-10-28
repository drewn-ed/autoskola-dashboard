import { useSyncExternalStore } from 'react';

/** Rozpracovaná cvičná zkouška. Žije mimo komponentu, takže přežije přechod na jinou stránku. */
export type ExamSession = {
  questionIds: number[];
  chosen: Record<number, number>;
  idx: number;
  startedAt: string;
  timeSpent: Record<number, number>;
};

let current: ExamSession | null = null;
const listeners = new Set<() => void>();

export const examSession = {
  get: () => current,
  set(next: ExamSession | null) {
    current = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const useExamRunning = () => useSyncExternalStore(examSession.subscribe, () => current != null);
