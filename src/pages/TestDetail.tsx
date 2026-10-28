import { useEffect, useState } from 'react';
import { ArrowLeftIcon, CheckIcon, ClipboardCheckIcon, RotateCcwIcon, Trash2Icon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { QuestionSheet } from '@/components/question-sheet';
import { SnapshotView } from '@/components/question-view';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type Snapshot, type TestDetail, type TestItem } from '@/lib/api';
import { go, useData } from '@/lib/data';
import { formatDate, formatDuration, PASS_SCORE } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { ResultBadge, SOURCE_LABEL } from './History';

export default function TestDetailPage({ id }: { id: number }) {
  const { byId, areaName, refresh } = useData();
  const [test, setTest] = useState<TestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');
  const [open, setOpen] = useState<TestItem | null>(null);

  useEffect(() => {
    api.test(id).then(setTest, (e) => setError(e.message));
  }, [id]);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!test) return <div className="flex flex-col gap-4"><Skeleton className="h-10 w-80" /><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const ok = test.score >= (test.pass_score ?? PASS_SCORE);
  const wrongCount = test.items.filter((i) => !i.is_correct).length;
  const items = filter === 'wrong' ? test.items.filter((i) => !i.is_correct) : test.items;

  // Úspěšnost po okruzích
  const byArea = new Map<string, { ok: number; total: number }>();
  for (const it of test.items) {
    const q = it.question_id != null ? byId.get(it.question_id) : null;
    const key = q ? areaName(q.area) : it.snapshot?.category || 'Otázky autoškoly';
    const a = byArea.get(key) ?? { ok: 0, total: 0 };
    a.total++;
    if (it.is_correct) a.ok++;
    byArea.set(key, a);
  }

  const remove = async () => {
    await api.deleteTest(test.id);
    await refresh();
    toast.success('Test smazán z historie');
    go('/historie');
  };

  const openQ = open?.question_id != null ? byId.get(open.question_id) ?? null : null;
  const openSnap: Snapshot | null = open && !openQ ? open.snapshot : null;

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
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Výsledek</span><span className="pt-1"><ResultBadge ok={ok} /></span><span className="text-xs text-muted-foreground">potřeba {test.pass_score ?? PASS_SCORE} bodů</span></div>
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Body</span><span className="num text-3xl font-medium">{test.score}<span className="text-base font-normal text-muted-foreground"> / {test.max_score}</span></span></div>
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Správně</span><span className="num text-3xl">{test.correct_count}<span className="text-base text-muted-foreground"> / {test.total}</span></span></div>
          <div className="flex flex-col gap-1 p-5"><span className="text-sm text-muted-foreground">Čas</span><span className="num text-3xl">{formatDuration(test.duration_s).replace(' min', '')}<span className="text-base text-muted-foreground"> min</span></span></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:sticky lg:top-6 lg:col-span-4 lg:self-start">
          <CardHeader><CardTitle>Podle okruhů</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3.5">
            {[...byArea].map(([name, a]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{name}</span>
                  <span className={cn('num', a.ok < a.total ? 'text-foreground' : 'text-muted-foreground')}>{a.ok} / {a.total}</span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-negative/25">
                  <div className="bg-sign" style={{ width: `${(a.ok / a.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gap-2 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Otázky</CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'wrong')}>
              <TabsList>
                <TabsTrigger value="all">Všechny <span className="num text-muted-foreground">{test.items.length}</span></TabsTrigger>
                <TabsTrigger value="wrong">Chyby <span className="num text-muted-foreground">{wrongCount}</span></TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex flex-col">
            {items.map((it) => {
              const q = it.question_id != null ? byId.get(it.question_id) : null;
              const text = q?.text ?? it.snapshot?.text ?? '';
              const chosen = q ? q.answers.find((a) => a.id === it.chosen_answer_id)?.text : it.snapshot?.answers.find((a) => a.chosen)?.text;
              const correct = q ? q.answers.find((a) => a.id === q.correct)?.text : it.snapshot?.answers.find((a) => a.correct)?.text;
              return (
                <button
                  key={it.pos}
                  type="button"
                  onClick={() => setOpen(it)}
                  className="-mx-2 flex items-start gap-3 rounded-md border-b border-rule px-2 py-3 text-left transition-colors outline-none last:border-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
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
                  {it.time_ms != null && <span className="num shrink-0 text-xs text-muted-foreground">{Math.round(it.time_ms / 1000)} s</span>}
                </button>
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

      <QuestionSheet question={openQ} selected={open?.chosen_answer_id} onOpenChange={(o) => !o && setOpen(null)} />
      <Sheet open={!!openSnap} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Otázka autoškoly</SheetTitle>
            <SheetDescription>Není v ministerské sadě, proto ji nejde procvičovat.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{openSnap && <SnapshotView snapshot={openSnap} />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
