import { useEffect, useState } from 'react';
import { EyeIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CARD_MEDIA, QuestionCard } from '@/components/question-card';
import { pointsLabel, QuestionView } from '@/components/question-view';
import { api, type Question } from '@/lib/api';
import { useData } from '@/lib/data';
import { ANSWER_KEYS, MASTER_STREAK, type Status } from '@/lib/stats';
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

/**
 * Karta s otázkou uprostřed obrazovky (mapa otázek, katalog, chybovník, hledání).
 * Otázku, kterou ještě neumíš (neviděná nebo v chybovníku), nejdřív zkusíš sám a odpověď se uloží
 * jako při procvičování. Otázka, kterou umíš, rovnou ukáže správnou odpověď.
 */
export function QuestionDialog({ question, onOpenChange }: { question: Question | null; onOpenChange: (open: boolean) => void }) {
  const { stats, status, areaName, refresh } = useData();
  // Stav se zakládá při otevření otázky, aby se po uložení odpovědi (a změně statusu) nepřepnul režim
  const [ask, setAsk] = useState<{ id: number; asking: boolean; review: boolean; selected: number | null; shownAt: number; streakAfter: number } | null>(null);
  if (question && ask?.id !== question.id) {
    const st = status(question);
    setAsk({ id: question.id, asking: st !== 'known', review: st === 'wrong', selected: null, shownAt: Date.now(), streakAfter: 0 });
  }
  const cur = question && ask?.id === question.id ? ask : null;
  const s = question ? stats.get(question.id) : undefined;
  const waiting = !!cur?.asking && cur.selected == null;

  const answer = (answerId: number) => {
    if (!question || !cur || !waiting) return;
    const ok = answerId === question.correct;
    setAsk({ ...cur, selected: answerId, streakAfter: ok ? (s?.streak ?? 0) + 1 : 0 });
    api.answer({ question_id: question.id, chosen_answer_id: answerId, time_ms: Date.now() - cur.shownAt, mode: cur.review ? 'review' : 'practice' })
      .then(refresh, () => toast.error('Odpověď se nepodařilo uložit. Běží aplikace?'));
  };

  useEffect(() => {
    if (!waiting || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const li = ANSWER_KEYS.indexOf(e.key);
      if (li >= 0 && question.answers[li]) answer(question.answers[li].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const isCorrect = !!question && cur?.selected === question.correct;
  const title = !cur?.asking ? 'Správná odpověď' : waiting ? 'Vyber odpověď' : isCorrect ? 'Správně' : 'Špatně';

  return (
    <QuestionCard
      open={!!question}
      onOpenChange={onOpenChange}
      header={question && (
        <>
          <StatusBadge status={status(question)} />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="num truncate text-xs">{areaName(question.area)} · {pointsLabel(question.points)} · kód {question.code}</DialogDescription>
          </div>
        </>
      )}
      footer={question && (
        <>
          <dl className="num flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-1"><dt>Odpovězeno</dt><dd className="text-foreground">{s?.seen ?? 0}×</dd></div>
            <div className="flex gap-1"><dt>správně</dt><dd className="text-foreground">{s?.correct ?? 0}×</dd></div>
            <div className="flex gap-1"><dt>špatně</dt><dd className="text-foreground">{s?.wrong ?? 0}×</dd></div>
            <div className="flex items-center gap-1.5"><dt>řada</dt><dd><StreakDots streak={s?.streak ?? 0} /></dd></div>
          </dl>
          <div className="flex shrink-0 gap-2">
            {waiting ? (
              <Button variant="ghost" onClick={() => setAsk({ ...cur!, asking: false })}>
                <EyeIcon data-icon="inline-start" />Ukázat odpověď
              </Button>
            ) : (
              <Button variant="outline" asChild><a href={`#/procvicovani/${question.area}`} onClick={() => onOpenChange(false)}>Procvičit okruh</a></Button>
            )}
          </div>
        </>
      )}
    >
      {question && (
        <div className="flex flex-col gap-4">
          <QuestionView
            question={question}
            reveal={!waiting}
            selected={cur?.selected}
            onSelect={waiting ? answer : undefined}
            showMeta={false}
            mediaClassName={CARD_MEDIA}
          />
          <AnimatePresence>
            {cur?.asking && cur.selected != null && (
              <motion.p
                initial={{ opacity: 0, transform: 'translateY(8px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.2 }}
                className={cn('rounded-lg px-4 py-3 text-sm', isCorrect ? 'bg-positive-soft text-positive-ink' : 'bg-negative-soft text-negative-ink')}
              >
                <b className="font-medium">{isCorrect ? 'Správně.' : 'Špatně.'}</b>{' '}
                {isCorrect
                  ? cur.review ? (cur.streakAfter >= MASTER_STREAK ? 'Otázka vypadla z chybovníku.' : `Ještě ${MASTER_STREAK - cur.streakAfter}× a vypadne z chybovníku.`) : 'Odpověď se uložila do statistik.'
                  : cur.review ? 'Řada správných odpovědí začíná znovu.' : 'Otázka šla do chybovníku.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </QuestionCard>
  );
}
