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
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-80
                     transition duration-150 group-hover:opacity-90 group-hover:scale-[1.04]"
        />
      )}
      {/* leve tint geral: abafa o título em inglês "queimado" no banner */}
      <span className="pointer-events-none absolute inset-0 bg-[#0a0f1a]/40" />
      {/* scrim inferior forte: garante leitura do nome */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3
                       bg-gradient-to-t from-[#05070d] via-[#05070d]/85 to-transparent" />
      <span className="absolute inset-x-3 bottom-2.5 z-10 font-display text-[13px] font-bold leading-tight
                       text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.95)]">
        {name}
      </span>
    </Link>
  );
}
