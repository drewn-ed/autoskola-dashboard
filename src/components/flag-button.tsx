import { CircleHelpIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useData } from '@/lib/data';
import { cn } from '@/lib/utils';

/**
 * Přepínač „Nerozumím“: uloží otázku mezi ty, kterým nerozumíš, i když jsi ji dal správně.
 * Se správností odpovědi nesouvisí, z přehledu zmizí, až ho zase vypneš.
 */
export function FlagButton({ questionId, compact = false, shortcut = false, className }: {
  questionId: number;
  /** na úzké obrazovce jen ikona */
  compact?: boolean;
  /** ukázat nápovědu klávesy N */
  shortcut?: boolean;
  className?: string;
}) {
  const { flags, toggleFlag } = useData();
  const on = flags.has(questionId);
  const toggle = () => {
    toggleFlag(questionId);
    if (!on) toast('Uloženo mezi otázky, kterým nerozumíš', { action: { label: 'Zobrazit', onClick: () => { location.hash = '#/nerozumim'; } } });
  };
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={on}
      aria-label="Nerozumím"
      title={on ? 'Odebrat z otázek, kterým nerozumíš' : 'Uložit mezi otázky, kterým nerozumíš'}
      onClick={toggle}
      className={cn(on && 'border-unclear/50 bg-unclear-soft text-unclear-ink hover:bg-unclear-soft hover:text-unclear-ink dark:border-unclear/40 dark:bg-unclear-soft', className)}
    >
      <CircleHelpIcon data-icon="inline-start" className={cn(on && 'text-unclear')} />
      <span className={cn(compact && 'sr-only sm:not-sr-only')}>Nerozumím</span>
      {shortcut && <Kbd className="ml-0.5 hidden md:inline-flex">N</Kbd>}
    </Button>
  );
}
