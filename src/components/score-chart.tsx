import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { TestSummary } from '@/lib/api';
import { go } from '@/lib/data';
import { PASS_SCORE } from '@/lib/stats';

const config = { body: { label: 'Body', color: 'var(--sign)' } } satisfies ChartConfig;
const SOURCE: Record<string, string> = { dashboard: 'Dashboard', etesty: 'eTesty', 'pripoustecí': 'Připouštěcí test', ministerstvo: 'Ministerstvo' };

/** Jedna řada (body přepočtené na 50), hranice 43 bodů jako referenční čára, žádná legenda */
export function ScoreChart({ tests }: { tests: TestSummary[] }) {
  const data = [...tests].reverse().map((t, i) => ({
    i,
    id: t.id,
    body: Math.round((t.score / t.max_score) * 50),
    datum: new Date(t.started_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
    zdroj: SOURCE[t.source],
  }));
  return (
    <ChartContainer config={config} className="aspect-auto h-full min-h-[210px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="datum" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis domain={[0, 50]} ticks={[0, 10, 20, 30, 43, 50]} tickLine={false} axisLine={false} width={44} />
        <ReferenceLine y={PASS_SCORE} stroke="var(--foreground)" strokeDasharray="4 4" strokeOpacity={0.5} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={(_, p) => `${p[0]?.payload.datum} · ${p[0]?.payload.zdroj}`} />}
        />
        <Line
          dataKey="body"
          type="linear"
          stroke="var(--color-body)"
          strokeWidth={2}
          dot={{ r: 3.5, fill: 'var(--color-body)', strokeWidth: 0 }}
          activeDot={{ r: 5, onClick: (_: unknown, e: unknown) => go(`/historie/${(e as { payload: { id: number } }).payload.id}`), style: { cursor: 'pointer' } }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
