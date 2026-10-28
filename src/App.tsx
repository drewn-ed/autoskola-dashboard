import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type AnswerRow, type Bank, type Question } from './api';
import { questionStats, type QStat } from './stats';
import Overview from './pages/Overview';
import Exam from './pages/Exam';
import Practice from './pages/Practice';
import WrongBook from './pages/WrongBook';
import Catalog from './pages/Catalog';
import History from './pages/History';
import TestDetailPage from './pages/TestDetail';
import Import from './pages/Import';

type Data = {
  bank: Bank;
  byId: Map<number, Question>;
  areaName: (key: string) => string;
  stats: Map<number, QStat>;
  /** znovu načte odpovědi ze serveru (po procvičování / testu / importu) */
  refresh: () => Promise<void>;
};

const DataContext = createContext<Data | null>(null);
export const useData = () => useContext(DataContext)!;

// Jednoduchý hash router: #/cesta/parametr
function useRoute() {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.split('?')[0].split('/').filter(Boolean);
}

export const go = (path: string) => {
  location.hash = path;
};

const NAV = [
  { path: '', label: 'Přehled' },
  { path: 'zkouska', label: 'Cvičná zkouška' },
  { path: 'procvicovani', label: 'Procvičování' },
  { path: 'chybovnik', label: 'Chybovník' },
  { path: 'otazky', label: 'Otázky' },
  { path: 'historie', label: 'Historie' },
  { path: 'import', label: 'Import' },
];

export default function App() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();

  const refresh = useCallback(async () => setAnswers(await api.answers()), []);

  useEffect(() => {
    Promise.all([api.bank(), api.answers()])
      .then(([b, a]) => {
        setBank(b);
        setAnswers(a);
      })
      .catch((e) => setError(e.message));
  }, []);

  // Data se mohla změnit jinde (import ze záložky v jiné kartě), proto je obnovíme
  // při přechodu na jinou stránku a při návratu do okna
  const page = route[0];
  useEffect(() => {
    if (bank) refresh();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const data = useMemo<Data | null>(() => {
    if (!bank) return null;
    const names = new Map(bank.areas.map((a) => [a.key, a.name]));
    return {
      bank,
      byId: new Map(bank.questions.map((q) => [q.id, q])),
      areaName: (k) => names.get(k) ?? k,
      stats: questionStats(answers),
      refresh,
    };
  }, [bank, answers, refresh]);

  if (error) return <div className="center-msg">Nepodařilo se načíst data: {error}</div>;
  if (!data) return <div className="center-msg">Načítám otázky…</div>;

  const param = route[1];
  let content;
  switch (page) {
    case undefined: content = <Overview />; break;
    case 'zkouska': content = <Exam />; break;
    case 'procvicovani': content = <Practice mode={param} key={param ?? 'menu'} />; break;
    case 'chybovnik': content = <WrongBook />; break;
    case 'otazky': content = <Catalog />; break;
    case 'historie': content = param ? <TestDetailPage id={Number(param)} key={param} /> : <History />; break;
    case 'import': content = <Import failed={param === 'chyba'} />; break;
    default: content = <div className="center-msg">Stránka nenalezena</div>;
  }

  return (
    <DataContext.Provider value={data}>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden>B</span> Autoškola
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={`#/${n.path}`} className={(page ?? '') === n.path ? 'active' : ''}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <main className="container">{content}</main>
    </DataContext.Provider>
  );
}
