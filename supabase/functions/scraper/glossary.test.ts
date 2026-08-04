import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { translateTerm } from './glossary.ts';

Deno.test('traduz termo conhecido de classe', () => {
  assertEquals(translateTerm('Fighter'), 'Lutador');
});

Deno.test('traduz stat com pontuacao exata', () => {
  assertEquals(translateTerm('Crit. DMG'), 'Dano Crít.');
});

Deno.test('retorna null para termo desconhecido', () => {
  assertEquals(translateTerm('Totally Unknown Term'), null);
});
