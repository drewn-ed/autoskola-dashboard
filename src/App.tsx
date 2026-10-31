import { useRef } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { AppSidebar, ProductMark } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DataProvider, useRoute } from '@/lib/data';
import { EASE_OUT } from '@/lib/motion';
import Overview from '@/pages/Overview';
import Exam from '@/pages/Exam';
import Practice from '@/pages/Practice';
import WrongBook from '@/pages/WrongBook';
import Catalog from '@/pages/Catalog';
import History from '@/pages/History';
import TestDetailPage from '@/pages/TestDetail';
import Import from '@/pages/Import';

const TITLES: Record<string, string> = {
  '': 'Přehled',
  procvicovani: 'Procvičování',
  chybovnik: 'Chybovník',
  zkouska: 'Cvičná zkouška',
  otazky: 'Otázky',
  historie: 'Historie testů',
  import: 'Import z eTestů',
};

function Page({ page, param }: { page: string; param?: string }) {
  switch (page) {
    case '': return <Overview />;
    case 'zkouska': return <Exam />;
    case 'procvicovani': return <Practice mode={param} key={param ?? 'menu'} />;
    case 'chybovnik': return <WrongBook />;
    case 'otazky': return <Catalog />;
    case 'historie': return param ? <TestDetailPage id={Number(param)} key={param} /> : <History />;
    case 'import': return <Import failed={param === 'chyba'} />;
    default: return <p className="text-muted-foreground">Stránka nenalezena.</p>;
  }
}

function Loading({ error }: { error: string | null }) {
  if (error) return <div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">Nepodařilo se načíst data: {error}</div>;
  return (
    <div className="flex min-h-svh gap-6 bg-background p-6">
      <Skeleton className="hidden h-[calc(100svh-3rem)] w-60 md:block" />
      <div className="flex flex-1 flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

// Pořadí stránek v menu: obsah přijede ze směru, kterým se v menu posouváš
const ORDER = ['', 'procvicovani', 'chybovnik', 'zkouska', 'otazky', 'historie', 'import'];

function useGlideDirection(page: string, param?: string) {
  const prev = useRef({ key: '', index: 0, dir: 0 });
  const key = `${page}/${param ?? ''}`;
  if (prev.current.key !== key) {
    const index = ORDER.indexOf(page);
    // detail (např. konkrétní test) se otevírá "dovnitř", tedy zespodu
    const dir = page === ORDER[prev.current.index] && param ? 1 : Math.sign(index - prev.current.index);
    prev.current = { key, index, dir };
  }
  return prev.current.dir;
}

export default function App() {
  const [page = '', param] = useRoute();
  const dir = useGlideDirection(page, param);
  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={300}>
        <DataProvider fallback={(e) => <Loading error={e} />}>
          <SidebarProvider>
            <AppSidebar page={page} />
            <SidebarInset id="main" className="min-w-0 bg-background">
              {/* Na telefonu se postranní panel skládá do horní lišty */}
              <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-4 md:hidden">
                <SidebarTrigger aria-label="Otevřít menu" />
                <ProductMark className="size-6" />
                <span className="truncate text-sm font-medium">{TITLES[page] ?? 'Autoškola'}</span>
              </header>
              <motion.main
                key={`${page}/${param ?? ''}`}
                initial={{ opacity: 0, transform: `translateY(${dir * 14}px)` }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.24, ease: EASE_OUT }}
                className="mx-auto flex w-full max-w-[1240px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8"
              >
                <Page page={page} param={param} />
              </motion.main>
            </SidebarInset>
          </SidebarProvider>
        </DataProvider>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}
