import { useEffect, useRef } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CARD_MEDIA, QuestionCard } from '@/components/question-card';
import { QuestionView, SnapshotView } from '@/components/question-view';
import type { TestItem } from '@/lib/api';
import { useData } from '@/lib/data';
import { EASE_OUT } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * Otázka z vyhodnoceného testu jako karta uprostřed obrazovky. Šipkami (tlačítky i klávesami)
 * se jde po otázkách testu jako v průvodci, aniž by se karta zavírala.
 */
export function TestQuestionDialog({ items, index, onIndexChange }: {
  items: TestItem[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const { byId, areaName } = useData();
  const it = index != null ? items[index] : null;
  // Směr posledního kroku, aby obsah vjel ze správné strany
  const dir = useRef(1);
  const prevIndex = useRef(index);
  if (prevIndex.current !== index) {
    dir.current = index != null && prevIndex.current != null && index < prevIndex.current ? -1 : 1;
    prevIndex.current = index;
  }

  const go = (to: number) => to >= 0 && to < items.length && onIndexChange(to);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const q = it?.question_id != null ? byId.get(it.question_id) : null;
  const points = (q ? q.points : it?.snapshot?.points) ?? 0;

  return (
    <QuestionCard
      open={!!it}
      onOpenChange={(o) => !o && onIndexChange(null)}
      header={it && (
        <>
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-white', it.is_correct ? 'bg-positive' : 'bg-negative')}>
            {it.is_correct ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="num">Otázka {it.pos} · {it.is_correct ? 'správně' : 'špatně'}</DialogTitle>
            <DialogDescription className="num truncate text-xs">
              {q ? areaName(q.area) : it.snapshot?.category || 'Otázka autoškoly'}
              {it.time_ms != null && ` · ${Math.round(it.time_ms / 1000)} s na odpověď`}
            </DialogDescription>
          </div>
          <Badge variant={it.is_correct ? 'positive' : 'negative'} className="num ml-auto">
            {it.is_correct ? '+' : '−'}{points} b
          </Badge>
        </>
      )}
      footer={it && (
        <>
          <Button variant="outline" onClick={() => go(index! - 1)} disabled={index === 0}>
            <ArrowLeftIcon data-icon="inline-start" />Předchozí
          </Button>
          <span className="num text-sm text-muted-foreground">{index! + 1} z {items.length}</span>
          <Button variant="outline" onClick={() => go(index! + 1)} disabled={index === items.length - 1}>
            Další<ArrowRightIcon data-icon="inline-end" />
          </Button>
        </>
      )}
    >
      {it && (
        <motion.div
          key={it.pos}
          initial={{ opacity: 0, transform: `translateX(${dir.current * 20}px)` }}
          animate={{ opacity: 1, transform: 'translateX(0px)' }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          {q ? <QuestionView question={q} reveal selected={it.chosen_answer_id} mediaClassName={CARD_MEDIA} /> : it.snapshot && <SnapshotView snapshot={it.snapshot} />}
          {it.chosen_answer_id == null && !it.snapshot?.answers.some((a) => a.chosen) && (
            <p className="mt-3 text-sm text-negative-ink dark:text-negative">Tahle otázka zůstala bez odpovědi.</p>
          )}
        </motion.div>
      )}
    </QuestionCard>
  );
}
