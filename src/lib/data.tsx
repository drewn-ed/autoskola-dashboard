import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type AnswerRow, type Bank, type Profile, type Question, type TestSummary } from './api';
import { questionStats, statusOf, type QStat, type Status } from './stats';

type Data = {
  bank: Bank;
  byId: Map<number, Question>;
  areaName: (key: string) => string;
  stats: Map<number, QStat>;
  status: (q: Question) => Status;
  counts: Record<Status, number>;
  tests: TestSummary[];
  profile: Profile;
  saveProfile: (p: Profile) => Promise<void>;
  /** znovu načte odpovědi a testy ze serveru (po procvičování / testu / importu) */
  refresh: () => Promise<void>;
};

const DataContext = createContext<Data | null>(null);
export const useData = () => useContext(DataContext)!;

export function DataProvider({ children, fallback }: { children: ReactNode; fallback: (error: string | null) => ReactNode }) {
  const [bank, setBank] = useState<Bank | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [a, t] = await Promise.all([api.answers(), api.tests()]);
    setAnswers(a);
    setTests(t);
  }, []);

  useEffect(() => {
    Promise.all([api.bank(), refresh(), api.profile()])
      .then(([b, , p]) => {
        setProfile(p);
        setBank(b);
      })
      .catch((e) => setError(e.message));
  }, [refresh]);

  // Data se mohla změnit jinde (import ze záložky v jiné kartě)
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const saveProfile = useCallback(async (p: Profile) => {
    await api.saveProfile(p);
    setProfile(await api.profile());
  }, []);

  const data = useMemo<Data | null>(() => {
    if (!bank) return null;
    const names = new Map(bank.areas.map((a) => [a.key, a.name]));
    const stats = questionStats(answers);
    const counts: Record<Status, number> = { unseen: 0, wrong: 0, known: 0 };
    for (const q of bank.questions) counts[statusOf(stats.get(q.id))]++;
    return {
      bank,
      byId: new Map(bank.questions.map((q) => [q.id, q])),
      areaName: (k) => names.get(k) ?? k,
      stats,
      status: (q) => statusOf(stats.get(q.id)),
      counts,
      tests,
      profile,
      saveProfile,
      refresh,
    };
  }, [bank, answers, tests, profile, saveProfile, refresh]);

  if (!data) return <>{fallback(error)}</>;
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>;
}

// --- Hash router: #/cesta/parametr ---
export function useRoute() {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1) || '/');
      document.getElementById('main')?.scrollTo?.(0, 0);
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
