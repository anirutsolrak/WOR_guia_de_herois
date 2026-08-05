import { Link } from 'react-router-dom';
import type { HeroRankItem } from '../lib/types';
import { factionColor } from '../lib/factionColors';

export function HeroRankRow({ item, rank, maxRate }: { item: HeroRankItem; rank: number; maxRate: number }) {
  const name = item.name_pt ?? item.name_en;
  const ringColor = factionColor(item.factions[0]?.title_en ?? 'Unnamed');
  const pct = Math.max(0, Math.min(100, (item.rate / maxRate) * 100));
  const medal = rank === 1 ? '#e0b23c' : rank === 2 ? '#c4ccd6' : rank === 3 ? '#cd7f32' : undefined;

  return (
    <Link
      to={`/heroi/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                 transition hover:border-accent/50 hover:bg-surface-2"
    >
      <span className="w-7 shrink-0 text-center font-display text-lg font-bold"
            style={{ color: medal ?? 'var(--color-muted)' }}>{rank}</span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2" style={{ borderColor: ringColor }}>
        {item.card_url && <img src={item.card_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display font-semibold text-fg">{name}</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {item.factions.map((f) => (
            <span key={f.title_en}
                  className="rounded-full border px-2 py-[1px] text-[11px]"
                  style={{ color: factionColor(f.title_en), borderColor: factionColor(f.title_en) }}>
              {f.title_pt ?? f.title_en}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-28 shrink-0 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-strong">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-muted">{item.rate.toFixed(1)}</span>
      </div>
    </Link>
  );
}
