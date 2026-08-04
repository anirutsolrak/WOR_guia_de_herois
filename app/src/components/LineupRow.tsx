import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="lineup-row">
      {lineup.heroes.map((h) => (
        <div key={h.id} className="lineup-hero">
          {h.card_url && <img src={h.card_url} alt={h.name} loading="lazy" />}
          <span>{h.name}</span>
        </div>
      ))}
    </div>
  );
}
