import { useEffect, useMemo, useState } from 'react';
import { PlayIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { QuestionSheet, StreakDots } from '@/components/question-sheet';
import { SnapshotView } from '@/components/question-view';
import { Thumb } from '@/pages/Catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api, type ExternalWrong, type Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { formatDate, MASTER_STREAK, wrongPriority } from '@/lib/stats';

export default function WrongBook() {
  const { bank, stats, status, areaName, counts } = useData();
  const [area, setArea] = useState('all');
  const [open, setOpen] = useState<Question | null>(null);
  const [external, setExternal] = useState<ExternalWrong[]>([]);
  const [openExt, setOpenExt] = useState<ExternalWrong | null>(null);
  useEffect(() => {
    api.externalWrong().then(setExternal);
  }, []);

  const wrong = useMemo(
    () => bank.questions
      .filter((q) => status(q) === 'wrong' && (area === 'all' || q.area === area))
      .sort((a, b) => wrongPriority(b, stats.get(b.id)!) - wrongPriority(a, stats.get(a.id)!)),
    [bank, stats, status, area],
  );

  return (
    <>
      <PageHeader
        title="Chybovník"
        description={`Otázky, které jsi měl špatně v dashboardu nebo v importovaných testech. Otázka zmizí, až ji dáš ${MASTER_STREAK}× po sobě správně. Nahoře jsou ty s nejvíc chybami a body.`}
        actions={counts.wrong > 0 && <Button size="lg" asChild><a href="#/procvicovani/chyby"><PlayIcon data-icon="inline-start" />Opakovat chyby</a></Button>}
      />

      <Card className="gap-2">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="num">{wrong.length} {wrong.length === 1 ? 'otázka' : wrong.length < 5 && wrong.length > 0 ? 'otázky' : 'otázek'}</CardTitle>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-[220px]" aria-label="Okruh"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Všechny okruhy</SelectItem>
                {bank.areas.map((a) => <SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {wrong.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>{counts.wrong ? 'V tomhle okruhu nic není' : 'Chybovník je prázdný'}</EmptyTitle>
                <EmptyDescription>{counts.wrong ? 'Vyber jiný okruh.' : 'Až někde odpovíš špatně, otázka se objeví tady.'}</EmptyDescription>
              </EmptyHeader>
              {!counts.wrong && <EmptyContent><Button asChild><a href="#/procvicovani/nove">Procvičit nové otázky</a></Button></EmptyContent>}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Otázka</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Body</TableHead>
                  <TableHead className="text-right">Chyb</TableHead>
                  <TableHead className="hidden sm:table-cell">Řada</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Naposledy špatně</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wrong.map((q) => {
                  const s = stats.get(q.id)!;
                  return (
                    <TableRow key={q.id} tabIndex={0} className="cursor-pointer outline-none focus-visible:bg-muted" onClick={() => setOpen(q)} onKeyDown={(e) => e.key === 'Enter' && setOpen(q)}>
                      <TableCell className="max-w-0 w-full">
                        <div className="flex items-center gap-3">
                          <Thumb q={q} />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">{q.text}</span>
                            <span className="truncate text-xs text-muted-foreground">{areaName(q.area)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="num hidden text-right text-muted-foreground md:table-cell">{q.points}</TableCell>
                      <TableCell className="num text-right text-negative">{s.wrong}×</TableCell>
                      <TableCell className="hidden sm:table-cell"><StreakDots streak={s.streak} /></TableCell>
                      <TableCell className="num hidden text-right text-muted-foreground lg:table-cell">{s.lastWrongAt ? formatDate(s.lastWrongAt) : '–'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {external.length > 0 && (
        <Card className="gap-2">
          <CardHeader>
            <CardTitle>Chyby z otázek autoškoly</CardTitle>
            <CardDescription>Vlastní otázky autoškoly z připouštěcího testu. V ministerské sadě nejsou, takže je nejde procvičovat, jen si je projít.</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent"><TableHead>Otázka</TableHead><TableHead className="hidden text-right sm:table-cell">Test</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {external.map((e, i) => (
                  <TableRow key={i} tabIndex={0} className="cursor-pointer outline-none focus-visible:bg-muted" onClick={() => setOpenExt(e)} onKeyDown={(k) => k.key === 'Enter' && setOpenExt(e)}>
                    <TableCell className="max-w-0 w-full">
                      <div className="flex items-center gap-3">
                        {e.snapshot.image ? <img src={e.snapshot.image} alt="" className="h-9 w-12 shrink-0 rounded object-cover" loading="lazy" /> : <span className="h-9 w-12 shrink-0 rounded bg-muted" />}
                        <span className="truncate">{e.snapshot.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="num hidden text-right whitespace-nowrap text-muted-foreground sm:table-cell">{formatDate(e.started_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <QuestionSheet question={open} onOpenChange={(o) => !o && setOpen(null)} />
      <Sheet open={!!openExt} onOpenChange={(o) => !o && setOpenExt(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Otázka autoškoly</SheetTitle>
            <SheetDescription>{openExt && `${openExt.title}, ${formatDate(openExt.started_at)}`}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">{openExt && <SnapshotView snapshot={openExt.snapshot} />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
