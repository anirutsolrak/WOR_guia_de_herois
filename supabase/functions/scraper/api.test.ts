import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { apiUrl, gameHeaders, API_BASE } from './api.ts';

Deno.test('apiUrl concatena base', () => {
  assertEquals(apiUrl('/heroes/2843769?id=2843769'),
    API_BASE + '/heroes/2843769?id=2843769');
});

Deno.test('gameHeaders traz x-lang e x-location', () => {
  const h = gameHeaders() as Record<string, string>;
  assertEquals(h['x-lang'], 'en');
  assertEquals(h['x-location'], 'sg');
});
