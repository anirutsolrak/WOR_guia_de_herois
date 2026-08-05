import { Link, useParams } from 'react-router-dom';
import { useDungeons } from '../hooks/useDungeons';
import { useHeroesByDungeon } from '../hooks/useHeroesByDungeon';
import { AppShell } from '../components/AppShell';
import { HeroRankRow } from '../components/HeroRankRow';

export function ModePage() {
  const { dungeonId } = useParams();
  const id = Number(dungeonId);
  const { data: dungeons } = useDungeons();
  const { data, loading, error } = useHeroesByDungeon(id);

  const mode = (dungeons ?? []).find((d) => d.id === id);
  const title = mode ? (mode.name_pt ?? mode.name_en) : 'Modo';
  const items = data ?? [];
  const maxRate = Math.max(50, ...items.map((h) => h.rate));

  return (
    <AppShell title={title} subtitle="Ranking de heróis" banner={mode?.icon_url ?? undefined}>
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface
                   px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-fg"
      >
        <span aria-hidden className="text-base leading-none">←</span> Modos
      </Link>
      {loading && <p className="text-muted">Carregando…</p>}
      {error && <p className="text-muted">Erro ao carregar heróis.</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-muted">Nenhum herói ranqueado ainda neste modo.</p>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <HeroRankRow key={item.id} item={item} rank={i + 1} maxRate={maxRate} />
        ))}
      </div>
    </AppShell>
  );
}
