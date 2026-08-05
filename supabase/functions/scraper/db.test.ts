import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { localizeRefs, buildHeroRow, buildPayload } from './db.ts';
import { parseDetail } from './transform.ts';

const term = async (s: string) => 'TERM:' + s;
const desc = async (s: string) => 'DESC:' + s;

Deno.test('localizeRefs: nomes via term, descrições via desc', async () => {
  const refs = {
    dungeons: [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }],
    classes: [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }],
    factions: [], slots: [], attributes: [],
    sets: [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }],
    artifacts: [{ id: 70, name_en: 'Halberd', desc_en: 'AoE +15%', icon_url: 'h.png', quality: '1' }],
  };
  const l = await localizeRefs(refs as any, term, desc);
  assertEquals(l.dungeons[0].name_pt, 'TERM:Gear Raid I');
  assertEquals(l.classes[0].title_pt, 'TERM:Fighter');
  assertEquals(l.sets[0].name_pt, 'TERM:Warlord');
  assertEquals(l.sets[0].desc_pt, 'DESC:ATK +25%');
  assertEquals(l.artifacts[0].name_pt, 'TERM:Halberd');
  assertEquals(l.artifacts[0].desc_pt, 'DESC:AoE +15%');
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

Deno.test('buildPayload monta o payload da RPC', () => {
  const p = buildPayload({
    hero: { id: 1, name_en: 'Lu Bu', name_pt: 'Lu Bu', is_lord: false, source_raw: {} } as any,
    refs: { dungeons: [{ id: 30, name_en: 'X', name_pt: 'PT:X' }] } as any,
    classIds: [10], factionIds: [20],
    labels: [{ ordinal: 0, label_en: 'AoE DPS', label_pt: 'DPS em Área' }],
    rates: [{ dungeon_id: 30, rate: 50 }],
    gear: [], artifacts: [], lineups: [], videos: [],
  });
  // camelCase -> snake_case remap for the SQL function
  // (class_ids/faction_ids), passthrough for the rest
  if (JSON.stringify(p.class_ids) !== '[10]') throw new Error('class_ids');
  if (JSON.stringify(p.faction_ids) !== '[20]') throw new Error('faction_ids');
  if ((p.rates as any)[0].dungeon_id !== 30) throw new Error('rates');
  if ((p.refs as any).dungeons[0].name_pt !== 'PT:X') throw new Error('refs');
});
