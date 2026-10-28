import { useDeferredValue, useMemo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon, SearchIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { QuestionSheet, StatusBadge } from '@/components/question-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mediaUrl, type Question } from '@/lib/api';
import { useData } from '@/lib/data';
import type { Status } from '@/lib/stats';
import { cn } from '@/lib/utils';

const PAGE = 40;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Náhled obrázku nebo videa otázky v řádku tabulky */
export function Thumb({ q }: { q: Question }) {
  if (q.media?.type === 'image') return <img src={mediaUrl(q.media)} alt="" loading="lazy" className="h-9 w-12 shrink-0 rounded bg-muted object-contain" />;
  if (q.media?.type === 'video') return <span className="grid h-9 w-12 shrink-0 place-items-center rounded bg-muted text-muted-foreground"><PlayIcon className="size-3.5" /></span>;
  return null;
}

export default function Catalog() {
  const { bank, status, areaName } = useData();
  const [view, setView] = useState<'list' | 'gallery'>('list');
  const [area, setArea] = useState('all');
  const [st, setSt] = useState<'all' | Status>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Question | null>(null);
  const deferred = useDeferredValue(search);

  const filtered = useMemo(() => {
    const s = norm(deferred.trim());
    return bank.questions.filter((q) =>
      (area === 'all' || q.area === area) &&
      (st === 'all' || status(q) === st) &&
      (view === 'list' || q.media?.type === 'image') &&
      (!s || norm(q.text).includes(s) || q.answers.some((a) => norm(a.text).includes(s)) || q.code.toLowerCase().includes(s)));
  }, [bank, status, area, st, deferred, view]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, (cur + 1) * PAGE);
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };

  return (
    <>
      <PageHeader
        title="Otázky"
        description={`Kompletní sada ministerstva pro skupinu B (${bank.questions.length.toLocaleString('cs-CZ')} otázek). Klikni na otázku a uvidíš správnou odpověď a svoji historii.`}
      />
      <Card className="gap-3">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder="Hledat v otázkách, odpovědích nebo kódu" className="pl-8" aria-label="Hledat" />
            </div>
            <Select value={area} onValueChange={reset(setArea)}>
              <SelectTrigger className="w-[210px]" aria-label="Okruh"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Všechny okruhy</SelectItem>
                  {bank.areas.map((a) => <SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={st} onValueChange={(v) => reset(setSt)(v as 'all' | Status)}>
              <SelectTrigger className="w-[160px]" aria-label="Stav"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Jakýkoli stav</SelectItem>
                  <SelectItem value="unseen">Neviděné</SelectItem>
                  <SelectItem value="wrong">V chybovníku</SelectItem>
                  <SelectItem value="known">Umím</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => { reset(setView)(v as 'list' | 'gallery'); if (v === 'gallery' && area === 'all') setArea('znacky'); }}>
              <TabsList>
                <TabsTrigger value="list">Seznam</TabsTrigger>
                <TabsTrigger value="gallery">Galerie obrázků</TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="num text-sm text-muted-foreground">{filtered.length.toLocaleString('cs-CZ')} otázek</span>
          </div>
        </CardHeader>
        <CardContent className={view === 'list' ? 'px-2 sm:px-4' : undefined}>
          {filtered.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader><EmptyTitle>Nic nenalezeno</EmptyTitle><EmptyDescription>Zkus jiné slovo nebo zruš filtr okruhu či stavu.</EmptyDescription></EmptyHeader>
            </Empty>
          ) : view === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Otázka</TableHead>
                  <TableHead className="hidden lg:table-cell">Okruh</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Body</TableHead>
                  <TableHead className="text-right">Stav</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((q) => (
                  <TableRow key={q.id} tabIndex={0} className="cursor-pointer outline-none focus-visible:bg-muted" onClick={() => setOpen(q)} onKeyDown={(e) => e.key === 'Enter' && setOpen(q)}>
                    <TableCell className="max-w-0 w-full">
                      <div className="flex items-center gap-3">
                        <Thumb q={q} />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{q.text}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            <span className="lg:hidden">{areaName(q.area)} · </span>kód {q.code}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{areaName(q.area)}</TableCell>
                    <TableCell className="num hidden text-right text-muted-foreground md:table-cell">{q.points}</TableCell>
                    <TableCell className="text-right"><StatusBadge status={status(q)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
              {shown.map((q) => {
                const s = status(q);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setOpen(q)}
                    className={cn(
                      'group pressable flex flex-col gap-2 rounded-lg border bg-card p-2.5 text-left outline-none hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50',
                      s === 'known' && 'border-b-2 border-b-sign',
                      s === 'wrong' && 'border-b-2 border-b-negative',
                    )}
                  >
                    <img src={mediaUrl(q.media!)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded object-contain transition-transform duration-200 ease-snappy [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]" />
                    <span className="line-clamp-2 text-xs text-muted-foreground">{q.answers.find((a) => a.id === q.correct)?.text}</span>
                  </button>
                );
              })}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <span className="num mr-2 text-sm text-muted-foreground">Strana {cur + 1} z {pages}</span>
              <Button variant="outline" size="icon" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Předchozí strana"><ChevronLeftIcon /></Button>
              <Button variant="outline" size="icon" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Další strana"><ChevronRightIcon /></Button>
            </div>
          )}
        </CardContent>
      </Card>
      <QuestionSheet question={open} onOpenChange={(o) => !o && setOpen(null)} />
    </>
  );
}
