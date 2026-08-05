import type { HeroDetail } from '../lib/types';
import { factionColor } from '../lib/factionColors';

export function HeroIdentity({ hero }: { hero: HeroDetail }) {
  const name = hero.name_pt ?? hero.name_en;
  const aura = factionColor(hero.factions[0]?.title_en ?? 'Unnamed');
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: aura }}>
        {hero.big_card_url && <img src={hero.big_card_url} alt={name} className="w-full object-cover" />}
      </div>

      <div className="mt-3 flex items-center gap-0.5 text-lg text-[#f5c542]"
           aria-label={`${hero.star_level ?? 0} estrelas`}>
        {'★'.repeat(hero.star_level ?? 0)}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {hero.classes.map((c) => (
          <span key={c.title_en}
                className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {c.title_pt ?? c.title_en}
          </span>
        ))}
        {hero.factions.map((f) => (
          <span key={f.title_en} className="rounded-full border px-2 py-0.5 text-xs"
                style={{ color: factionColor(f.title_en), borderColor: factionColor(f.title_en) }}>
            {f.title_pt ?? f.title_en}
          </span>
        ))}
      </div>

      {hero.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hero.labels.map((l, i) => (
            <span key={i} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-subtle">
              {l.label_pt ?? l.label_en}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
