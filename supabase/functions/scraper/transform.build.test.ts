import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGear, buildArtifacts, buildLineups, parseDetail } from './transform.ts';

const t = async (s: string) => 'PT:' + s;
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

Deno.test('buildGear traduz e estrutura o slot system-recommended', async () => {
  const g = await buildGear(parseDetail(RAW), t);
  assertEquals(g, [{
    slot: { id: 40, name: 'PT:Weapon', icon_url: 'w.png' },
    sets: [{ id: 60, name: 'PT:Warlord', desc: 'PT:ATK +25%', icon_url: 's.png', equipment_icon: 'e.png' }],
    main_attrs: [{ attr_id: 303, name: 'PT:ATK', icon_url: 'a.png' }],
    sub_attrs: [{ attr_id: 304, name: 'PT:ATK Bonus', icon_url: 'b.png' }],
  }]);
});

Deno.test('buildArtifacts type 3', async () => {
  const a = await buildArtifacts(parseDetail(RAW), t);
  assertEquals(a, [{ id: 70, name: 'PT:Halberd', desc: 'PT:AoE +15%', icon_url: 'h.png', quality: '1' }]);
});

Deno.test('buildLineups traduz nomes', async () => {
  const l = await buildLineups(parseDetail(RAW), t);
  assertEquals(l, [{ heroes: [{ id: 2, name: 'PT:Elddr', card_url: 'el.png' }] }]);
});
