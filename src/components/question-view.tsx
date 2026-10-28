import { CheckIcon, XIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { mediaUrl, type Media, type Question, type Snapshot } from '@/lib/api';
import { useData } from '@/lib/data';
import { LETTERS } from '@/lib/stats';
import { cn } from '@/lib/utils';

export function MediaView({ media, className }: { media: Media; className?: string }) {
  return media.type === 'video' ? (
    <video className={cn('rounded-lg bg-black', className)} src={mediaUrl(media)} controls playsInline preload="metadata" />
  ) : (
    <img className={cn('rounded-lg', className)} src={mediaUrl(media)} alt="" loading="lazy" />
  );
}

export const pointsLabel = (n: number) => `${n} ${n === 1 ? 'bod' : n < 5 ? 'body' : 'bodů'}`;

type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim';

function AnswerOption({ index, state, onClick, children }: { index: number; state: AnswerState; onClick?: () => void; children: React.ReactNode }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      animate={state === 'wrong' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-left text-[15px] leading-relaxed transition-colors outline-none',
        onClick && 'cursor-pointer hover:border-foreground/30 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40',
        state === 'selected' && 'border-foreground bg-muted/60',
        state === 'correct' && 'border-positive bg-positive-soft text-positive-ink',
        state === 'wrong' && 'border-negative bg-negative-soft text-negative-ink',
        state === 'dim' && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'mt-px grid size-6 shrink-0 place-items-center rounded-md border text-xs font-medium text-muted-foreground transition-colors',
          state === 'selected' && 'border-foreground bg-foreground text-background',
          state === 'correct' && 'border-positive bg-positive text-white',
          state === 'wrong' && 'border-negative bg-negative text-white',
        )}
      >
        {state === 'correct' ? <CheckIcon className="size-3.5" /> : state === 'wrong' ? <XIcon className="size-3.5" /> : LETTERS[index]}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">{children}</span>
    </Comp>
  );
}

type Props = {
  question: Question;
  selected?: number | null;
  onSelect?: (answerId: number) => void;
  /** ukázat správnou odpověď (a případně chybu) */
  reveal?: boolean;
  showMeta?: boolean;
};

export function QuestionView({ question: q, selected, onSelect, reveal, showMeta = true }: Props) {
  const { areaName } = useData();
  return (
    <div className="flex flex-col gap-4">
      {showMeta && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{areaName(q.area)}</Badge>
          <Badge variant="outline" className="num">{pointsLabel(q.points)}</Badge>
          <span>Kód {q.code}</span>
        </div>
      )}
      <h2 className="text-lg leading-snug font-medium text-pretty whitespace-pre-line text-foreground md:text-xl">{q.text}</h2>
      {q.note && <p className="text-sm text-muted-foreground">{q.note}</p>}
      {q.media && <MediaView key={q.id} media={q.media} className="max-h-[380px] w-auto max-w-full self-start" />}
      <div className="flex flex-col gap-2" role="list">
        {q.answers.map((a, i) => {
          const isSel = selected === a.id;
          const isCorrect = a.id === q.correct;
          const state: AnswerState = reveal
            ? isCorrect ? 'correct' : isSel ? 'wrong' : 'dim'
            : isSel ? 'selected' : 'idle';
          return (
            <div role="listitem" key={a.id}>
              <AnswerOption index={i} state={state} onClick={onSelect && !reveal ? () => onSelect(a.id) : undefined}>
                {a.media && <MediaView media={a.media} className="max-w-[260px]" />}
                {a.text && <span>{a.text}</span>}
              </AnswerOption>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Otázka mimo ministerskou sadu (uložená kopie z importovaného testu) */
export function SnapshotView({ snapshot: s }: { snapshot: Snapshot }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {s.category && <Badge variant="secondary">{s.category}</Badge>}
        {s.points != null && <Badge variant="outline">{pointsLabel(s.points)}</Badge>}
        {s.code && <span>Kód {s.code}</span>}
      </div>
      <h2 className="text-lg leading-snug font-medium text-foreground">{s.text}</h2>
      {s.image && <img className="max-h-[320px] max-w-full self-start rounded-lg" src={s.image} alt="" loading="lazy" />}
      <div className="flex flex-col gap-2">
        {s.answers.map((a, i) => (
          <AnswerOption key={i} index={i} state={a.correct ? 'correct' : a.chosen ? 'wrong' : 'dim'}>
            <span>{a.text}</span>
          </AnswerOption>
        ))}
      </div>
    </div>
  );
}
