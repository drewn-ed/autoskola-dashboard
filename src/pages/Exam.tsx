import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftIcon, ArrowRightIcon, ClipboardCheckIcon, TimerIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { QuestionView } from '@/components/question-view';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, type Question } from '@/lib/api';
import { go, useData } from '@/lib/data';
import { ANSWER_KEYS, areaStats, EXAM_LAYOUT, EXAM_MINUTES, generateExam, PASS_SCORE } from '@/lib/stats';
import { examSession } from '@/lib/exam-session';
import { EASE_MOVE, EASE_OUT, POP } from '@/lib/motion';
import { cn } from '@/lib/utils';

export default function Exam() {
  const { bank, byId, areaName, refresh, tests, stats } = useData();
  // Rozpracovaná zkouška se obnoví, když se sem vrátíš z jiné stránky
  const resumed = examSession.get();
  const [questions, setQuestions] = useState<Question[] | null>(() => resumed?.questionIds.map((id) => byId.get(id)!) ?? null);
  const [chosen, setChosen] = useState<Record<number, number>>(() => resumed?.chosen ?? {});
  const [idx, setIdx] = useState(() => resumed?.idx ?? 0);
  const [left, setLeft] = useState(() => resumed ? EXAM_MINUTES * 60 - Math.floor((Date.now() - Date.parse(resumed.startedAt)) / 1000) : EXAM_MINUTES * 60);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startedAt = useRef(resumed?.startedAt ?? '');
  const timeSpent = useRef<Record<number, number>>(resumed?.timeSpent ?? {});
  const shownAt = useRef(Date.now());

  useEffect(() => {
    if (questions && !saving) {
      examSession.set({ questionIds: questions.map((q) => q.id), chosen, idx, startedAt: startedAt.current, timeSpent: timeSpent.current });
    }
  }, [questions, chosen, idx, saving]);
  // Při odchodu na jinou stránku si uložíme i čas strávený na aktuální otázce
  useEffect(() => () => {
    const s = examSession.get();
    if (!s) return;
    const id = s.questionIds[s.idx];
    s.timeSpent[id] = (s.timeSpent[id] ?? 0) + (Date.now() - shownAt.current);
  }, []);

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
    try {
      const { id } = await api.saveExam({
        started_at: startedAt.current,
        duration_s: Math.round((Date.now() - Date.parse(startedAt.current)) / 1000),
        items: questions.map((q) => ({ question_id: q.id, chosen_answer_id: chosen[q.id] ?? null, time_ms: Math.round(timeSpent.current[q.id] ?? 0) })),
      });
      examSession.set(null);
      await refresh();
      toast.success('Zkouška vyhodnocena a uložena do historie');
      go(`/historie/${id}?nova`);
    } catch (e) {
      setSaving(false);
      toast.error(`Zkoušku se nepodařilo uložit: ${(e as Error).message}`);
    }
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

  // Odpočet; po vypršení se zkouška automaticky vyhodnotí
  useEffect(() => {
    if (!questions) return;
    const t = setInterval(() => setLeft(EXAM_MINUTES * 60 - Math.floor((Date.now() - Date.parse(startedAt.current)) / 1000)), 500);
    return () => clearInterval(t);
  }, [questions]);
  useEffect(() => {
    if (questions && left <= 0) finish();
  }, [left, questions, finish]);

  // Klávesy: 1/2/3 výběr, šipky pohyb, U ukončit
  useEffect(() => {
    if (!questions || confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = questions[idx];
      const k = e.key.toLowerCase();
      const li = ANSWER_KEYS.indexOf(k);
      if (li >= 0 && q.answers[li]) setChosen((c) => ({ ...c, [q.id]: q.answers[li].id }));
      else if (k === 'arrowright') goTo(idx + 1);
      else if (k === 'arrowleft') goTo(idx - 1);
      else if (k === 'u') setConfirmOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions, idx, goTo, confirmOpen]);

  // Varování při zavření stránky během zkoušky
  useEffect(() => {
    if (!questions) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [questions]);

  if (!questions) {
    const exams = tests.filter((t) => t.kind === 'exam');
    const expected = Math.round(areaStats(bank, stats).reduce((sum, a) => sum + a.expectedPoints, 0));
    const maxPts = Object.fromEntries(bank.areas.map((a) => [a.key, bank.questions.find((q) => q.area === a.key)?.points ?? 0]));
    return (
      <>
        <PageHeader title="Cvičná zkouška" description="Stejná jako ostrá zkouška skupiny B. Otázky se losují z oficiální sady ministerstva, výsledek se uloží do historie." />
        <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="num">25 otázek · {EXAM_MINUTES} minut · minimum {PASS_SCORE} z 50 bodů</CardTitle>
            <CardDescription>Odpovědi můžeš do konce měnit. Po vypršení času se zkouška vyhodnotí sama.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent"><TableHead>Okruh</TableHead><TableHead className="text-right">Otázek</TableHead><TableHead className="text-right">Bodů za otázku</TableHead><TableHead className="text-right">Celkem</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(EXAM_LAYOUT).map(([k, n]) => (
                  <TableRow key={k} className="hover:bg-transparent">
                    <TableCell>{areaName(k)}</TableCell>
                    <TableCell className="num text-right">{n}</TableCell>
                    <TableCell className="num text-right text-muted-foreground">{maxPts[k]}</TableCell>
                    <TableCell className="num text-right">{n * maxPts[k]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
              <Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd> odpověď · <Kbd>←</Kbd><Kbd>→</Kbd> otázky · <Kbd>U</Kbd> vyhodnotit
            </span>
            <Button size="lg" onClick={start}><ClipboardCheckIcon data-icon="inline-start" />Začít zkoušku</Button>
          </CardFooter>
        </Card>
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Tvoje poslední zkoušky</CardTitle>
            <CardDescription className="num">Odhad pro dnešek: {expected} z 50 bodů</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            {exams.length === 0 && <p className="py-4 text-sm text-muted-foreground">Tohle bude tvoje první zkouška.</p>}
            {exams.slice(0, 5).map((t) => {
              const pts = Math.round((t.score / t.max_score) * 50);
              return (
                <a key={t.id} href={`#/historie/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-md border-b border-rule px-2 py-2.5 text-sm last:border-0 hover:bg-muted">
                  <span className="num w-24 shrink-0 text-muted-foreground">{new Date(t.started_at).toLocaleDateString('cs-CZ')}</span>
                  <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-unseen">
                    <span className={pts >= PASS_SCORE ? 'bg-positive' : 'bg-sign'} style={{ width: `${(pts / 50) * 100}%` }} />
                  </span>
                  <span className="num w-14 shrink-0 text-right">{pts} / 50</span>
                </a>
              );
            })}
          </CardContent>
          <CardFooter className="border-t text-sm text-muted-foreground">
            Nejvíc bodů dávají pravidla provozu (20) a dopravní situace (12).
          </CardFooter>
        </Card>
        </div>
      </>
    );
  }

  const q = questions[idx];
  const answered = Object.keys(chosen).length;
  const mm = Math.max(0, Math.floor(left / 60));
  const ss = Math.max(0, left % 60);
  const lowTime = left < 300;

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          <AnimatePresence mode="wait">
            <motion.div key={q.id} initial={{ opacity: 0, transform: 'translateX(20px)' }} animate={{ opacity: 1, transform: 'translateX(0px)' }} exit={{ opacity: 0, transform: 'translateX(-20px)' }} transition={{ duration: 0.18, ease: EASE_OUT }}>
              <Card>
                <CardHeader>
                  <CardDescription className="num">Otázka {idx + 1} z {questions.length}</CardDescription>
                </CardHeader>
                <CardContent>
                  <QuestionView question={q} selected={chosen[q.id] ?? null} onSelect={(a) => setChosen((c) => ({ ...c, [q.id]: a }))} />
                </CardContent>
                <CardFooter className="justify-between border-t">
                  <Button variant="outline" disabled={idx === 0} onClick={() => goTo(idx - 1)}><ArrowLeftIcon data-icon="inline-start" />Předchozí</Button>
                  {idx < questions.length - 1 ? (
                    <Button variant={chosen[q.id] ? 'default' : 'outline'} onClick={() => goTo(idx + 1)}>Další<ArrowRightIcon data-icon="inline-end" /></Button>
                  ) : (
                    <Button onClick={() => setConfirmOpen(true)}>Vyhodnotit zkoušku</Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        <Card className="gap-4 lg:sticky lg:top-6 lg:order-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-normal text-muted-foreground">Zbývá</CardTitle>
            <span className={cn('num flex items-center gap-1.5 text-2xl font-medium', lowTime && 'text-negative')} role="timer" aria-live="off">
              <TimerIcon className="size-4" />{mm}:{String(ss).padStart(2, '0')}
            </span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <span className="num text-sm text-muted-foreground">Zodpovězeno {answered} z {questions.length}</span>
            <div className="grid grid-cols-10 gap-1.5 lg:grid-cols-5">
              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Otázka ${i + 1}${chosen[qq.id] ? ', zodpovězeno' : ''}`}
                  aria-current={i === idx}
                  className={cn(
                    'num pressable relative aspect-square rounded-md border text-xs outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring',
                    chosen[qq.id] ? 'border-transparent bg-foreground text-background' : 'bg-card text-muted-foreground',
                  )}
                >
                  {/* Rámeček aktuální otázky se mezi buňkami přesouvá (ukazuje, kam jsi skočil) */}
                  {i === idx && (
                    <motion.span layoutId="exam-current" className="pointer-events-none absolute -inset-[4px] rounded-[9px] ring-2 ring-sign" transition={{ duration: 0.2, ease: EASE_MOVE }} />
                  )}
                  <motion.span
                    key={chosen[qq.id] ? 'answered' : 'open'}
                    className="relative grid size-full place-items-center"
                    initial={chosen[qq.id] ? { transform: 'scale(0.6)' } : false}
                    animate={{ transform: 'scale(1)' }}
                    transition={POP}
                  >
                    {i + 1}
                  </motion.span>
                </button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t">
            <Button className="w-full" variant={answered === questions.length ? 'default' : 'outline'} disabled={saving} onClick={() => setConfirmOpen(true)}>
              {saving ? 'Ukládám…' : 'Ukončit a vyhodnotit'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vyhodnotit zkoušku?</AlertDialogTitle>
            <AlertDialogDescription>
              {answered < questions.length
                ? `Nezodpovězených otázek: ${questions.length - answered}. Počítají se jako špatně.`
                : 'Máš zodpovězeno všech 25 otázek. Po vyhodnocení už odpovědi nejde změnit.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Pokračovat v testu</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Vyhodnotit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
