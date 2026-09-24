import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildSyncQueue } from './sync.ts';

const AGORA = new Date('2026-09-24T12:00:00Z');
const dias = (n: number) => new Date(AGORA.getTime() - n * 86400000).toISOString();

Deno.test('faltantes vem primeiro, na ordem da API', () => {
  const fila = buildSyncQueue([10, 20, 30], [{ id: 20, updated_at: dias(0) }], AGORA, 10);
  assertEquals(fila, [
    { id: 10, motivo: 'faltante' },
    { id: 30, motivo: 'faltante' },
  ]);
});

Deno.test('obsoletos entram depois dos faltantes, do mais antigo para o mais novo', () => {
  const fila = buildSyncQueue(
    [10, 20, 30],
    [{ id: 20, updated_at: dias(30) }, { id: 30, updated_at: dias(9) }],
    AGORA, 10,
  );
  assertEquals(fila, [
    { id: 10, motivo: 'faltante' },
    { id: 20, motivo: 'obsoleto' },
    { id: 30, motivo: 'obsoleto' },
  ]);
});

Deno.test('heroi dentro da janela de 7 dias nao entra na fila', () => {
  const fila = buildSyncQueue([20], [{ id: 20, updated_at: dias(6) }], AGORA, 10);
  assertEquals(fila, []);
});

Deno.test('updated_at nulo conta como obsoleto', () => {
  const fila = buildSyncQueue([20], [{ id: 20, updated_at: null }], AGORA, 10);
  assertEquals(fila, [{ id: 20, motivo: 'obsoleto' }]);
});

Deno.test('respeita o limit, cortando os obsoletos antes dos faltantes', () => {
  const fila = buildSyncQueue(
    [10, 11, 20],
    [{ id: 20, updated_at: dias(30) }],
    AGORA, 2,
  );
  assertEquals(fila, [
    { id: 10, motivo: 'faltante' },
    { id: 11, motivo: 'faltante' },
  ]);
});

Deno.test('heroi no banco que sumiu da API e ignorado, nunca apagado', () => {
  const fila = buildSyncQueue([10], [{ id: 99, updated_at: dias(90) }], AGORA, 10);
  assertEquals(fila, [{ id: 10, motivo: 'faltante' }]);
});

Deno.test('janela de obsolescencia e configuravel', () => {
  const fila = buildSyncQueue([20], [{ id: 20, updated_at: dias(3) }], AGORA, 10, 2);
  assertEquals(fila, [{ id: 20, motivo: 'obsoleto' }]);
});
