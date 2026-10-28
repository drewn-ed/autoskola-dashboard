import type { AnswerRow, Bank, Question } from './api';

/** Kolikrát po sobě musí být otázka zodpovězena správně, aby vypadla z chybovníku */
export const MASTER_STREAK = 3;
export const PASS_SCORE = 43;
export const EXAM_MINUTES = 30;

/** Složení ostré zkoušky skupiny B: počet otázek z každého okruhu (celkem 25 otázek / 50 bodů) */
export const EXAM_LAYOUT: Record<string, number> = {
  pravidla: 10,
  bezpecna: 4,
  znacky: 3,
  situace: 3,
  podminky: 2,
  predpisy: 2,
  zdravoveda: 1,
};

export type Status = 'unseen' | 'wrong' | 'known';

export type QStat = {
  seen: number;
  correct: number;
  wrong: number;
  /** počet správných odpovědí v řadě od poslední chyby */
  streak: number;
  lastAt: string | null;
  lastWrongAt: string | null;
};

export const emptyStat = (): QStat => ({ seen: 0, correct: 0, wrong: 0, streak: 0, lastAt: null, lastWrongAt: null });

export function questionStats(rows: AnswerRow[]): Map<number, QStat> {
  const map = new Map<number, QStat>();
  for (const r of rows) {
    let s = map.get(r.q);
    if (!s) map.set(r.q, (s = emptyStat()));
    s.seen++;
    s.lastAt = r.t;
    if (r.c) {
      s.correct++;
      s.streak++;
    } else {
      s.wrong++;
      s.streak = 0;
      s.lastWrongAt = r.t;
    }
  }
  return map;
}

export function statusOf(s: QStat | undefined): Status {
  if (!s || s.seen === 0) return 'unseen';
  if (s.wrong > 0 && s.streak < MASTER_STREAK) return 'wrong';
  return 'known';
}

/** Priorita v chybovníku: víc chyb, víc bodů a kratší řada správných odpovědí = dřív na řadě */
export function wrongPriority(q: Question, s: QStat) {
  return s.wrong * 2 + q.points - s.streak * 3;
}

export type AreaStat = {
  key: string;
  name: string;
  total: number;
  unseen: number;
  wrong: number;
  known: number;
  answers: number;
  correctAnswers: number;
  /** odhad pravděpodobnosti správné odpovědi na náhodnou otázku z okruhu */
  pCorrect: number;
  /** odhad bodů z tohoto okruhu u zkoušky / maximum */
  expectedPoints: number;
  maxPoints: number;
};

// Odhad pravděpodobnosti správné odpovědi podle stavu otázky.
// Neviděná otázka: když už máš v okruhu dost odpovědí, bereme tvoji úspěšnost, jinak opatrný odhad.
function pQuestion(s: QStat | undefined, areaAccuracy: number | null) {
  const st = statusOf(s);
  if (st === 'known') return 0.95;
  if (st === 'wrong') return Math.min(0.85, 0.4 + 0.15 * (s?.streak ?? 0));
  return areaAccuracy ?? 0.4;
}

export function areaStats(bank: Bank, stats: Map<number, QStat>): AreaStat[] {
  return bank.areas.map((a) => {
    const qs = bank.questions.filter((q) => q.area === a.key);
    let unseen = 0, wrong = 0, known = 0, answers = 0, correctAnswers = 0;
    for (const q of qs) {
      const s = stats.get(q.id);
      const st = statusOf(s);
      if (st === 'unseen') unseen++;
      else if (st === 'wrong') wrong++;
      else known++;
      answers += s?.seen ?? 0;
      correctAnswers += s?.correct ?? 0;
    }
    const areaAccuracy = answers >= 10 ? correctAnswers / answers : null;
    const n = EXAM_LAYOUT[a.key] ?? 0;
    const avgPoints = qs.reduce((sum, q) => sum + q.points, 0) / (qs.length || 1);
    const avgExpected = qs.reduce((sum, q) => sum + q.points * pQuestion(stats.get(q.id), areaAccuracy), 0) / (qs.length || 1);
    const pCorrect = qs.reduce((sum, q) => sum + pQuestion(stats.get(q.id), areaAccuracy), 0) / (qs.length || 1);
    return {
      key: a.key, name: a.name, total: qs.length, unseen, wrong, known, answers, correctAnswers, pCorrect,
      expectedPoints: n * avgExpected,
      maxPoints: n * avgPoints,
    };
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Vygeneruje cvičnou zkoušku se stejným složením okruhů jako ostrá zkouška */
export function generateExam(bank: Bank): Question[] {
  return bank.areas.flatMap((a) => shuffle(bank.questions.filter((q) => q.area === a.key)).slice(0, EXAM_LAYOUT[a.key] ?? 0));
}

/** Výběr otázek do procvičování: nejdřív chyby, pak neviděné, pak zbytek (vše s náhodou) */
export function pickPractice(questions: Question[], stats: Map<number, QStat>, count: number): Question[] {
  const by = (st: Status) => shuffle(questions.filter((q) => statusOf(stats.get(q.id)) === st));
  return [...by('wrong'), ...by('unseen'), ...by('known')].slice(0, count);
}

export function pickWrong(questions: Question[], stats: Map<number, QStat>, count: number): Question[] {
  return questions
    .filter((q) => statusOf(stats.get(q.id)) === 'wrong')
    .sort((a, b) => wrongPriority(b, stats.get(b.id)!) - wrongPriority(a, stats.get(a.id)!))
    .slice(0, count);
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDuration = (s: number | null) =>
  s == null ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min`;

export const LETTERS = ['A', 'B', 'C', 'D'];
