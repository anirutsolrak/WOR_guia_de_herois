import { describe, it, expect } from 'vitest';
import { assembleHeroDetail } from './queries';

describe('assembleHeroDetail', () => {
  it('monta HeroDetail a partir das partes', () => {
    const detail = assembleHeroDetail({
      hero: { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina' },
      labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
      rates: [{ dungeon_id: 30, rate: 50 }],
      gear: { gear: [] }, artifacts: { artifacts: [] }, lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.name_pt).toBe('Lu Bu');
    expect(detail.rates[0].rate).toBe(50);
    expect(detail.labels[0].label_pt).toBe('DPS em Área');
    expect(detail.gear).toEqual([]);
  });
});
