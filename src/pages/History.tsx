import { DownloadIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TestSummary } from '@/lib/api';
import { go, useData } from '@/lib/data';
import { formatDate, formatDuration, PASS_SCORE } from '@/lib/stats';

export const SOURCE_LABEL: Record<string, string> = { dashboard: 'Dashboard', etesty: 'eTesty', 'pripoustecí': 'Připouštěcí' };
export const passedTest = (t: TestSummary) => t.score >= (t.pass_score ?? PASS_SCORE);

export function ResultBadge({ ok }: { ok: boolean }) {
  return <Badge variant={ok ? 'positive' : 'negative'}>{ok ? 'Splněno' : 'Nesplněno'}</Badge>;
}

export function TestsTable({ tests }: { tests: TestSummary[] }) {
  if (!tests.length) {
    return (
      <Empty className="border border-dashed py-8">
        <EmptyHeader><EmptyTitle>Zatím žádné testy</EmptyTitle><EmptyDescription>Udělej cvičnou zkoušku nebo naimportuj test z eTestů.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button asChild><a href="#/zkouska">Spustit cvičnou zkoušku</a></Button></EmptyContent>
      </Empty>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Datum</TableHead>
          <TableHead>Test</TableHead>
          <TableHead>Zdroj</TableHead>
          <TableHead className="text-right">Body</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Správně</TableHead>
          <TableHead className="hidden text-right md:table-cell">Čas</TableHead>
          <TableHead className="text-right">Výsledek</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tests.map((t) => (
          <TableRow
            key={t.id}
            tabIndex={0}
            onClick={() => go(`/historie/${t.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && go(`/historie/${t.id}`)}
            className="h-11 cursor-pointer outline-none focus-visible:bg-muted"
          >
            <TableCell className="num text-muted-foreground">{formatDate(t.started_at)}</TableCell>
            <TableCell className="max-w-[280px] truncate">{t.title}</TableCell>
            <TableCell className="text-muted-foreground">{SOURCE_LABEL[t.source]}</TableCell>
            <TableCell className="num text-right"><span className="font-medium">{t.score}</span><span className="text-muted-foreground"> / {t.max_score}</span></TableCell>
            <TableCell className="num hidden text-right text-muted-foreground sm:table-cell">{t.correct_count} / {t.total}</TableCell>
            <TableCell className="num hidden text-right text-muted-foreground md:table-cell">{formatDuration(t.duration_s)}</TableCell>
            <TableCell className="text-right"><ResultBadge ok={passedTest(t)} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function History() {
  const { tests } = useData();
  const passed = tests.filter(passedTest).length;
  const best = tests.reduce((m, t) => Math.max(m, Math.round((t.score / t.max_score) * 50)), 0);
  return (
    <>
      <PageHeader
        title="Historie testů"
        description={tests.length ? <span className="num">{tests.length} testů, splněno {passed}. Nejlepší výsledek {best} z 50 bodů.</span> : 'Všechny tvoje testy z dashboardu i z eTestů na jednom místě.'}
        actions={<Button variant="outline" asChild><a href="#/import"><DownloadIcon data-icon="inline-start" />Importovat z eTestů</a></Button>}
      />
      <Card className="py-2">
        <CardContent className="px-2 sm:px-4">
          <TestsTable tests={tests} />
        </CardContent>
      </Card>
    </>
  );
}
