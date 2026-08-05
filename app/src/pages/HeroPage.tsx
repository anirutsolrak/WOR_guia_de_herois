import { Link, useParams } from 'react-router-dom';
import { useHero } from '../hooks/useHero';
import { useDungeons } from '../hooks/useDungeons';
import { AppShell } from '../components/AppShell';
import { HeroIdentity } from '../components/HeroIdentity';
import { RadarPanel } from '../components/RadarPanel';
import { GearSlotView } from '../components/GearSlot';
import { LineupRow } from '../components/LineupRow';

export function HeroPage() {
  const { heroId } = useParams();
  const { data: hero, loading, error } = useHero(Number(heroId));
  const { data: dungeons } = useDungeons();

  if (loading) return <AppShell title="Herói"><p className="text-muted">Carregando…</p></AppShell>;
  if (error || !hero) return <AppShell title="Herói"><p className="text-muted">Erro ao carregar herói.</p></AppShell>;

  const name = hero.name_pt ?? hero.name_en;

  return (
    <AppShell title={name} subtitle="Detalhe do herói">
      <Link to="/" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface
                              px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-fg">
        <span aria-hidden className="text-base leading-none">←</span> Voltar
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <HeroIdentity hero={hero} />
          <RadarPanel rates={hero.rates} dungeons={dungeons ?? []} />
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Equipamento (Recomendado)</h2>
            <div className="space-y-3">
              {hero.gear.map((g) => <GearSlotView key={g.slot.id} slot={g} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Artefatos</h2>
            <ul className="space-y-2">
              {hero.artifacts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                  {a.icon_url && <img src={a.icon_url} alt="" className="h-8 w-8" />}
                  <div>
                    <div className="text-sm text-fg">{a.name}</div>
                    <div className="text-xs text-muted">{a.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Times Recomendados</h2>
            <div className="space-y-3">
              {hero.lineups.map((l, i) => <LineupRow key={i} lineup={l} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Descrição</h2>
            <p className="leading-relaxed text-muted">{hero.special_pt}</p>
          </section>

          {hero.videos.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Vídeos</h2>
              <p className="text-muted">{hero.videos.length} guia(s) disponível(is)</p>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
