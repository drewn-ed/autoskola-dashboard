import { useEffect, useState } from 'react';
import { ArrowLeftIcon, CheckIcon, ClipboardCheckIcon, PlayIcon, RotateCcwIcon, Trash2Icon, XIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { TestQuestionDialog } from '@/components/test-question-dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, mediaUrl, type TestDetail, type TestItem } from '@/lib/api';
import { go, useData } from '@/lib/data';
import { formatDate, formatDuration, PASS_SCORE } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { celebrate, CountUp, EASE_OUT, POP } from '@/lib/motion';
import { ResultBadge, SOURCE_LABEL } from './History';

/** Náhled obrázku nebo videa otázky v řádku testu */
function RowThumb({ it }: { it: TestItem }) {
  const { byId } = useData();
  const media = it.question_id != null ? byId.get(it.question_id)?.media : null;
  const src = media?.type === 'image' ? mediaUrl(media) : !media ? it.snapshot?.image : null;
  if (media?.type === 'video') {
    return <span className="grid h-12 w-18 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><PlayIcon className="size-4" /></span>;
  }
  if (!src) return null;
  return <img src={src} alt="" loading="lazy" className="h-12 w-18 shrink-0 rounded-md bg-muted object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />;
}

export default function TestDetailPage({ id }: { id: number }) {
  const { byId, areaName, refresh } = useData();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');
  // Index otevřené otázky v aktuálně zobrazeném seznamu (Všechny / Chyby)
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Čerstvě vyhodnocená zkouška (přišli jsme z ní): jednou se odehraje výsledek
  const [fresh] = useState(() => location.hash.includes('?nova'));
  useEffect(() => {
    api.test(id).then(setTest, (e) => setError(e.message));
    if (fresh) history.replaceState(null, '', `#/historie/${id}`);
  }, [id, fresh]);
  useEffect(() => {
    if (fresh && test && test.score >= (test.pass_score ?? PASS_SCORE)) setTimeout(celebrate, 350);
  }, [fresh, test]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!test) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const passScore = test.pass_score ?? PASS_SCORE;
  const ok = test.score >= passScore;
  const wrongCount = test.items.filter((i) => !i.is_correct).length;
  const items = filter === 'wrong' ? test.items.filter((i) => !i.is_correct) : test.items;
  // Body za otázku: z ministerské sady, u otázek autoškoly ze snímku testu
  const pointsOf = (it: TestItem) => (it.question_id != null ? byId.get(it.question_id)?.points : it.snapshot?.points) ?? 0;
  const lostPoints = test.items.reduce((s, it) => s + (it.is_correct ? 0 : pointsOf(it)), 0);

  // Úspěšnost po okruzích (otázky i body)
  const byArea = new Map<string, { ok: number; total: number; got: number; max: number }>();
  for (const it of test.items) {
    const q = it.question_id != null ? byId.get(it.question_id) : null;
    const key = q ? areaName(q.area) : it.snapshot?.category || 'Otázky autoškoly';
    const a = byArea.get(key) ?? { ok: 0, total: 0, got: 0, max: 0 };
    const p = pointsOf(it);
    a.total++;
    a.max += p;
    if (it.is_correct) { a.ok++; a.got += p; }
    byArea.set(key, a);
  }

  const remove = async () => {
    await api.deleteTest(test.id);
    await refresh();
    toast.success('Test smazán z historie');
    go('/historie');
  };

  return (
    <>
      <PageHeader
        back={<a href="#/historie" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="size-4" />Historie testů</a>}
        title={test.title}
        description={<>{formatDate(test.started_at)} · {SOURCE_LABEL[test.source]}</>}
        actions={
          <>
            {wrongCount > 0 && <Button variant="outline" asChild><a href="#/procvicovani/chyby"><RotateCcwIcon data-icon="inline-start" />Opakovat chyby</a></Button>}
            <Button asChild><a href="#/zkouska"><ClipboardCheckIcon data-icon="inline-start" />Nová zkouška</a></Button>
          </>
        }
      />

      <Card className="py-0">
        <CardContent className="grid grid-cols-2 divide-border px-0 md:grid-cols-4 md:divide-x">
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Výsledek</span><motion.span className="inline-block origin-left pt-1" initial={{ opacity: 0, transform: 'scale(0.8)' }} animate={{ opacity: 1, transform: 'scale(1)' }} transition={{ ...POP, delay: 0.5 }}><ResultBadge ok={ok} /></motion.span><span className="text-xs text-muted-foreground">potřeba {passScore} bodů</span></div>
          <div className="flex flex-col gap-1 p-5">
            <span className="text-sm text-muted-foreground">Body</span>
            <span className="num text-3xl font-medium"><CountUp value={test.score} duration={fresh ? 0.8 : 0.5} /><span className="text-base font-normal text-muted-foreground"> / {test.max_score}</span></span>
            <span className="num text-xs text-muted-foreground">{ok ? `rezerva ${test.score - passScore} b` : `chybělo ${passScore - test.score} b`} · ztraceno {lostPoints} b</span>
          </div>
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Správně</span><span className="num text-3xl"><CountUp value={test.correct_count} duration={fresh ? 0.8 : 0.5} /><span className="text-base text-muted-foreground"> / {test.total}</span></span></div>
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Čas</span><span className="num text-3xl">{formatDuration(test.duration_s).replace(' min', '')}<span className="text-base text-muted-foreground"> min</span></span></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
          <CardHeader><CardTitle>Podle okruhů</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {[...byArea].map(([name, a], i) => (
              <div key={name} className="flex flex-col gap-1.5" title={`${name}: ${a.ok} z ${a.total} otázek správně, ${a.got} z ${a.max} bodů`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{name}</span>
                  <span className={cn('num shrink-0', a.got < a.max ? 'text-foreground' : 'text-muted-foreground')}>{a.got} / {a.max} b</span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-negative/25">
                  <motion.div
                    className="absolute inset-0 origin-left bg-sign"
                    initial={{ transform: 'scaleX(0)' }}
                    animate={{ transform: `scaleX(${a.max ? a.got / a.max : 0})` }}
                    transition={{ duration: 0.6, delay: 0.15 + 0.05 * i, ease: EASE_OUT }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-2 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-baseline gap-2.5">
              <CardTitle>Otázky</CardTitle>
              {lostPoints > 0 && <span className="num text-sm text-muted-foreground">ztraceno {lostPoints} b</span>}
            </div>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v as 'all' | 'wrong'); setOpenIdx(null); }}>
              <TabsList>
                <TabsTrigger value="all">Všechny <span className="num text-muted-foreground">{test.items.length}</span></TabsTrigger>
                <TabsTrigger value="wrong">Chyby <span className="num text-muted-foreground">{wrongCount}</span></TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          {/* key={filter}: po přepnutí Všechny/Chyby se seznam znovu postupně objeví */}
          <CardContent key={filter} className="flex flex-col">
            {items.map((it, i) => {
              const q = it.question_id != null ? byId.get(it.question_id) : null;
              const text = q?.text ?? it.snapshot?.text ?? '';
              const chosen = q ? q.answers.find((a) => a.id === it.chosen_answer_id)?.text : it.snapshot?.answers.find((a) => a.chosen)?.text;
              const correct = q ? q.answers.find((a) => a.id === q.correct)?.text : it.snapshot?.answers.find((a) => a.correct)?.text;
              const points = pointsOf(it);
              return (
                // Vjezd animuje obal, aby inline transform z motion nepřebil stlačení tlačítka (pressable-soft)
                <motion.div
                  key={it.pos}
                  className="border-b border-rule last:border-0"
                  initial={{ opacity: 0, transform: 'translateY(6px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  transition={{ duration: 0.25, delay: Math.min(i, 14) * 0.025, ease: EASE_OUT }}
                >
                <button
                  type="button"
                  onClick={() => setOpenIdx(i)}
                  className="pressable-soft -mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-md px-2 py-3 text-left outline-none hover:bg-muted active:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="num w-6 shrink-0 pt-0.5 text-right text-sm text-muted-foreground">{it.pos}.</span>
                  <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white', it.is_correct ? 'bg-positive' : 'bg-negative')}>
                    {it.is_correct ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm text-foreground">{text}</span>
                    {!it.is_correct && (
                      <span className="flex flex-col gap-0.5 text-[13px]">
                        <span className="text-negative-ink dark:text-negative">Tvoje: {chosen ?? 'bez odpovědi'}</span>
                        <span className="text-muted-foreground">Správně: {correct}</span>
                      </span>
                    )}
                  </span>
                  <RowThumb it={it} />
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant={it.is_correct ? 'positive' : 'negative'}
                      className="num"
                      title={`Otázka za ${points} ${points === 1 ? 'bod' : points < 5 ? 'body' : 'bodů'}, ${it.is_correct ? 'získáno' : 'ztraceno'}`}
                    >
                      {it.is_correct ? '+' : '−'}{points} b
                    </Badge>
                    {it.time_ms != null && <span className="num text-xs text-muted-foreground">{Math.round(it.time_ms / 1000)} s</span>}
                  </span>
                </button>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-muted-foreground"><Trash2Icon data-icon="inline-start" />Smazat test z historie</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Smazat tento test?</AlertDialogTitle>
              <AlertDialogDescription>Odpovědi z testu se odeberou i ze statistik a chybovníku. Nejde to vrátit.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ponechat</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>Smazat test</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <TestQuestionDialog items={items} index={openIdx} onIndexChange={setOpenIdx} />
    </>
  );
}
