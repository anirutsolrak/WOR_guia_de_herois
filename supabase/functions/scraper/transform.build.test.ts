import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGear, buildArtifacts, buildLineups, parseDetail } from './transform.ts';

const term = async (s: string) => 'TERM:' + s;
const desc = async (s: string) => 'DESC:' + s;
const RAW = [{ data: {
  info: { id: 1, name: 'X' },
  equipment_list: [
    { type: 1, list: [] },
    { type: 3, list: [{
      equipment_slot: { id: 40, name: 'Weapon', icon: 'w.png' },
      list: [{ equipment: { id: 50, icon: 'e.png', set: { id: 60, name: 'Warlord', icon: 's.png', desc: 'ATK +25%' } } }],
      main_attrs: [{ attr_id: 303, name: 'ATK', icon: 'a.png' }],
      sub_attrs: [{ attr_id: 304, name: 'ATK Bonus', icon: 'b.png' }],
    }] },
  ],
  artifactItem_list: [{ type: 3, list: [{ artifact: { id: 70, name: 'Halberd', icon: 'h.png', desc: 'AoE +15%', quality: '1' } }] }],
  lineup: { list: [{ heroes: [{ id: 2, name: 'Elddr', card: 'el.png' }] }] },
} }];

Deno.test('buildGear: nomes via term, desc via desc', async () => {
  const g = await buildGear(parseDetail(RAW), term, desc);
  assertEquals(g[0].slot.name, 'TERM:Weapon');
  assertEquals(g[0].sets[0].name, 'TERM:Warlord');
  assertEquals(g[0].sets[0].desc, 'DESC:ATK +25%');
  assertEquals(g[0].main_attrs[0].name, 'TERM:ATK');
  assertEquals(g[0].sub_attrs[0].name, 'TERM:ATK Bonus');
});

Deno.test('buildArtifacts: nome via term, desc via desc', async () => {
  const a = await buildArtifacts(parseDetail(RAW), term, desc);
  assertEquals(a[0].name, 'TERM:Halberd');
  assertEquals(a[0].desc, 'DESC:AoE +15%');
});

Deno.test('buildLineups: nomes via term', async () => {
  const l = await buildLineups(parseDetail(RAW), term);
  assertEquals(l[0].heroes[0].name, 'TERM:Elddr');
});
