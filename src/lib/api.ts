export type Media = { file: string; type: 'image' | 'video' };
export type Answer = { id: number; text: string; media: Media | null };
export type Question = {
  id: number;
  code: string;
  area: string;
  points: number;
  text: string;
  note: string | null;
  media: Media | null;
  answers: Answer[];
  correct: number;
  validFrom: string | null;
};
export type Area = { key: string; name: string };
export type Bank = { fetchedAt: string; areas: Area[]; questions: Question[] };

/** Jedna odpověď na ministerskou otázku (q = id otázky, c = 1 správně / 0 špatně) */
export type AnswerRow = { q: number; c: number; t: string; m: string };

export type TestSummary = {
  id: number;
  source: 'dashboard' | 'etesty' | 'pripoustecí';
  kind: string;
  title: string;
  started_at: string;
  duration_s: number | null;
  score: number;
  max_score: number;
  pass_score: number | null;
  correct_count: number;
  total: number;
};

export type Snapshot = {
  code: string | null;
  category: string | null;
  points: number | null;
  text: string;
  image: string | null;
  answers: { text: string; chosen: boolean; correct: boolean }[];
};

export type TestItem = {
  pos: number;
  question_id: number | null;
  chosen_answer_id: number | null;
  is_correct: number;
  time_ms: number | null;
  snapshot: Snapshot | null;
};
export type TestDetail = TestSummary & { items: TestItem[] };

export type ExternalWrong = { test_id: number; started_at: string; title: string; snapshot: Snapshot };

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Chyba ${res.status}`);
  return body as T;
}

const json = (data: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const api = {
  bank: () => req<Bank>('/api/bank'),
  answers: () => req<AnswerRow[]>('/api/answers'),
  answer: (a: { question_id: number; chosen_answer_id: number | null; time_ms: number; mode: 'practice' | 'review' }) =>
    req<{ is_correct: boolean }>('/api/answers', json(a)),
  tests: () => req<TestSummary[]>('/api/tests'),
  test: (id: number) => req<TestDetail>(`/api/tests/${id}`),
  deleteTest: (id: number) => req<{ ok: true }>(`/api/tests/${id}`, { method: 'DELETE' }),
  saveExam: (t: { started_at: string; duration_s: number; items: { question_id: number; chosen_answer_id: number | null; time_ms: number }[] }) =>
    req<{ id: number }>('/api/tests', json(t)),
  externalWrong: () => req<ExternalWrong[]>('/api/external-wrong'),
  importEtesty: (html: string) =>
    req<{ status: 'imported' | 'duplicate'; id?: number; title: string; total?: number; matched?: number }>('/api/import/etesty', json({ html })),
};

export const mediaUrl = (m: Media) => `/media/${m.file}`;
