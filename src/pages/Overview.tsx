import { useEffect, useState } from 'react';
import { api, type TestSummary } from '../api';
import { useData } from '../App';
import ScoreChart from '../components/ScoreChart';
import { areaStats, formatDate, MASTER_STREAK, PASS_SCORE, statusOf } from '../stats';

export default function Overview() {
  const { bank, stats } = useData();
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  useEffect(() => {
    api.tests().then(setTests);
  }, []);

  const areas = areaStats(bank, stats);
  const expected = areas.reduce((s, a) => s + a.expectedPoints, 0);
  const maxPts = areas.reduce((s, a) => s + a.maxPoints, 0);
  const counts = { unseen: 0, wrong: 0, known: 0 };
  for (const q of bank.questions) counts[statusOf(stats.get(q.id))]++;
  const total = bank.questions.length;
  const seen = total - counts.unseen;
  const weakest = [...areas].filter((a) => a.total > 0).sort((a, b) => a.pCorrect - b.pCorrect)[0];
  const exams = (tests ?? []).filter((t) => t.kind === 'exam');
  const last = exams[0];
  const ready = expected >= PASS_SCORE;

  return (
    <>
      <div className="page-head">
        <h1>Přehled</h1>
        <div className="head-actions">
          <a className="btn primary" href="#/zkouska">Spustit cvičnou zkoušku</a>
          {counts.wrong > 0 && <a className="btn" href="#/procvicovani/chyby">Procvičit chyby ({counts.wrong})</a>}
        </div>
      </div>

      <section className="kpis">
        <div className="card kpi">
          <div className="kpi-label">Odhad skóre u zkoušky</div>
          <div className={`kpi-value ${ready ? 'good' : 'bad'}`}>
            {Math.round(expected)}<span className="kpi-unit"> / {Math.round(maxPts)} b.</span>
          </div>
          <div className="kpi-sub">{ready ? 'Na hranici 43 bodů dosáhneš' : `K projití chybí ${Math.ceil(PASS_SCORE - expected)} b. (min. ${PASS_SCORE})`}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Viděné otázky</div>
          <div className="kpi-value">{seen}<span className="kpi-unit"> / {total}</span></div>
          <div className="progress"><div style={{ width: `${(seen / total) * 100}%` }} /></div>
          <div className="kpi-sub">{Math.round((seen / total) * 100)} % ministerské sady pro skupinu B</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Umím / v chybovníku</div>
          <div className="kpi-value"><span className="good">{counts.known}</span><span className="kpi-unit"> / </span><span className="bad">{counts.wrong}</span></div>
          <div className="kpi-sub">{counts.wrong ? <a href="#/chybovnik">Otevřít chybovník →</a> : 'Chybovník je prázdný'}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Poslední test</div>
          {last ? (
            <>
              <div className={`kpi-value ${last.score >= (last.pass_score ?? PASS_SCORE) ? 'good' : 'bad'}`}>
                {last.score}<span className="kpi-unit"> / {last.max_score} b.</span>
              </div>
              <div className="kpi-sub"><a href={`#/historie/${last.id}`}>{formatDate(last.started_at)} →</a></div>
            </>
          ) : (
            <div className="kpi-sub">Zatím žádný test</div>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="card">
          <h3>Vývoj skóre</h3>
          {exams.length ? <ScoreChart tests={[...exams].reverse()} /> : <p className="muted">Až uděláš první zkoušku, uvidíš tu graf.</p>}
        </div>
        <div className="card">
          <h3>Okruhy</h3>
          {weakest && weakest.answers > 0 && (
            <p className="callout">Nejslabší okruh: <b>{weakest.name}</b> – <a href={`#/procvicovani/${weakest.key}`}>procvičit</a></p>
          )}
          <div className="area-list">
            {areas.map((a) => (
              <a className="area-row" key={a.key} href={`#/procvicovani/${a.key}`}>
                <div className="area-name">
                  <span>{a.name}</span>
                  <span className="muted">
                    {a.answers ? `${Math.round((a.correctAnswers / a.answers) * 100)} % správně` : 'nezkoušeno'}
                  </span>
                </div>
                <div className="stack" title={`umím ${a.known}, chybovník ${a.wrong}, neviděno ${a.unseen}`}>
                  <div className="s-known" style={{ width: `${(a.known / a.total) * 100}%` }} />
                  <div className="s-wrong" style={{ width: `${(a.wrong / a.total) * 100}%` }} />
                </div>
                <div className="area-counts muted">
                  <span className="good">{a.known}</span> · <span className="bad">{a.wrong}</span> · {a.unseen} z {a.total}
                </div>
              </a>
            ))}
          </div>
          <div className="legend">
            <span><i className="s-known" /> umím</span>
            <span><i className="s-wrong" /> v chybovníku</span>
            <span><i className="s-unseen" /> neviděno</span>
          </div>
        </div>
      </section>
      <p className="footnote muted">
        Odhad skóre počítá s tím, že otázky, které umíš, dáš na 95 %, chyby zhruba na 40–85 % a u neviděných otázek bere tvoji
        úspěšnost v okruhu (nebo 40 %, dokud nemáš aspoň 10 odpovědí). Špatně zodpovězená otázka zůstává v chybovníku, dokud ji
        nedáš {MASTER_STREAK}× po sobě správně.
      </p>
    </>
  );
}
