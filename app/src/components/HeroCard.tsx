import type { HeroCardData } from '../lib/types';
import { RateBar } from './RateBar';

export function HeroCard({ hero, rate }: { hero: HeroCardData; rate?: number }) {
  const name = hero.name_pt ?? hero.name_en;
  return (
    <div className="hero-card">
      {hero.card_url && <img src={hero.card_url} alt={name} loading="lazy" />}
      <span className="hero-card-name">{name}</span>
      {rate !== undefined && <RateBar value={rate} max={50} />}
    </div>
  );
}
