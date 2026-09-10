import { describe, it, expect } from 'vitest';
import { normalize, displayName, searchHeroes } from './heroSearch';
import type { HeroSearchItem } from './types';

const heroes: HeroSearchItem[] = [
  { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' },
  { id: 2, name_pt: 'Zéfiro', name_en: 'Zephyr', card_url: 'ze.png' },
  { id: 3, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: 'ld.png' },
  { id: 4, name_pt: null, name_en: 'Baludo', card_url: null },
];

describe('normalize', () => {
  it('tira acento e caixa', () => {
    expect(normalize('Zéfiro')).toBe('zefiro');
    expect(normalize('CAÓTICO')).toBe('caotico');
  });
});

describe('displayName', () => {
  it('prefere name_pt e cai para name_en quando nulo', () => {
    expect(displayName(heroes[1])).toBe('Zéfiro');
    expect(displayName(heroes[3])).toBe('Baludo');
  });
});

describe('searchHeroes', () => {
  it('busca sem acento nos dois sentidos', () => {
    expect(searchHeroes(heroes, 'zefiro').map((h) => h.id)).toEqual([2]);
    expect(searchHeroes(heroes, 'Zéf').map((h) => h.id)).toEqual([2]);
  });

  it('casa pelo name_en quando o PT difere', () => {
    expect(searchHeroes(heroes, 'zephyr').map((h) => h.id)).toEqual([2]);
  });

  it('coloca quem começa com o termo antes de quem só o contém', () => {
    expect(searchHeroes(heroes, 'lu').map((h) => h.id)).toEqual([1, 3, 4]);
  });

  it('ordena alfabeticamente dentro do mesmo grupo', () => {
    expect(searchHeroes(heroes, 'lud').map((h) => h.id)).toEqual([3, 4]);
  });

  it('respeita o limite', () => {
    expect(searchHeroes(heroes, 'lu', 2).map((h) => h.id)).toEqual([1, 3]);
  });

  it('termo vazio ou só espaços devolve lista vazia', () => {
    expect(searchHeroes(heroes, '')).toEqual([]);
    expect(searchHeroes(heroes, '   ')).toEqual([]);
  });
});
