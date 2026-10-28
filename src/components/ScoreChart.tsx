import { useState } from 'react';
import type { TestSummary } from '../api';
import { formatDate, PASS_SCORE } from '../stats';

const SOURCE_LABEL: Record<string, string> = { dashboard: 'Dashboard', etesty: 'eTesty', 'pripoustecí': 'Připouštěcí' };

/** Spojnicový graf skóre testů (přepočteno na 50 bodů) s čárou hranice 43 bodů */
export default function ScoreChart({ tests }: { tests: TestSummary[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 220, L = 34, R = 12, T = 12, B = 26;
  const pts = tests.map((t, i) => ({
    t,
    x: tests.length === 1 ? (L + W - R) / 2 : L + (i / (tests.length - 1)) * (W - L - R),
    v: (t.score / t.max_score) * 50,
  }));
  const y = (v: number) => T + (1 - v / 50) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${y(p.v)}`).join(' ');
  const h = hover != null ? pts[hover] : null;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Vývoj skóre testů">
        {[0, 10, 20, 30, 40, 50].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v) + 4} className="axis" textAnchor="end">{v}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(PASS_SCORE)} y2={y(PASS_SCORE)} className="threshold" />
        <text x={W - R} y={y(PASS_SCORE) - 5} className="axis threshold-label" textAnchor="end">hranice {PASS_SCORE} b.</text>
        <path d={line} className="series" />
        {pts.map((p, i) => (
          <circle
            key={p.t.id}
            cx={p.x}
            cy={y(p.v)}
            r={hover === i ? 6 : 4}
            className={p.v >= PASS_SCORE ? 'dot pass' : 'dot fail'}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => (location.hash = `/historie/${p.t.id}`)}
          />
        ))}
        {pts.length > 0 && (
          <>
            <text x={pts[0].x} y={H - 6} className="axis" textAnchor={pts.length === 1 ? 'middle' : 'start'}>
              {new Date(pts[0].t.started_at).toLocaleDateString('cs-CZ')}
            </text>
            {pts.length > 1 && (
              <text x={pts[pts.length - 1].x} y={H - 6} className="axis" textAnchor="end">
                {new Date(pts[pts.length - 1].t.started_at).toLocaleDateString('cs-CZ')}
              </text>
            )}
          </>
        )}
      </svg>
      {h && (
        <div className="tooltip" style={{ left: `${(h.x / W) * 100}%`, top: `${(y(h.v) / H) * 100}%` }}>
          <b>{h.t.score} / {h.t.max_score} b.</b>
          <div>{formatDate(h.t.started_at)}</div>
          <div className="muted">{SOURCE_LABEL[h.t.source]}</div>
        </div>
      )}
    </div>
  );
}
