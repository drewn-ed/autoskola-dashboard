import {
  ClipboardCheckIcon,
  DownloadIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  MonitorIcon,
  MoonIcon,
  RotateCcwIcon,
  SunIcon,
  TargetIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';
import { POP } from '@/lib/motion';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useData } from '@/lib/data';
import { useExamRunning } from '@/lib/exam-session';
import { SearchCommand } from '@/components/search-command';

/** Značka produktu: modrá informativní dopravní značka se silnicí, která se zužuje k obzoru */
export function ProductMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--sign)" />
      <rect x="3" y="3" width="26" height="26" rx="5" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path d="M9 25 L14.5 9 M23 25 L17.5 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 23v-2.5 M16 17.5v-2 M16 12.5v-1.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const STUDY = [
  { path: '', label: 'Přehled', icon: LayoutDashboardIcon },
  { path: 'procvicovani', label: 'Procvičování', icon: TargetIcon },
  { path: 'chybovnik', label: 'Chybovník', icon: RotateCcwIcon, count: true },
  { path: 'zkouska', label: 'Cvičná zkouška', icon: ClipboardCheckIcon, running: true },
];
const DATA = [
  { path: 'otazky', label: 'Otázky', icon: LibraryIcon },
  { path: 'historie', label: 'Historie testů', icon: HistoryIcon },
  { path: 'import', label: 'Import z eTestů', icon: DownloadIcon },
];

export function AppSidebar({ page }: { page: string }) {
  const { counts, bank } = useData();
  const { setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const examRunning = useExamRunning();

  const item = (n: { path: string; label: string; icon: typeof TargetIcon; count?: boolean; running?: boolean }) => (
    <SidebarMenuItem key={n.path}>
      {/* Zvýraznění aktivní stránky je jeden prvek, který mezi položkami "překlouže" */}
      {page === n.path && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-sidebar-accent"
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        />
      )}
      <SidebarMenuButton asChild isActive={page === n.path} tooltip={n.label} className="relative data-active:bg-transparent">
        <a href={`#/${n.path}`} onClick={() => setOpenMobile(false)}>
          <n.icon />
          <span>{n.label}</span>
        </a>
      </SidebarMenuButton>
      {n.count && counts.wrong > 0 && (
        <SidebarMenuBadge className="num">
          <motion.span key={counts.wrong} initial={{ transform: 'scale(1.35)', opacity: 0.4 }} animate={{ transform: 'scale(1)', opacity: 1 }} transition={POP}>
            {counts.wrong}
          </motion.span>
        </SidebarMenuBadge>
      )}
      {n.running && examRunning && (
        <SidebarMenuBadge className="gap-1.5 text-sign">
          <span className="size-1.5 animate-pulse rounded-full bg-sign" />běží
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <a href="#/" className="pressable flex items-center gap-2.5 rounded-md px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ProductMark className="size-8 shrink-0" />
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium text-foreground">Autoškola</span>
            <span className="truncate text-xs text-muted-foreground">Skupina B · {bank.questions.length} otázek</span>
          </span>
        </a>
        <SidebarMenu className="mt-2">
          <SidebarMenuItem><SearchCommand /></SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Učení</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{STUDY.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Data</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{DATA.map(item)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 px-3 pb-4">
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={theme}
          onValueChange={(v) => v && setTheme(v)}
          className="w-full group-data-[collapsible=icon]:hidden"
          aria-label="Vzhled"
        >
          <ToggleGroupItem value="light" aria-label="Světlý" className="flex-1"><SunIcon /></ToggleGroupItem>
          <ToggleGroupItem value="dark" aria-label="Tmavý" className="flex-1"><MoonIcon /></ToggleGroupItem>
          <ToggleGroupItem value="system" aria-label="Podle systému" className="flex-1"><MonitorIcon /></ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2.5 px-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sign-soft text-xs font-medium text-sign">DČ</span>
          <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm text-foreground">David Čečko</span>
            <span className="truncate text-xs text-muted-foreground">Autoškola Lišák</span>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
