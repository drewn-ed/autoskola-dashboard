import { useMemo, useState } from 'react';
import { mediaUrl, type Question } from '../api';
import { useData } from '../App';
import QuestionCard from '../components/QuestionCard';
import QuestionView from '../components/QuestionView';
import { statusOf, type Status } from '../stats';

const PAGE = 40;
const STATUS_LABEL: Record<Status, string> = { unseen: 'neviděná', wrong: 'v chybovníku', known: 'umím' };
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Catalog() {
  const { bank, stats } = useData();
  const [area, setArea] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [search, setSearch] = useState('');
  const [gallery, setGallery] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Question | null>(null);

  const filtered = useMemo(() => {
    const s = norm(search.trim());
    return bank.questions.filter((q) =>
      (!area || q.area === area) &&
      (!status || statusOf(stats.get(q.id)) === status) &&
      (!gallery || q.media?.type === 'image') &&
      (!s || norm(q.text).includes(s) || q.answers.some((a) => norm(a.text).includes(s)) || q.code.toLowerCase().includes(s)));
  }, [bank, stats, area, status, search, gallery]);

  const shown = filtered.slice(0, page * PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <div className="page-head"><h1>Otázky</h1></div>
      <div className="filters">
        <input type="search" placeholder="Hledat v otázkách a odpovědích…" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <select value={area} onChange={(e) => reset(setArea)(e.target.value)}>
          <option value="">Všechny okruhy</option>
          {bank.areas.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
        </select>
        <select value={status} onChange={(e) => reset(setStatus)(e.target.value as Status | '')}>
          <option value="">Jakýkoli stav</option>
          <option value="unseen">Neviděné</option>
          <option value="wrong">V chybovníku</option>
          <option value="known">Umím</option>
        </select>
        <div className="segmented">
          <button className={!gallery ? 'on' : ''} onClick={() => reset(setGallery)(false)}>Seznam</button>
          <button className={gallery ? 'on' : ''} onClick={() => { reset(setGallery)(true); if (!area) setArea('znacky'); }}>Galerie obrázků</button>
        </div>
        <span className="muted">{filtered.length} otázek</span>
      </div>

      {gallery ? (
        <div className="gallery">
          {shown.map((q) => {
            const correct = q.answers.find((a) => a.id === q.correct);
            const st = statusOf(stats.get(q.id));
            return (
              <button key={q.id} className={`gallery-item st-${st}`} onClick={() => setDetail(q)}>
                <img src={mediaUrl(q.media!)} alt="" loading="lazy" />
                <span className="gallery-caption">{correct?.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="qlist">
          {shown.map((q) => {
            const st = statusOf(stats.get(q.id));
            return <QuestionCard key={q.id} question={q} extra={<span className={`badge st-${st}`}>{STATUS_LABEL[st]}</span>} />;
          })}
        </div>
      )}
      {shown.length < filtered.length && (
        <div className="center"><button className="btn" onClick={() => setPage((p) => p + 1)}>Načíst další ({filtered.length - shown.length})</button></div>
      )}

      {detail && (
        <div className="modal" onClick={() => setDetail(null)}>
          <div className="card modal-body" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetail(null)} aria-label="Zavřít">×</button>
            <QuestionView question={detail} reveal />
          </div>
        </div>
      )}
    </>
  );
}
