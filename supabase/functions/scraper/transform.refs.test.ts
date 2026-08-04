import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { collectRefs, parseDetail } from './transform.ts';

const RAW = [{ data: {
  info: {
    id: 1, name: 'X',
    class: [{ id: 10, title: 'Fighter', icon: 'c.png' }],
    factions: [{ id: 20, title: 'Chaotic', icon: 'f.png', lord_icon: 'l.png' }],
  },
  dungeon_usage: [{ dungeon: { id: 30, name: 'Gear Raid I', index: 18, icon: 'd.png' }, rate: '5' }],
  equipment_list: [{ type: 3, list: [{
    equipment_slot: { id: 40, name: 'Weapon', icon: 'w.png' },
    list: [{ equipment: { id: 50, icon: 'e.png', set: { id: 60, name: 'Warlord', icon: 's.png', desc: 'ATK +25%' } } }],
    main_attrs: [{ attr_id: 303, name: 'ATK', icon: 'a.png' }],
    sub_attrs: [{ attr_id: 304, name: 'ATK Bonus', icon: 'b.png' }],
  }] }],
  artifactItem_list: [{ type: 3, list: [{ artifact: { id: 70, name: 'Halberd', icon: 'h.png', desc: 'AoE +15%', quality: '1' } }] }],
} }];

Deno.test('collectRefs dedup e mapeia entidades', () => {
  const r = collectRefs(parseDetail(RAW));
  assertEquals(r.dungeons, [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }]);
  assertEquals(r.classes, [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }]);
  assertEquals(r.factions, [{ id: 20, title_en: 'Chaotic', icon_url: 'f.png', lord_icon_url: 'l.png' }]);
  assertEquals(r.slots, [{ id: 40, name_en: 'Weapon', icon_url: 'w.png' }]);
  assertEquals(r.attributes, [
    { attr_id: 303, name_en: 'ATK', icon_url: 'a.png' },
    { attr_id: 304, name_en: 'ATK Bonus', icon_url: 'b.png' },
  ]);
  assertEquals(r.sets, [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }]);
  assertEquals(r.artifacts, [{ id: 70, name_en: 'Halberd', desc_en: 'AoE +15%', icon_url: 'h.png', quality: '1' }]);
});
