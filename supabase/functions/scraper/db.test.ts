import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { localizeRefs, buildHeroRow } from './db.ts';
import { parseDetail } from './transform.ts';

const t = async (s: string) => 'PT:' + s;

Deno.test('localizeRefs adiciona name_pt/title_pt/desc_pt', async () => {
  const refs = {
    dungeons: [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }],
    classes: [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }],
    factions: [], slots: [], attributes: [],
    sets: [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }],
    artifacts: [],
  };
  const l = await localizeRefs(refs as any, t);
  assertEquals(l.dungeons[0].name_pt, 'PT:Gear Raid I');
  assertEquals(l.classes[0].title_pt, 'PT:Fighter');
  assertEquals(l.sets[0].name_pt, 'PT:Warlord');
  assertEquals(l.sets[0].desc_pt, 'PT:ATK +25%');
});

Deno.test('buildHeroRow monta a linha de heroes', () => {
  const d = parseDetail([{ data: { info: {
    id: 2843769, name: 'Lu Bu', card: 'c.png', big_card: 'b.png',
    star_level: 5, index: 5, channel: 1, special: 'excels...',
  } } }]);
  const row = buildHeroRow(d, 'Lu Bu', 'domina...');
  assertEquals(row.id, 2843769);
  assertEquals(row.name_pt, 'Lu Bu');
  assertEquals(row.special_pt, 'domina...');
  assertEquals(row.card_url, 'c.png');
});
