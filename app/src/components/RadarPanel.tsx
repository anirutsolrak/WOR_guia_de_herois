import type { DungeonRate, Dungeon } from '../lib/types';
import { RadarChart } from './RadarChart';

export function RadarPanel({ rates, dungeons }: { rates: DungeonRate[]; dungeons: Dungeon[] }) {
  const ordered = dungeons.slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (ordered.length === 0) return null;

  const rateMap = new Map(rates.map((r) => [r.dungeon_id, r.rate]));
  const values = ordered.map((d) => rateMap.get(d.id) ?? 0);
  const labels = ordered.map((d) => String(d.index ?? ''));
  const maxRate = Math.max(50, ...values);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted">
        Conteúdos Ideais
      </h2>
      <div className="flex justify-center">
        <RadarChart values={values} labels={labels} max={maxRate} size={280} />
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-subtle">
        {ordered.map((d) => (
          <li key={d.id} className="flex gap-1.5">
            <span className="w-4 shrink-0 text-right text-muted">{d.index}</span>
            <span className="truncate">{d.name_pt ?? d.name_en}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
