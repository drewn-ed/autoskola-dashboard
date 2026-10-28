import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';

/** Stejné křivky jako --ease-snappy / --ease-move v index.css */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_MOVE = [0.77, 0, 0.175, 1] as const;
/** Pružina pro "vyskočení" malých prvků (ikona odpovědi, tečka řady) */
export const POP = { type: 'spring', duration: 0.35, bounce: 0.3 } as const;

/**
 * Číslo, které se napočítá od nuly. Jen pro vzácné okamžiky (výsledek zkoušky, konec kola),
 * ne pro data, která člověk čte denně. Při omezeném pohybu ukáže hodnotu rovnou.
 */
export function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => { el.textContent = String(Math.round(v)); },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);
  return <span ref={ref}>{reduce ? value : 0}</span>;
}

/** Oslava úspěchu (splněná zkouška, bezchybné kolo). canvas-confetti sám respektuje omezený pohyb. */
export function celebrate() {
  const colors = ['#1d5fbf', '#247b50', '#ffffff', '#c4242a'];
  const base = { particleCount: 70, spread: 70, startVelocity: 45, ticks: 180, colors, disableForReducedMotion: true };
  confetti({ ...base, angle: 60, origin: { x: 0.15, y: 0.75 } });
  confetti({ ...base, angle: 120, origin: { x: 0.85, y: 0.75 } });
}
