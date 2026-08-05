import { describe, it, expect } from 'vitest';
import { categorize, CATEGORY_ORDER } from './categories';

describe('categorize', () => {
  const cases: [string, string][] = [
    ['Arena Single-Target DPS Challenge', 'arena'],
    ['Arena AoE DPS Challenge', 'arena'],
    ['Arena Anti-Air DPS Challenge', 'arena'],
    ['Gear Raid I', 'gear'],
    ['Gear Raid III', 'gear'],
    ['Gear Dungeon II', 'gear'],
    ['Artifact Material Raid', 'gear'],
    ['Guild War', 'guild'],
    ['Titanic Ruins Apocalypse I & II', 'guild'],
    ['Titanic Ruins Matrix I Bulwark Form', 'guild'],
    ['Titanic Ruins Matrix I Spellbane Form', 'guild'],
    ["Drake's Chasm Nightmare IV", 'guild'],
    ["Drake's Chasm Abyss I", 'guild'],
    ['Tower of Deception', 'towers'],
    ["Malrik's Halls of Illusion The Black Sewer", 'towers'],
    ["Malrik's Halls of Illusion Heart of the Volcano", 'towers'],
  ];
  it.each(cases)('%s -> %s', (name, key) => {
    expect(categorize(name)).toBe(key);
  });
  it('desconhecido cai em other', () => {
    expect(categorize('Algo Novo Qualquer')).toBe('other');
  });
  it('CATEGORY_ORDER tem as 5 categorias na ordem certa', () => {
    expect(CATEGORY_ORDER.map((c) => c.key)).toEqual(['arena', 'gear', 'guild', 'towers', 'other']);
    expect(CATEGORY_ORDER.find((c) => c.key === 'guild')!.label).toBe('Guilda');
  });
});
