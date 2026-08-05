import { Link } from 'react-router-dom';
import type { Dungeon } from '../lib/types';

export function ModeCard({ dungeon }: { dungeon: Dungeon }) {
  const name = dungeon.name_pt ?? dungeon.name_en;
  return (
    <Link
      to={`/modo/${dungeon.id}`}
      className="group relative block h-24 overflow-hidden rounded-xl border border-border-strong
                 shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition
                 duration-150 hover:-translate-y-[3px] hover:border-accent/60
                 hover:shadow-[0_10px_28px_rgba(80,140,255,0.28)]"
    >
      {dungeon.icon_url && (
        <img
          src={dungeon.icon_url}
          alt={name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-85
                     transition duration-150 group-hover:opacity-100 group-hover:scale-[1.03]"
        />
      )}
      <span className="pointer-events-none absolute inset-0
                       bg-gradient-to-b from-black/10 to-[#080e1a]/90" />
      <span className="absolute inset-x-3 bottom-2.5 z-10 font-display text-sm font-bold
                       text-fg drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
        {name}
      </span>
    </Link>
  );
}
