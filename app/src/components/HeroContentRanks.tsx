import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Dungeon, DungeonRate } from '../lib/types';

// Os dados trazem uma linha por herói × modo, então "sem rank" nunca vem da ausência
// de linha: vem de um rate irrisório. Abaixo de 1 a posição não informa nada útil.
const RATE_MINIMO = 1;

export function HeroContentRanks({ rates, dungeons }: { rates: DungeonRate[]; dungeons: Dungeon[] }) {
  const [mostrarSemRank, setMostrarSemRank] = useState(false);
  const byDungeon = new Map(rates.map((r) => [r.dungeon_id, r]));

  const ranked = dungeons
    .filter((d) => (byDungeon.get(d.id)?.rate ?? -1) >= RATE_MINIMO)
    .sort((a, b) => byDungeon.get(a.id)!.rank - byDungeon.get(b.id)!.rank);

  const unranked = dungeons
    .filter((d) => (byDungeon.get(d.id)?.rate ?? -1) < RATE_MINIMO)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  return (
    <div className="space-y-1.5">
      {ranked.map((d) => {
        const r = byDungeon.get(d.id)!;
        const pct = r.total > 0 ? Math.max(0, Math.min(100, (1 - (r.rank - 1) / r.total) * 100)) : 0;
        return (
          <Link
            key={d.id}
            to={`/modo/${d.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                       transition hover:border-accent/50 hover:bg-surface-2"
          >
            {d.icon_url && <img src={d.icon_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{d.name_pt ?? d.name_en}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              #{r.rank} de {r.total}
            </span>
            <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-border-strong">
              <div data-testid={`rank-bar-${d.id}`}
                   className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                   style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}

      {unranked.length > 0 && (
        <button
          type="button"
          aria-expanded={mostrarSemRank}
          onClick={() => setMostrarSemRank((v) => !v)}
          className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2
                     text-xs text-muted transition hover:border-accent/50 hover:text-fg"
        >
          {mostrarSemRank
            ? 'Ocultar conteúdos sem rank'
            : unranked.length === 1
              ? 'Ver 1 conteúdo sem rank'
              : `Ver ${unranked.length} conteúdos sem rank`}
        </button>
      )}

      {mostrarSemRank &&
        unranked.map((d) => (
          <Link
            key={d.id}
            to={`/modo/${d.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                       opacity-50 transition hover:opacity-80"
          >
            {d.icon_url && <img src={d.icon_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
            <span className="min-w-0 flex-1 truncate text-sm text-subtle">{d.name_pt ?? d.name_en}</span>
            <span className="shrink-0 text-xs text-subtle">—</span>
            <div className="w-20 shrink-0" />
          </Link>
        ))}
    </div>
  );
}
