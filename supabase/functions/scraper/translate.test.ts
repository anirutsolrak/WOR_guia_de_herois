import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { makeTranslator, passthrough } from './translate.ts';
import { makeCachedAuto, sha256Hex } from './translate.ts';

Deno.test('usa glossario quando ha match exato', async () => {
  let autoCalls = 0;
  const auto = async (s: string) => { autoCalls++; return 'AUTO:' + s; };
  const t = makeTranslator(auto);
  assertEquals(await t('Fighter'), 'Lutador');
  assertEquals(autoCalls, 0);
});

Deno.test('cai no auto para texto livre e memoiza', async () => {
  let autoCalls = 0;
  const auto = async (s: string) => { autoCalls++; return 'AUTO:' + s; };
  const t = makeTranslator(auto);
  assertEquals(await t('Lu Bu excels with his long range'), 'AUTO:Lu Bu excels with his long range');
  await t('Lu Bu excels with his long range');
  assertEquals(autoCalls, 1); // memoizado
});

Deno.test('passthrough devolve o proprio texto', async () => {
  assertEquals(await passthrough('qualquer coisa'), 'qualquer coisa');
});

Deno.test('sha256Hex é determinístico', async () => {
  assertEquals(await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

Deno.test('makeCachedAuto: hit não chama translate', async () => {
  let calls = 0;
  const auto = makeCachedAuto({
    getCached: async () => 'CACHED',
    setCached: async () => {},
    translate: async (s) => { calls++; return 'T:' + s; },
  });
  assertEquals(await auto('hello'), 'CACHED');
  assertEquals(calls, 0);
});

Deno.test('makeCachedAuto: miss traduz e grava', async () => {
  let saved: [string, string] | null = null;
  const auto = makeCachedAuto({
    getCached: async () => null,
    setCached: async (en, pt) => { saved = [en, pt]; },
    translate: async (s) => 'T:' + s,
  });
  assertEquals(await auto('hello'), 'T:hello');
  assertEquals(saved, ['hello', 'T:hello']);
});
