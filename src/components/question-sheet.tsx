import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { QuestionView } from '@/components/question-view';
import type { Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { formatDate, MASTER_STREAK, type Status } from '@/lib/stats';
import { POP } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const STATUS_LABEL: Record<Status, string> = { unseen: 'Neviděná', wrong: 'V chybovníku', known: 'Umím' };

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={status === 'wrong' ? 'negative' : status === 'known' ? 'sign' : 'secondary'}>{STATUS_LABEL[status]}</Badge>;
}

/** Řada správných odpovědí po sobě: kolik ještě chybí k vyřazení z chybovníku */
export function StreakDots({ streak }: { streak: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${Math.min(streak, MASTER_STREAK)} z ${MASTER_STREAK} správně po sobě`}>
      {Array.from({ length: MASTER_STREAK }, (_, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{ transform: i < streak ? 'scale(1)' : 'scale(0.8)' }}
          transition={{ ...POP, delay: i * 0.06 }}
          className={cn('size-2 rounded-full transition-colors duration-200', i < streak ? 'bg-positive' : 'bg-unseen')}
        />
      ))}
    </span>
  );
}

/** Boční panel s detailem otázky (jako detail záznamu v CRM) */
export function QuestionSheet({ question, onOpenChange, selected }: { question: Question | null; onOpenChange: (open: boolean) => void; selected?: number | null }) {
  const { stats, status, areaName } = useData();
  const s = question ? stats.get(question.id) : undefined;
  return (
    <Sheet open={!!question} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        {question && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-center gap-2">
                <StatusBadge status={status(question)} />
                <span className="text-xs text-muted-foreground">{areaName(question.area)} · kód {question.code}</span>
              </div>
              <SheetTitle className="sr-only">{question.text}</SheetTitle>
              <SheetDescription className="sr-only">Detail otázky se správnou odpovědí</SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-6 p-4">
                <QuestionView question={question} reveal selected={selected} showMeta={false} />
                <Separator />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                  <div className="flex flex-col gap-0.5"><dt className="text-xs text-muted-foreground">Odpovězeno</dt><dd className="num">{s?.seen ?? 0}×</dd></div>
                  <div className="flex flex-col gap-0.5"><dt className="text-xs text-muted-foreground">Správně</dt><dd className="num">{s?.correct ?? 0}×</dd></div>
                  <div className="flex flex-col gap-0.5"><dt className="text-xs text-muted-foreground">Špatně</dt><dd className="num">{s?.wrong ?? 0}×</dd></div>
                  <div className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">Řada správně</dt><dd><StreakDots streak={s?.streak ?? 0} /></dd></div>
                </dl>
                {s?.lastAt && <p className="text-xs text-muted-foreground">Naposledy {formatDate(s.lastAt)}</p>}
              </div>
            </ScrollArea>
            <SheetFooter className="border-t sm:flex-row sm:justify-end">
              <Button variant="outline" asChild><a href={`#/procvicovani/${question.area}`} onClick={() => onOpenChange(false)}>Procvičit okruh</a></Button>
              {status(question) === 'wrong' && (
                <Button asChild><a href="#/procvicovani/chyby" onClick={() => onOpenChange(false)}>Opakovat chyby</a></Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
