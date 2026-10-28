import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type Question } from '../api';
import { go, useData } from '../App';
import QuestionView from '../components/QuestionView';
import { EXAM_LAYOUT, EXAM_MINUTES, generateExam, PASS_SCORE } from '../stats';

export default function Exam() {
  const { bank, areaName, refresh } = useData();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(EXAM_MINUTES * 60);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<string>('');
  const timeSpent = useRef<Record<number, number>>({});
  const shownAt = useRef(Date.now());

  // Připočte čas strávený na aktuální otázce
  const tick = useCallback(() => {
    if (!questions) return;
    const id = questions[idx].id;
    timeSpent.current[id] = (timeSpent.current[id] ?? 0) + (Date.now() - shownAt.current);
    shownAt.current = Date.now();
  }, [questions, idx]);

  const goTo = useCallback((i: number) => {
    if (!questions || i < 0 || i >= questions.length) return;
    tick();
    setIdx(i);
  }, [questions, tick]);

  const finish = useCallback(async () => {
    if (!questions || saving) return;
    tick();
    setSaving(true);
    const { id } = await api.saveExam({
      started_at: startedAt.current,
      duration_s: Math.round((Date.now() - Date.parse(startedAt.current)) / 1000),
      items: questions.map((q) => ({ question_id: q.id, chosen_answer_id: chosen[q.id] ?? null, time_ms: Math.round(timeSpent.current[q.id] ?? 0) })),
    });
    await refresh();
    go(`/historie/${id}`);
  }, [questions, saving, tick, chosen, refresh]);

  const start = () => {
    setQuestions(generateExam(bank));
    setChosen({});
    setIdx(0);
    setLeft(EXAM_MINUTES * 60);
    startedAt.current = new Date().toISOString();
    timeSpent.current = {};
    shownAt.current = Date.now();
  };

  // Odpočet; po vypršení se test automaticky vyhodnotí
  useEffect(() => {
    if (!questions) return;
    const t = setInterval(() => setLeft(EXAM_MINUTES * 60 - Math.floor((Date.now() - Date.parse(startedAt.current)) / 1000)), 500);
    return () => clearInterval(t);
  }, [questions]);
  useEffect(() => {
    if (questions && left <= 0) finish();
  }, [left, questions, finish]);

  // Klávesy: A/B/C výběr, šipky pohyb, U ukončit (jako na webu ministerstva)
  useEffect(() => {
    if (!questions) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = questions[idx];
      const k = e.key.toLowerCase();
      const li = ['a', 'b', 'c', 'd'].indexOf(k);
      if (li >= 0 && q.answers[li]) setChosen((c) => ({ ...c, [q.id]: q.answers[li].id }));
      else if (k === 'arrowright' || k === 'enter') goTo(idx + 1);
      else if (k === 'arrowleft') goTo(idx - 1);
      else if (k === 'u' && confirm('Ukončit a vyhodnotit test?')) finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions, idx, goTo, finish]);

  // Varování při odchodu ze stránky během testu
  useEffect(() => {
    if (!questions) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [questions]);

  if (!questions) {
    return (
      <>
        <div className="page-head"><h1>Cvičná zkouška</h1></div>
        <div className="card intro">
          <p>Stejný formát jako ostrá zkouška skupiny B: <b>25 otázek</b>, <b>{EXAM_MINUTES} minut</b>, maximálně 50 bodů, k úspěchu je potřeba alespoň <b>{PASS_SCORE} bodů</b>. Otázky se losují z oficiální sady ministerstva.</p>
          <table className="table compact">
            <thead><tr><th>Okruh</th><th className="num">Otázek</th></tr></thead>
            <tbody>
              {Object.entries(EXAM_LAYOUT).map(([k, n]) => <tr key={k}><td>{areaName(k)}</td><td className="num">{n}</td></tr>)}
            </tbody>
          </table>
          <p className="muted">Ovládání: <kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> výběr odpovědi, <kbd>←</kbd> <kbd>→</kbd> pohyb mezi otázkami, <kbd>U</kbd> ukončit a vyhodnotit.</p>
          <button className="btn primary big" onClick={start}>Začít zkoušku</button>
        </div>
      </>
    );
  }

  const q = questions[idx];
  const answered = Object.keys(chosen).length;
  const mm = Math.max(0, Math.floor(left / 60)), ss = Math.max(0, left % 60);

  return (
    <div className="exam">
      <div className="exam-bar card">
        <div className={`timer ${left < 300 ? 'bad' : ''}`}>{mm}:{String(ss).padStart(2, '0')}</div>
        <div className="qnav">
          {questions.map((qq, i) => (
            <button key={qq.id} className={['qnav-btn', i === idx && 'current', chosen[qq.id] && 'done'].filter(Boolean).join(' ')} onClick={() => goTo(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <button className="btn primary" disabled={saving} onClick={() => confirm(answered < questions.length ? `Máš nezodpovězeno ${questions.length - answered} otázek. Opravdu vyhodnotit?` : 'Ukončit a vyhodnotit test?') && finish()}>
          {saving ? 'Ukládám…' : 'Ukončit a vyhodnotit'}
        </button>
      </div>
      <div className="card">
        <div className="muted q-counter">Otázka {idx + 1} z {questions.length}</div>
        <QuestionView question={q} selected={chosen[q.id] ?? null} onSelect={(a) => setChosen((c) => ({ ...c, [q.id]: a }))} />
        <div className="q-actions">
          <button className="btn" disabled={idx === 0} onClick={() => goTo(idx - 1)}>← Předchozí</button>
          {idx < questions.length - 1 ? (
            <button className="btn primary" onClick={() => goTo(idx + 1)}>Další →</button>
          ) : (
            <button className="btn primary" disabled={saving} onClick={() => finish()}>Vyhodnotit</button>
          )}
        </div>
      </div>
    </div>
  );
}
