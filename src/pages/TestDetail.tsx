import { useEffect, useState } from 'react';
import { api, type TestDetail } from '../api';
import { go, useData } from '../App';
import QuestionView from '../components/QuestionView';
import SnapshotView from '../components/SnapshotView';
import { formatDate, formatDuration, PASS_SCORE } from '../stats';
import { SOURCE_LABEL } from './History';

export default function TestDetailPage({ id }: { id: number }) {
  const { byId, bank, refresh } = useData();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  useEffect(() => {
    api.test(id).then(setTest, (e) => setError(e.message));
  }, [id]);

  if (error) return <div className="center-msg">{error}</div>;
  if (!test) return <div className="center-msg">Načítám…</div>;

  const ok = test.score >= (test.pass_score ?? PASS_SCORE);
  const wrongCount = test.items.filter((i) => !i.is_correct).length;

  // Úspěšnost po okruzích (jen u otázek z ministerské sady)
  const byArea = new Map<string, { ok: number; total: number }>();
  for (const it of test.items) {
    const q = it.question_id != null ? byId.get(it.question_id) : null;
    const key = q?.area ?? it.snapshot?.category ?? 'Ostatní';
    const a = byArea.get(key) ?? { ok: 0, total: 0 };
    a.total++;
    if (it.is_correct) a.ok++;
    byArea.set(key, a);
  }
  const areaLabel = (k: string) => bank.areas.find((a) => a.key === k)?.name ?? k;

  const remove = async () => {
    if (!confirm('Smazat tento test z historie? Smažou se i jeho odpovědi ze statistik.')) return;
    await api.deleteTest(test.id);
    await refresh();
    go('/historie');
  };

  const items = onlyWrong ? test.items.filter((i) => !i.is_correct) : test.items;

  return (
    <>
      <div className="page-head">
        <div>
          <a href="#/historie" className="muted">← Historie</a>
          <h1>{test.title}</h1>
          <div className="muted">{formatDate(test.started_at)} · <span className={`badge src-${test.source}`}>{SOURCE_LABEL[test.source]}</span></div>
        </div>
        <div className="head-actions">
          {test.source === 'dashboard' && <a className="btn primary" href="#/zkouska">Nová zkouška</a>}
          {wrongCount > 0 && <a className="btn" href="#/procvicovani/chyby">Procvičit chyby</a>}
        </div>
      </div>

      <section className="kpis">
        <div className="card kpi">
          <div className="kpi-label">Výsledek</div>
          <div className={`kpi-value ${ok ? 'good' : 'bad'}`}>{ok ? 'SPLNĚNO' : 'NESPLNĚNO'}</div>
          <div className="kpi-sub">potřeba alespoň {test.pass_score ?? PASS_SCORE} bodů</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Body</div>
          <div className="kpi-value">{test.score}<span className="kpi-unit"> / {test.max_score}</span></div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Správně</div>
          <div className="kpi-value">{test.correct_count}<span className="kpi-unit"> / {test.total}</span></div>
          <div className="kpi-sub bad">{wrongCount} chyb</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Čas</div>
          <div className="kpi-value">{formatDuration(test.duration_s)}</div>
        </div>
      </section>

      <div className="card">
        <h3>Podle okruhů</h3>
        <div className="area-list">
          {[...byArea].map(([k, a]) => (
            <div className="area-row static" key={k}>
              <div className="area-name"><span>{areaLabel(k)}</span><span className="muted">{a.ok} / {a.total}</span></div>
              <div className="stack">
                <div className="s-known" style={{ width: `${(a.ok / a.total) * 100}%` }} />
                <div className="s-wrong" style={{ width: `${((a.total - a.ok) / a.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="filters">
        <h3 className="section-title flush">Otázky</h3>
        <div className="segmented">
          <button className={!onlyWrong ? 'on' : ''} onClick={() => setOnlyWrong(false)}>Všechny ({test.items.length})</button>
          <button className={onlyWrong ? 'on' : ''} onClick={() => setOnlyWrong(true)}>Jen chyby ({wrongCount})</button>
        </div>
      </div>
      <div className="qlist">
        {items.map((it) => {
          const q = it.question_id != null ? byId.get(it.question_id) : null;
          return (
            <div key={it.pos} className={`card result-item ${it.is_correct ? 'ok' : 'ko'}`}>
              <div className="result-head">
                <span className="result-pos">{it.pos}.</span>
                <span className={it.is_correct ? 'good' : 'bad'}>{it.is_correct ? '✓ správně' : it.chosen_answer_id == null && q ? '✗ bez odpovědi' : '✗ špatně'}</span>
                {it.time_ms != null && <span className="muted">{Math.round(it.time_ms / 1000)} s</span>}
              </div>
              {q ? <QuestionView question={q} selected={it.chosen_answer_id} reveal /> : it.snapshot && <SnapshotView snapshot={it.snapshot} />}
            </div>
          );
        })}
      </div>
      <div className="center"><button className="btn danger-link" onClick={remove}>Smazat test z historie</button></div>
    </>
  );
}
