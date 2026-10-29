import { useState } from 'react';
import { ChevronRightIcon, ClipboardCheckIcon, RotateCcwIcon } from 'lucide-react';
import { ExamBar } from '@/components/exam-bar';
import { PageHeader } from '@/components/page-header';
import { QuestionMap } from '@/components/question-map';
import { QuestionDialog, StreakDots } from '@/components/question-sheet';
import { ScoreChart } from '@/components/score-chart';
import { TestsTable } from '@/pages/History';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import type { Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { areaStats, MASTER_STREAK, PASS_SCORE, pickWrong } from '@/lib/stats';

const fmt1 = (n: number) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 });

export default function Overview() {
  const { bank, stats, counts, tests, areaName } = useData();
  const [open, setOpen] = useState<Question | null>(null);

  const areas = areaStats(bank, stats);
  const expected = Math.round(areas.reduce((s, a) => s + a.expectedPoints, 0));
  const total = bank.questions.length;
  const seen = total - counts.unseen;
  const worst = [...areas].sort((a, b) => (b.maxPoints - b.expectedPoints) - (a.maxPoints - a.expectedPoints))[0];
  const passed = tests.filter((t) => t.score >= (t.pass_score ?? PASS_SCORE)).length;
  const queue = pickWrong(bank.questions, stats, 5);
  const ready = expected >= PASS_SCORE;

  return (
    <>
      <PageHeader
        title="Přehled"
        description={
          <>
            Odhadem bys dnes u zkoušky získal <b className="font-medium text-foreground num">{expected} z 50 bodů</b>
            {ready ? ', tedy na projití.' : `, k hranici ${PASS_SCORE} chybí ${PASS_SCORE - expected}.`}
            {worst && !ready && <> Nejvíc bodů ztrácíš v okruhu {worst.name.toLowerCase()} (−{fmt1(worst.maxPoints - worst.expectedPoints)} b.).</>}
          </>
        }
        actions={
          <>
            {counts.wrong > 0 && (
              <Button variant="outline" size="lg" asChild>
                <a href="#/procvicovani/chyby"><RotateCcwIcon data-icon="inline-start" />Opakovat chyby <span className="num text-muted-foreground">{counts.wrong}</span></a>
              </Button>
            )}
            <Button size="lg" asChild>
              <a href="#/zkouska"><ClipboardCheckIcon data-icon="inline-start" />Spustit cvičnou zkoušku</a>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Odhad bodů u zkoušky</CardTitle>
            <CardDescription>25 otázek ve stejném složení jako ostrá zkouška. Klikni na okruh a procvičuj ho.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-baseline gap-2">
              <span className="num text-4xl font-medium tracking-tight text-foreground">{expected}</span>
              <span className="num text-sm text-muted-foreground">z 50 bodů · potřeba {PASS_SCORE}</span>
            </div>
            <ExamBar areas={areas} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader><CardTitle>Postup</CardTitle></CardHeader>
          <CardContent className="flex flex-col divide-y">
            <div className="flex flex-col gap-2 pb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Viděné otázky</span>
                <span className="num text-sm"><span className="text-2xl text-foreground">{seen}</span> <span className="text-muted-foreground">z {total.toLocaleString('cs-CZ')}</span></span>
              </div>
              <Progress value={(seen / total) * 100} aria-label="Viděné otázky" />
            </div>
            <div className="flex items-baseline justify-between py-4">
              <span className="text-sm text-muted-foreground">Umím</span>
              <span className="num text-2xl text-foreground">{counts.known}</span>
            </div>
            <a href="#/chybovnik" className="group flex items-baseline justify-between py-4">
              <span className="text-sm text-muted-foreground group-hover:underline">V chybovníku</span>
              <span className={counts.wrong ? 'num text-2xl text-negative' : 'num text-2xl text-muted-foreground'}>{counts.wrong}</span>
            </a>
            <a href="#/historie" className="group flex items-baseline justify-between pt-4">
              <span className="text-sm text-muted-foreground group-hover:underline">Splněné testy</span>
              <span className="num text-sm"><span className="text-2xl text-foreground">{passed}</span> <span className="text-muted-foreground">z {tests.length}</span></span>
            </a>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Vývoj skóre</CardTitle>
            <CardDescription>Body ze všech testů přepočtené na 50, přerušovaná čára je hranice {PASS_SCORE} b.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {tests.length ? <ScoreChart tests={tests} /> : (
              <Empty className="h-[210px] border border-dashed">
                <EmptyHeader><EmptyTitle>Zatím žádný test</EmptyTitle><EmptyDescription>Po první cvičné zkoušce tu uvidíš, jak se ti daří.</EmptyDescription></EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Na řadě v chybovníku</CardTitle>
            <CardDescription>Otázka zmizí po {MASTER_STREAK} správných odpovědích za sebou.</CardDescription>
            {counts.wrong > 5 && <CardAction><Button variant="ghost" size="sm" asChild><a href="#/chybovnik">Všech {counts.wrong}<ChevronRightIcon data-icon="inline-end" /></a></Button></CardAction>}
          </CardHeader>
          <CardContent className="flex flex-col">
            {queue.length === 0 && <p className="py-6 text-sm text-muted-foreground">Chybovník je prázdný. Až něco pokazíš, objeví se to tady.</p>}
            {queue.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setOpen(q)}
                className="pressable-soft -mx-2 flex items-center gap-3 rounded-md border-b border-rule px-2 py-2.5 text-left text-sm outline-none last:border-0 hover:bg-muted active:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-foreground">{q.text}</span>
                  <span className="truncate text-xs text-muted-foreground">{areaName(q.area)} · {stats.get(q.id)!.wrong}× špatně</span>
                </span>
                <StreakDots streak={stats.get(q.id)!.streak} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle>Mapa otázek</CardTitle>
            <CardDescription>Všech {total.toLocaleString('cs-CZ')} otázek ministerské sady, jeden čtvereček je jedna otázka. Kliknutím otevřeš detail.</CardDescription>
            <CardAction className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-sign" />umím</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-negative" />chyba</span>
              <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-unseen" />neviděno</span>
            </CardAction>
          </CardHeader>
          <CardContent><QuestionMap /></CardContent>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle>Poslední testy</CardTitle>
            {tests.length > 4 && <CardAction><Button variant="ghost" size="sm" asChild><a href="#/historie">Celá historie<ChevronRightIcon data-icon="inline-end" /></a></Button></CardAction>}
          </CardHeader>
          <CardContent>
            <TestsTable tests={tests.slice(0, 4)} />
          </CardContent>
        </Card>
      </div>
      <QuestionDialog question={open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
