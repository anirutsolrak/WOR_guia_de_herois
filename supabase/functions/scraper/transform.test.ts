import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  parseDetail, invertDungeonRates, extractLabels,
  extractClassIds, extractFactionIds,
} from './transform.ts';

const RAW = [{
  code: 0, message: 'Success', data: {
    info: {
      id: 2843769, name: 'Lu Bu', card: 'card.png', big_card: 'big.png',
      star_level: 5, index: 5, channel: 2841953,
      special: 'Lu Bu excels...', label: ['AoE DPS', 'Range Boost'],
      class: [{ id: 2759165, title: 'Fighter' }],
      factions: [{ id: 2759162, title: 'Chaotic' }, { id: 2759156, title: 'Northerner' }],
    },
    dungeon_usage: [
      { dungeon: { id: 2663460, name: 'Gear Raid I', index: 18 }, rate: '5.91' },
      { dungeon: { id: 3279126, name: 'Titanic Ruins Matrix I Spellbane Form', index: 24 }, rate: '50.00' },
    ],
  },
}];

Deno.test('parseDetail desembrulha data (envelope em array)', () => {
  assertEquals(parseDetail(RAW).info.id, 2843769);
});

Deno.test('parseDetail desembrulha data (envelope como objeto)', () => {
  // A API real retorna o envelope como objeto, não array.
  assertEquals(parseDetail(RAW[0]).info.id, 2843769);
});

Deno.test('invertDungeonRates converte rate para numero', () => {
  const rows = invertDungeonRates(parseDetail(RAW));
  assertEquals(rows, [
    { dungeon_id: 2663460, rate: 5.91 },
    { dungeon_id: 3279126, rate: 50 },
  ]);
});

Deno.test('extractLabels/classes/factions', () => {
  const d = parseDetail(RAW);
  assertEquals(extractLabels(d), ['AoE DPS', 'Range Boost']);
  assertEquals(extractClassIds(d), [2759165]);
  assertEquals(extractFactionIds(d), [2759162, 2759156]);
});
