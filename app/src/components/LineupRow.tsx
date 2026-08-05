import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="flex flex-wrap gap-2">
      {lineup.heroes.map((h) => (
        <div key={h.id} className="flex w-16 flex-col items-center gap-1 text-center">
          {h.card_url && (
            <img src={h.card_url} alt={h.name} loading="lazy"
                 className="h-14 w-full rounded-lg object-cover" />
          )}
          <span className="w-full truncate text-[11px] text-muted">{h.name}</span>
        </div>
      ))}
    </div>
  );
}
