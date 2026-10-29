import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, RotateCcwIcon, ShuffleIcon, SparklesIcon, XIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { QuestionView } from '@/components/question-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, type Question } from '@/lib/api';
import { go, useData } from '@/lib/data';
import { ANSWER_KEYS, areaStats, MASTER_STREAK, pickPractice, pickWrong, shuffle, statusOf } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { celebrate, CountUp, EASE_OUT, POP } from '@/lib/motion';

/** Počítadlo, které při změně krátce "cvakne" */
function Bump({ value }: { value: number }) {
  return (
    <motion.span key={value} initial={value ? { transform: 'scale(1.4)' } : false} animate={{ transform: 'scale(1)' }} transition={POP} className="inline-block">
      {value}
    </motion.span>
  );
}

const SESSION = 20;

export default function Practice({ mode }: { mode?: string }) {
  return mode ? <Session mode={mode} /> : <Menu />;
}

function Menu() {
  const { bank, stats, counts } = useData();
  const areas = areaStats(bank, stats);
  const modes = [
    { href: '#/procvicovani/chyby', icon: RotateCcwIcon, title: 'Chybovník', value: counts.wrong, sub: 'otázek ke zopakování', tone: counts.wrong ? 'text-negative' : 'text-muted-foreground' },
    { href: '#/procvicovani/nove', icon: SparklesIcon, title: 'Neviděné otázky', value: counts.unseen, sub: 'ještě jsi je neviděl', tone: 'text-foreground' },
    { href: '#/procvicovani/vse', icon: ShuffleIcon, title: 'Mix všech okruhů', value: bank.questions.length, sub: 'náhodně, občas se vrátí chyba', tone: 'text-foreground' },
  ];
  return (
    <>
      <PageHeader title="Procvičování" description={`Kolo má ${SESSION} otázek a po každé odpovědi hned vidíš, jestli byla správně. Odpovídat můžeš klávesami A, B, C.`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {modes.map((m) => (
          <a key={m.href} href={m.href} className="group pressable-soft rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full gap-1 py-5 transition-colors duration-150 group-hover:border-foreground/25">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-normal text-muted-foreground">{m.title}</CardTitle>
                <m.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-2">
                <span className="flex flex-col">
                  <span className={cn('num text-3xl', m.tone)}>{m.value.toLocaleString('cs-CZ')}</span>
                  <span className="text-xs text-muted-foreground">{m.sub}</span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform duration-200 ease-snappy group-hover:translate-x-1 group-hover:text-foreground" />
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
      <Card className="gap-2">
        <CardHeader>
          <CardTitle>Podle okruhu</CardTitle>
          <CardDescription>Hlavně nové otázky z okruhu, mezi ně se náhodně vmíchá pár tvých chyb (nejvýš 4 z 20).</CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Okruh</TableHead>
                <TableHead className="hidden w-[28%] md:table-cell">Postup</TableHead>
                <TableHead className="text-right">Umím</TableHead>
                <TableHead className="text-right">Chyby</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Neviděno</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Úspěšnost</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.map((a) => (
                <TableRow key={a.key} className="h-12 cursor-pointer" onClick={() => go(`/procvicovani/${a.key}`)}>
                  <TableCell className="font-medium">{a.name} <span className="num font-normal text-muted-foreground">· {a.total}</span></TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-unseen">
                      <div className="bg-sign" style={{ width: `${(a.known / a.total) * 100}%` }} />
                      <div className="bg-negative" style={{ width: `${(a.wrong / a.total) * 100}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="num text-right">{a.known}</TableCell>
                  <TableCell className={cn('num text-right', a.wrong ? 'text-negative' : 'text-muted-foreground')}>{a.wrong}</TableCell>
                  <TableCell className="num hidden text-right text-muted-foreground sm:table-cell">{a.unseen}</TableCell>
                  <TableCell className="num hidden text-right sm:table-cell">{a.answers ? `${Math.round((a.correctAnswers / a.answers) * 100)} %` : <span className="text-muted-foreground">–</span>}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" asChild><a href={`#/procvicovani/${a.key}`} onClick={(e) => e.stopPropagation()}>Procvičit</a></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Session({ mode }: { mode: string }) {
  const { bank, stats, areaName, refresh } = useData();
  const isReview = mode === 'chyby';
  const title = isReview ? 'Chybovník' : mode === 'nove' ? 'Neviděné otázky' : mode === 'vse' ? 'Mix všech okruhů' : areaName(mode);

  const pick = () => {
    // Vybrat nejdůležitější chyby, ale v náhodném pořadí, aby se neopakovaly pořád stejně za sebou
    if (isReview) return shuffle(pickWrong(bank.questions, stats, SESSION));
    if (mode === 'nove') return shuffle(bank.questions.filter((q) => statusOf(stats.get(q.id)) === 'unseen')).slice(0, SESSION);
    if (mode === 'vse') return pickPractice(bank.questions, stats, SESSION);
    return pickPractice(bank.questions.filter((q) => q.area === mode), stats, SESSION);
  };
  // Sada otázek se vybere jednou na začátku kola
  const [questions, setQuestions] = useState<Question[]>(pick);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  // řada správných odpovědí po této odpovědi (statistiky se ze serveru obnovují asynchronně)
  const [streakAfter, setStreakAfter] = useState(0);
  const shownAt = useRef(Date.now());
  const q = questions[idx];
  const done = idx >= questions.length;

  const answer = (answerId: number) => {
    if (selected != null || !q) return;
    const ok = answerId === q.correct;
    setSelected(answerId);
    setStreakAfter(ok ? (stats.get(q.id)?.streak ?? 0) + 1 : 0);
    setResults((r) => [...r, ok]);
    api.answer({ question_id: q.id, chosen_answer_id: answerId, time_ms: Date.now() - shownAt.current, mode: isReview ? 'review' : 'practice' }).then(refresh);
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

  // Bezchybné kolo (aspoň 5 otázek) si zaslouží oslavu
  useEffect(() => {
    if (done && results.length >= 5 && results.every(Boolean)) setTimeout(celebrate, 250);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !q || (e.target instanceof Element && e.target.closest('input, textarea, [role=dialog]'))) return;
      const li = ANSWER_KEYS.indexOf(e.key);
      if (li >= 0 && q.answers[li]) answer(q.answers[li].id);
      else if (e.key === 'ArrowRight' || (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement))) next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const back = <a href="#/procvicovani" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="size-4" />Procvičování</a>;
  const ok = results.filter(Boolean).length;

  if (!questions.length) {
    return (
      <>
        <PageHeader back={back} title={title} />
        <Empty className="border border-dashed bg-card">
          <EmptyHeader>
            <EmptyTitle>{isReview ? 'Chybovník je prázdný' : 'Tady už nic nezbývá'}</EmptyTitle>
            <EmptyDescription>{isReview ? 'Všechny chyby máš opravené. Zkus cvičnou zkoušku nebo nové otázky.' : 'Všechny otázky z tohoto výběru už jsi viděl.'}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row justify-center">
            <Button variant="outline" asChild><a href="#/procvicovani/nove">Nové otázky</a></Button>
            <Button asChild><a href="#/zkouska">Cvičná zkouška</a></Button>
          </EmptyContent>
        </Empty>
      </>
    );
  }

  if (done) {
    const pct = Math.round((ok / results.length) * 100);
    const missed = results.length - ok;
    return (
      <>
        <PageHeader back={back} title={title} />
        <motion.div initial={{ opacity: 0, transform: 'scale(0.97)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ type: 'spring', duration: 0.45, bounce: 0.2 }}>
          <Card className="mx-auto w-full max-w-xl items-center py-10 text-center">
            <CardContent className="flex flex-col items-center gap-2">
              <span className="text-sm text-muted-foreground">Kolo dokončeno</span>
              <span className="num text-5xl font-medium tracking-tight"><CountUp value={ok} duration={0.6} /> <span className="text-2xl text-muted-foreground">/ {results.length}</span></span>
              <span className="num text-sm text-muted-foreground">{pct} % správně{missed > 0 && ` · ${missed} ${missed === 1 ? 'chyba je' : missed < 5 ? 'chyby jsou' : 'chyb je'} v chybovníku`}</span>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button variant="outline" asChild><a href="#/procvicovani">Zpět na výběr</a></Button>
                <Button onClick={restart}>Další kolo<ArrowRightIcon data-icon="inline-end" /></Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </>
    );
  }

  const isCorrect = selected === q.correct;
  const s = stats.get(q.id);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <PageHeader
        back={back}
        title={title}
        actions={
          <div className="flex items-center gap-3 text-sm" aria-label="Skóre kola">
            <span className="num flex items-center gap-1 text-positive"><CheckIcon className="size-4" /><Bump value={ok} /></span>
            <span className="num flex items-center gap-1 text-negative"><XIcon className="size-4" /><Bump value={results.length - ok} /></span>
          </div>
        }
      />
      <div className="flex items-center gap-3">
        <Progress value={(results.length / questions.length) * 100} className="h-1.5" aria-label="Postup v kole" />
        <span className="num shrink-0 text-sm text-muted-foreground">{idx + 1} / {questions.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, transform: 'translateX(24px)' }}
          animate={{ opacity: 1, transform: 'translateX(0px)' }}
          exit={{ opacity: 0, transform: 'translateX(-24px)' }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <Card>
            <CardContent className="flex flex-col gap-5">
              {s && s.seen > 0 && selected == null && (
                <span className="num text-xs text-muted-foreground">Dosud {s.correct}× správně, {s.wrong}× špatně</span>
              )}
              <QuestionView question={q} selected={selected} onSelect={answer} reveal={selected != null} />
              <AnimatePresence>
                {selected != null && (
                  <motion.div
                    initial={{ opacity: 0, transform: 'translateY(8px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    transition={{ duration: 0.2 }}
                    className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm', isCorrect ? 'bg-positive-soft text-positive-ink' : 'bg-negative-soft text-negative-ink')}
                  >
                    <span>
                      <b className="font-medium">{isCorrect ? 'Správně.' : 'Špatně.'}</b>{' '}
                      {isCorrect
                        ? isReview ? (streakAfter >= MASTER_STREAK ? 'Otázka vypadla z chybovníku.' : `Ještě ${MASTER_STREAK - streakAfter}× a vypadne z chybovníku.`) : ''
                        : isReview ? 'Řada správných odpovědí začíná znovu.' : 'Otázka šla do chybovníku.'}
                    </span>
                    <Button size="sm" onClick={next} autoFocus>
                      {idx === questions.length - 1 ? 'Dokončit kolo' : 'Další otázka'}
                      <Kbd className="ml-1 hidden bg-primary-foreground/15 text-primary-foreground md:inline-flex">Enter</Kbd>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <Kbd>1</Kbd><Kbd>2</Kbd><Kbd>3</Kbd> výběr odpovědi · <Kbd>Enter</Kbd> další otázka
      </p>
    </div>
  );
}
