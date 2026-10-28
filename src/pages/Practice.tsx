import { useEffect, useRef, useState } from 'react';
import { api, type Question } from '../api';
import { useData } from '../App';
import QuestionView from '../components/QuestionView';
import { areaStats, MASTER_STREAK, pickPractice, pickWrong, shuffle, statusOf } from '../stats';

const SESSION = 20;

export default function Practice({ mode }: { mode?: string }) {
  return mode ? <Session mode={mode} /> : <Menu />;
}

function Menu() {
  const { bank, stats } = useData();
  const areas = areaStats(bank, stats);
  const wrong = bank.questions.filter((q) => statusOf(stats.get(q.id)) === 'wrong').length;
  const unseen = bank.questions.filter((q) => statusOf(stats.get(q.id)) === 'unseen').length;
  return (
    <>
      <div className="page-head"><h1>Procvičování</h1></div>
      <p className="muted lead">Po každé odpovědi hned uvidíš, jestli byla správně. Kolo má {SESSION} otázek. Nejdřív přicházejí na řadu otázky z chybovníku, pak neviděné.</p>
      <div className="tiles">
        <a className="tile accent-bad" href="#/procvicovani/chyby">
          <div className="tile-title">Chybovník</div>
          <div className="tile-num">{wrong}</div>
          <div className="muted">otázek ke zopakování</div>
        </a>
        <a className="tile" href="#/procvicovani/nove">
          <div className="tile-title">Neviděné otázky</div>
          <div className="tile-num">{unseen}</div>
          <div className="muted">ještě jsi je neviděl</div>
        </a>
        <a className="tile" href="#/procvicovani/vse">
          <div className="tile-title">Mix ze všech okruhů</div>
          <div className="tile-num">{bank.questions.length}</div>
          <div className="muted">otázek celkem</div>
        </a>
      </div>
      <h3 className="section-title">Podle okruhu</h3>
      <div className="tiles">
        {areas.map((a) => (
          <a className="tile" key={a.key} href={`#/procvicovani/${a.key}`}>
            <div className="tile-title">{a.name}</div>
            <div className="stack small">
              <div className="s-known" style={{ width: `${(a.known / a.total) * 100}%` }} />
              <div className="s-wrong" style={{ width: `${(a.wrong / a.total) * 100}%` }} />
            </div>
            <div className="muted">
              {a.total} otázek · <span className="good">{a.known} umím</span> · <span className="bad">{a.wrong} chyb</span> · {a.unseen} neviděno
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

function Session({ mode }: { mode: string }) {
  const { bank, stats, areaName, refresh } = useData();
  const isReview = mode === 'chyby';
  const title = isReview ? 'Chybovník' : mode === 'nove' ? 'Neviděné otázky' : mode === 'vse' ? 'Mix ze všech okruhů' : areaName(mode);

  // Sada otázek se vybere jednou při startu kola
  const [questions, setQuestions] = useState<Question[]>(() => pick());
  function pick() {
    if (isReview) return pickWrong(bank.questions, stats, SESSION);
    if (mode === 'nove') return shuffle(bank.questions.filter((q) => statusOf(stats.get(q.id)) === 'unseen')).slice(0, SESSION);
    if (mode === 'vse') return pickPractice(bank.questions, stats, SESSION);
    return pickPractice(bank.questions.filter((q) => q.area === mode), stats, SESSION);
  }

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  // řada správných odpovědí po této odpovědi (stats se z serveru obnovují asynchronně)
  const [streakAfter, setStreakAfter] = useState(0);
  const shownAt = useRef(Date.now());
  const q = questions[idx];
  const done = idx >= questions.length;

  const answer = (answerId: number) => {
    if (selected != null || !q) return;
    setSelected(answerId);
    setStreakAfter(answerId === q.correct ? (stats.get(q.id)?.streak ?? 0) + 1 : 0);
    setResults((r) => [...r, answerId === q.correct]);
    api.answer({ question_id: q.id, chosen_answer_id: answerId, time_ms: Date.now() - shownAt.current, mode: isReview ? 'review' : 'practice' })
      .then(refresh);
  };
  const next = () => {
    if (selected == null) return;
    setSelected(null);
    setIdx((i) => i + 1);
    shownAt.current = Date.now();
  };
  const restart = () => {
    setQuestions(pick());
    setIdx(0);
    setSelected(null);
    setResults([]);
    shownAt.current = Date.now();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !q) return;
      const k = e.key.toLowerCase();
      const li = ['a', 'b', 'c', 'd'].indexOf(k);
      if (li >= 0 && q.answers[li]) answer(q.answers[li].id);
      else if (k === 'enter' || k === 'arrowright') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!questions.length) {
    return (
      <>
        <div className="page-head"><h1>{title}</h1></div>
        <div className="card center-msg">
          {isReview ? 'Chybovník je prázdný. Paráda! 🎉' : 'Tady už nic nezbývá.'}
          <div><a className="btn" href="#/procvicovani">Zpět na procvičování</a></div>
        </div>
      </>
    );
  }

  if (done) {
    const ok = results.filter(Boolean).length;
    return (
      <>
        <div className="page-head"><h1>{title}</h1></div>
        <div className="card center-msg">
          <div className="big-result">{ok} / {results.length}</div>
          <p>správně v tomhle kole</p>
          <div className="head-actions">
            <button className="btn primary" onClick={restart}>Další kolo</button>
            <a className="btn" href="#/procvicovani">Zpět na procvičování</a>
          </div>
        </div>
      </>
    );
  }

  const s = stats.get(q.id);
  const isCorrect = selected === q.correct;
  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        <div className="session-progress">
          {questions.map((_, i) => (
            <span key={i} className={i < results.length ? (results[i] ? 'pip good-bg' : 'pip bad-bg') : i === idx ? 'pip current' : 'pip'} />
          ))}
        </div>
      </div>
      <div className="card">
        <div className="muted q-counter">
          Otázka {idx + 1} z {questions.length}
          {s && s.seen > 0 && <> · dosud {s.correct}× správně, {s.wrong}× špatně</>}
        </div>
        <QuestionView question={q} selected={selected} onSelect={answer} reveal={selected != null} />
        {selected != null && (
          <div className={`feedback ${isCorrect ? 'good' : 'bad'}`}>
            <b>{isCorrect ? 'Správně!' : 'Špatně.'}</b>{' '}
            {isReview && isCorrect && (streakAfter >= MASTER_STREAK
              ? 'Otázka vypadla z chybovníku.'
              : `Ještě ${MASTER_STREAK - streakAfter}× správně a vypadne z chybovníku.`)}
            {!isCorrect && (isReview ? 'Zůstává v chybovníku, řada správných odpovědí začíná znovu.' : 'Otázka se přidala do chybovníku.')}
          </div>
        )}
        <div className="q-actions">
          <span className="muted">Klávesy: A / B / C, Enter = další</span>
          <button className="btn primary" disabled={selected == null} onClick={next}>
            {idx === questions.length - 1 ? 'Dokončit kolo' : 'Další →'}
          </button>
        </div>
      </div>
    </>
  );
}
