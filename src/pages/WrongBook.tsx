import { useEffect, useState } from 'react';
import { api, type ExternalWrong } from '../api';
import { useData } from '../App';
import QuestionCard from '../components/QuestionCard';
import SnapshotView from '../components/SnapshotView';
import { formatDate, MASTER_STREAK, statusOf, wrongPriority } from '../stats';

export default function WrongBook() {
  const { bank, stats, areaName } = useData();
  const [area, setArea] = useState('');
  const [external, setExternal] = useState<ExternalWrong[]>([]);
  useEffect(() => {
    api.externalWrong().then(setExternal);
  }, []);

  const wrong = bank.questions
    .filter((q) => statusOf(stats.get(q.id)) === 'wrong' && (!area || q.area === area))
    .sort((a, b) => wrongPriority(b, stats.get(b.id)!) - wrongPriority(a, stats.get(a.id)!));

  return (
    <>
      <div className="page-head">
        <h1>Chybovník</h1>
        <div className="head-actions">
          {wrong.length > 0 && <a className="btn primary" href="#/procvicovani/chyby">Procvičit chybovník</a>}
        </div>
      </div>
      <p className="muted lead">
        Všechny otázky, které jsi měl špatně (v dashboardu i v importovaných testech). Otázka zmizí, až ji {MASTER_STREAK}× po sobě
        zodpovíš správně. Řazeno podle priority: počet chyb a počet bodů.
      </p>
      <div className="filters">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Všechny okruhy</option>
          {bank.areas.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
        </select>
        <span className="muted">{wrong.length} otázek</span>
      </div>
      {wrong.length === 0 && <div className="card center-msg">Žádné otázky v chybovníku 🎉</div>}
      <div className="qlist">
        {wrong.map((q) => {
          const s = stats.get(q.id)!;
          return (
            <QuestionCard key={q.id} question={q} extra={
              <>
                <span className="bad">{s.wrong}× špatně</span>
                <span className="streak" title={`${s.streak} z ${MASTER_STREAK} správně po sobě`}>
                  {Array.from({ length: MASTER_STREAK }, (_, i) => <i key={i} className={i < s.streak ? 'on' : ''} />)}
                </span>
                <span className="muted">{areaName(q.area)}</span>
              </>
            } />
          );
        })}
      </div>

      {external.length > 0 && (
        <>
          <h3 className="section-title">Chyby z otázek mimo ministerskou sadu</h3>
          <p className="muted">
            Vlastní otázky autoškoly, hlavně z připouštěcího testu. V ministerské sadě nejsou, takže se nedají procvičovat.
            Tady si je aspoň můžeš projít.
          </p>
          <div className="qlist">
            {external.map((e, i) => (
              <details className="card qcard" key={i}>
                <summary>
                  <span className="qcard-text">{e.snapshot.text}</span>
                  <span className="qcard-extra muted">{e.title} · {formatDate(e.started_at)}</span>
                </summary>
                <SnapshotView snapshot={e.snapshot} />
              </details>
            ))}
          </div>
        </>
      )}
    </>
  );
}
