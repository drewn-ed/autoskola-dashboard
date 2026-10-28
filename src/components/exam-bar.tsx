import { motion } from 'motion/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { go } from '@/lib/data';
import { PASS_SCORE, type AreaStat } from '@/lib/stats';
import { cn } from '@/lib/utils';

const fmt = (n: number) => n.toLocaleString('cs-CZ', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

/**
 * Prvek, který má jen tahle aplikace: 50 bodů ostré zkoušky rozdělených podle okruhů
 * (šířka úseku = kolik bodů okruh u zkoušky dává). Modře je odhad bodů, které dnes uhraješ,
 * svislá čára je hranice 43 bodů. Na první pohled je vidět, kde body ztrácíš.
 */
export function ExamBar({ areas }: { areas: AreaStat[] }) {
  const total = areas.reduce((s, a) => s + a.maxPoints, 0) || 50;
  const sorted = [...areas].sort((a, b) => b.maxPoints - a.maxPoints);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative pt-5">
        <div
          className="absolute top-0 -translate-x-full pr-1.5 text-xs whitespace-nowrap text-muted-foreground"
          style={{ left: `${(PASS_SCORE / total) * 100}%` }}
        >
          <span className="num">hranice {PASS_SCORE} b.</span>
        </div>
        <div className="flex h-10 w-full gap-[3px]">
          {sorted.map((a, i) => (
            <Tooltip key={a.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => go(`/procvicovani/${a.key}`)}
                  className={cn(
                    'relative h-full overflow-hidden bg-unseen transition-[filter] outline-none hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50',
                    i === 0 && 'rounded-l-md',
                    i === sorted.length - 1 && 'rounded-r-md',
                  )}
                  style={{ width: `${(a.maxPoints / total) * 100}%` }}
                  aria-label={`${a.name}: odhad ${fmt(a.expectedPoints)} z ${a.maxPoints} bodů`}
                >
                  <motion.span
                    className="absolute inset-y-0 left-0 bg-sign"
                    initial={{ width: 0 }}
                    animate={{ width: `${(a.expectedPoints / a.maxPoints) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="num">{a.name}: {fmt(a.expectedPoints)} z {a.maxPoints} b.</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="pointer-events-none absolute top-4 bottom-[-4px] w-px bg-foreground" style={{ left: `${(PASS_SCORE / total) * 100}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        {sorted.map((a) => {
          const lost = a.maxPoints - a.expectedPoints;
          return (
            <a key={a.key} href={`#/procvicovani/${a.key}`} className="flex min-w-0 flex-col rounded-md outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              <span className="text-muted-foreground">{a.name}</span>
              <span className="num text-foreground">
                {fmt(a.expectedPoints)} <span className="text-muted-foreground">/ {a.maxPoints} b.</span>
                {lost >= 3 && <span className="ml-1.5 text-xs text-negative">−{fmt(lost)}</span>}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
