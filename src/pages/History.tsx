import { useEffect, useState } from 'react';
import { api, type TestSummary } from '../api';
import { formatDate, formatDuration, PASS_SCORE } from '../stats';

export const SOURCE_LABEL: Record<string, string> = { dashboard: 'Dashboard', etesty: 'eTesty', 'pripoustecí': 'Připouštěcí' };

export default function History() {
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  useEffect(() => {
    api.tests().then(setTests);
  }, []);
  if (!tests) return <div className="center-msg">Načítám…</div>;

  const passed = tests.filter((t) => t.score >= (t.pass_score ?? PASS_SCORE)).length;
  return (
    <>
      <div className="page-head">
        <h1>Historie testů</h1>
        <div className="head-actions"><a className="btn" href="#/import">Importovat z eTestů</a></div>
      </div>
      {tests.length === 0 ? (
        <div className="card center-msg">Zatím žádné testy. <a href="#/zkouska">Spustit cvičnou zkoušku →</a></div>
      ) : (
        <>
          <p className="muted lead">{tests.length} testů, splněno {passed} ({Math.round((passed / tests.length) * 100)} %)</p>
          <div className="card table-card">
            <table className="table clickable">
              <thead>
                <tr><th>Datum</th><th>Zdroj</th><th>Test</th><th className="num">Body</th><th>Výsledek</th><th className="num">Správně</th><th className="num">Čas</th></tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const ok = t.score >= (t.pass_score ?? PASS_SCORE);
                  return (
                    <tr key={t.id} onClick={() => (location.hash = `/historie/${t.id}`)}>
                      <td>{formatDate(t.started_at)}</td>
                      <td><span className={`badge src-${t.source}`}>{SOURCE_LABEL[t.source]}</span></td>
                      <td>{t.title}</td>
                      <td className="num"><b>{t.score}</b> / {t.max_score}</td>
                      <td><span className={`badge ${ok ? 'pass' : 'fail'}`}>{ok ? 'SPLNĚNO' : 'NESPLNĚNO'}</span></td>
                      <td className="num">{t.correct_count} / {t.total}</td>
                      <td className="num">{formatDuration(t.duration_s)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
