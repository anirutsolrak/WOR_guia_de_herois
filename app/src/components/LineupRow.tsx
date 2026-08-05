import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-4 sm:gap-5">
        {lineup.heroes.map((h) => (
          <div key={h.id} className="flex w-16 flex-col items-center gap-1.5 text-center">
            {h.card_url && (
              <img src={h.card_url} alt={h.name} loading="lazy"
                   className="h-16 w-full rounded-lg object-cover" />
            )}
            <span className="w-full truncate text-xs text-muted">{h.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
