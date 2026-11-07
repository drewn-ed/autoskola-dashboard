import { useMemo, useState } from 'react';
import { PlayIcon, XIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { QuestionDialog, StatusBadge } from '@/components/question-sheet';
import { Thumb } from '@/pages/Catalog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { formatDate } from '@/lib/stats';

export default function Unclear() {
  const { byId, flags, toggleFlag, status, areaName } = useData();
  const [open, setOpen] = useState<Question | null>(null);

  // Naposledy označené nahoře
  const questions = useMemo(
    () => [...flags].sort((a, b) => b[1].localeCompare(a[1])).flatMap(([id]) => byId.get(id) ?? []),
    [flags, byId],
  );

  return (
    <>
      <PageHeader
        title="Nerozumím"
        description="Otázky, u kterých jsi klikl na „Nerozumím“, ať jsi je dal správně, nebo špatně. Až otázce porozumíš, odeber ji odsud."
        actions={questions.length > 0 && <Button size="lg" asChild><a href="#/procvicovani/nerozumim"><PlayIcon data-icon="inline-start" />Projít otázky</a></Button>}
      />

      <Card className="gap-2">
        <CardHeader>
          <CardTitle className="num">{questions.length} {questions.length === 1 ? 'otázka' : questions.length < 5 && questions.length > 0 ? 'otázky' : 'otázek'}</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-4">
          {questions.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Zatím tu nic není</EmptyTitle>
                <EmptyDescription>Když po odpovědi nevíš proč, klikni na „Nerozumím“ (při procvičování stačí klávesa N). Otázka se uloží sem.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent><Button asChild><a href="#/procvicovani">Procvičovat</a></Button></EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Otázka</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Body</TableHead>
                  <TableHead className="hidden sm:table-cell">Stav</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Uloženo</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((q) => (
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
                    <TableCell className="hidden sm:table-cell"><StatusBadge status={status(q)} /></TableCell>
                    <TableCell className="num hidden text-right whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(flags.get(q.id)!)}</TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Odebrat z otázek, kterým nerozumíš"
                        title="Už rozumím, odebrat"
                        onClick={(e) => { e.stopPropagation(); toggleFlag(q.id); }}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <XIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <QuestionDialog question={open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
