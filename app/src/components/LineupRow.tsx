import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="grid grid-cols-5 gap-3">
      {lineup.heroes.map((h) => (
        <div key={h.id} className="flex flex-col items-center gap-1 text-center">
          {h.card_url && (
            <img src={h.card_url} alt={h.name} loading="lazy" className="w-full rounded-lg" />
          )}
          <span className="w-full truncate text-xs text-muted">{h.name}</span>
        </div>
      ))}
    </div>
  );
}
