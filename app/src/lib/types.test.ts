import { describe, it, expect } from 'vitest';
import type { Dungeon } from './types';

describe('types', () => {
  it('Dungeon aceita forma esperada', () => {
    const d: Dungeon = { id: 1, index: 18, name_pt: 'Raide', name_en: 'Raid', icon_url: null };
    expect(d.id).toBe(1);
  });
});
