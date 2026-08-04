import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { makeTranslator, passthrough } from './translate.ts';

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
