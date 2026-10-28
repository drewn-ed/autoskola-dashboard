import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheckIcon, FileQuestionIcon, HistoryIcon, LayoutDashboardIcon, LibraryIcon, RotateCcwIcon, SearchIcon, TargetIcon } from 'lucide-react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { QuestionSheet, StatusBadge } from '@/components/question-sheet';
import type { Question } from '@/lib/api';
import { go, useData } from '@/lib/data';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const PAGES = [
  { path: '/', label: 'Přehled', icon: LayoutDashboardIcon },
  { path: '/procvicovani', label: 'Procvičování', icon: TargetIcon },
  { path: '/procvicovani/chyby', label: 'Opakovat chyby', icon: RotateCcwIcon },
  { path: '/zkouska', label: 'Cvičná zkouška', icon: ClipboardCheckIcon },
  { path: '/otazky', label: 'Otázky', icon: LibraryIcon },
  { path: '/historie', label: 'Historie testů', icon: HistoryIcon },
];

/** Globální hledání (⌘K): stránky a libovolná otázka ze sady podle textu, odpovědi nebo kódu */
export function SearchCommand() {
  const { bank, status, areaName } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<Question | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    return bank.questions
      .filter((x) => norm(x.text).includes(q) || x.code.toLowerCase().includes(q) || x.answers.some((a) => norm(a.text).includes(q)))
      .slice(0, 30);
  }, [bank, query]);
  const pages = PAGES.filter((p) => !query || norm(p.label).includes(norm(query)));

  return (
    <>
      <SidebarMenuButton onClick={() => setOpen(true)} tooltip="Hledat (⌘K)" className="text-muted-foreground">
        <SearchIcon />
        <span>Hledat</span>
        <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘K</Kbd>
      </SidebarMenuButton>
      <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }} title="Hledat" description="Hledej otázku podle textu, odpovědi nebo kódu, nebo přejdi na stránku.">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Hledat otázku nebo stránku…" />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>{query.trim().length < 2 ? 'Napiš aspoň dvě písmena.' : 'Nic nenalezeno.'}</CommandEmpty>
            {pages.length > 0 && (
              <CommandGroup heading="Stránky">
                {pages.map((p) => (
                  <CommandItem key={p.path} value={`page-${p.path}`} onSelect={() => { go(p.path); setOpen(false); setQuery(''); }}>
                    <p.icon />{p.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.length > 0 && (
              <CommandGroup heading={`Otázky (${results.length === 30 ? '30+' : results.length})`}>
                {results.map((q) => (
                  <CommandItem key={q.id} value={`q-${q.id}`} onSelect={() => { setDetail(q); setOpen(false); }}>
                    <FileQuestionIcon />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{q.text}</span>
                      <span className="truncate text-xs text-muted-foreground">{areaName(q.area)} · {q.code}</span>
                    </span>
                    <StatusBadge status={status(q)} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
      <QuestionSheet question={detail} onOpenChange={(o) => !o && setDetail(null)} />
    </>
  );
}
