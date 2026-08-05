import { describe, it, expect } from 'vitest';
import { factionColor } from './factionColors';

describe('factionColor', () => {
  const cases: [string, string][] = [
    ['Watcher', 'var(--color-faction-watcher)'],
    ['Northerner', 'var(--color-faction-northerner)'],
    ['Nightmare', 'var(--color-faction-nightmare)'],
    ['Cultist', 'var(--color-faction-cultist)'],
    ['Infernal', 'var(--color-faction-infernal)'],
    ['Piercer', 'var(--color-faction-piercer)'],
    ['Esotericist', 'var(--color-faction-esotericist)'],
    ['Chaotic', 'var(--color-faction-chaotic)'],
    ['Arbiter', 'var(--color-faction-arbiter)'],
    ['Unnamed', 'var(--color-faction-unnamed)'],
  ];
  it.each(cases)('%s -> %s', (en, cssVar) => {
    expect(factionColor(en)).toBe(cssVar);
  });
  it('desconhecido cai em unnamed', () => {
    expect(factionColor('Qualquer')).toBe('var(--color-faction-unnamed)');
  });
});
