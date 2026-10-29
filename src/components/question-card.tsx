import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * Kostra karty s otázkou uprostřed obrazovky: hlavička, obsah a patička pevně na spodku karty.
 * Výška se řídí obsahem; posouvá se jen obsah, a to jen když se karta nevejde do okna.
 */
export function QuestionCard({ open, onOpenChange, header, footer, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fokus na kartu, ne na první odpověď: jinak by vypadala jako předvybraná */}
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }}
      >
        {open && (
          <>
            <div className="flex shrink-0 items-center gap-3 border-b px-6 py-4 pr-14">{header}</div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/50 px-6 py-3">{footer}</div>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Obrázek v kartě se přizpůsobí výšce okna, aby se otázka i všechny odpovědi vešly bez posouvání */
export const CARD_MEDIA = 'max-h-[min(380px,36dvh)] w-auto max-w-full self-start';
