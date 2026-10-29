import { useState } from 'react';
import type { Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { EXAM_LAYOUT } from '@/lib/stats';
import { cn } from '@/lib/utils';
import { pointsLabel } from './question-view';
import { QuestionDialog } from './question-sheet';

const DOT = { known: 'bg-sign', wrong: 'bg-negative', unseen: 'bg-unseen' } as const;

/** Mapa všech otázek: jeden čtvereček = jedna otázka, seřazeno podle okruhů. Klik otevře detail. */
export function QuestionMap() {
  const { bank, status } = useData();
  const [open, setOpen] = useState<Question | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {bank.areas.map((a) => {
        const qs = bank.questions.filter((q) => q.area === a.key);
        // V okruhu mají všechny otázky stejnou hodnotu; kdyby ne, ukáže se rozsah
        const pts = [...new Set(qs.map((q) => q.points))].sort((x, y) => x - y);
        const inExam = EXAM_LAYOUT[a.key] ?? 0;
        return (
          <div key={a.key} className="grid gap-x-4 gap-y-1.5 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-0.5">
              <a href={`#/procvicovani/${a.key}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                {a.name} <span className="num">({qs.length})</span>
              </a>
              <span className="num text-xs text-muted-foreground/80">
                {pts.length === 1 ? `${pointsLabel(pts[0])} za otázku` : `${pts[0]}–${pts[pts.length - 1]} body za otázku`}
                {inExam > 0 && pts.length === 1 && ` · v testu ${inExam}× = ${inExam * pts[0]} b`}
              </span>
            </div>
            <div className="flex flex-wrap gap-[3px]">
              {qs.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setOpen(q)}
                  title={q.text}
                  aria-label={q.text}
                  className={cn('size-[9px] rounded-[2px] transition-transform duration-150 ease-snappy outline-none hover:scale-150 focus-visible:scale-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-90', DOT[status(q)])}
                />
              ))}
            </div>
          </div>
        );
      })}
      <QuestionDialog question={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
