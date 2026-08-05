import { describe, it, expect } from 'vitest';
import { assembleHeroDetail, mapHeroRankItems } from './queries';

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

describe('assembleHeroDetail (classe/facção)', () => {
  it('achata classes e factions do payload de heroes', () => {
    const detail = assembleHeroDetail({
      hero: {
        id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina',
        hero_classes: [{ classes: { title_en: 'Fighter', title_pt: 'Lutador' } }],
        hero_factions: [
          { factions: { title_en: 'Chaotic', title_pt: 'Caótico' } },
          { factions: { title_en: 'Northerner', title_pt: 'Nortista' } },
        ],
      },
      labels: [], rates: [], gear: { gear: [] }, artifacts: { artifacts: [] },
      lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.classes).toEqual([{ title_en: 'Fighter', title_pt: 'Lutador' }]);
    expect(detail.factions.map((f) => f.title_en)).toEqual(['Chaotic', 'Northerner']);
  });
  it('sem classes/factions viram []', () => {
    const detail = assembleHeroDetail({
      hero: { id: 2, name_pt: null, name_en: 'X', big_card_url: null, star_level: null, special_pt: null },
      labels: [], rates: [], gear: { gear: [] }, artifacts: { artifacts: [] },
      lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.classes).toEqual([]);
    expect(detail.factions).toEqual([]);
  });
});

describe('mapHeroRankItems', () => {
  it('achata o payload nested (heroes + hero_factions.factions)', () => {
    const rows = [{
      rate: 50,
      heroes: {
        id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png',
        hero_factions: [
          { factions: { title_en: 'Chaotic', title_pt: 'Caótico' } },
          { factions: { title_en: 'Northerner', title_pt: 'Nortista' } },
        ],
      },
    }];
    const out = mapHeroRankItems(rows);
    expect(out[0]).toEqual({
      id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50,
      factions: [
        { title_en: 'Chaotic', title_pt: 'Caótico' },
        { title_en: 'Northerner', title_pt: 'Nortista' },
      ],
    });
  });
  it('herói sem facções vira []', () => {
    const out = mapHeroRankItems([{ rate: 1, heroes: { id: 2, name_pt: null, name_en: 'X', card_url: null } }]);
    expect(out[0].factions).toEqual([]);
  });
});
