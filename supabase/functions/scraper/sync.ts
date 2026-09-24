export interface SyncItem {
  id: number;
  motivo: 'faltante' | 'obsoleto';
}

const DIA_MS = 86_400_000;

/**
 * Monta o lote de trabalho de uma execução do modo `sync`.
 *
 * Heróis ausentes do banco vêm primeiro, na ordem em que a API os devolve (ela já
 * entrega os mais recentes na frente). Depois entram os que passaram da janela de
 * obsolescência, do mais antigo para o mais novo. IDs que existem no banco mas não
 * na API são ignorados: nunca apagamos nada.
 */
export function buildSyncQueue(
  apiIds: number[],
  existentes: { id: number; updated_at: string | null }[],
  agora: Date,
  limit: number,
  diasObsoleto = 7,
): SyncItem[] {
  const atualizadoEm = new Map(existentes.map((e) => [e.id, e.updated_at]));
  const corte = agora.getTime() - diasObsoleto * DIA_MS;

  const faltantes: SyncItem[] = [];
  const obsoletos: { item: SyncItem; quando: number }[] = [];

  for (const id of apiIds) {
    if (!atualizadoEm.has(id)) {
      faltantes.push({ id, motivo: 'faltante' });
      continue;
    }
    const at = atualizadoEm.get(id)!;
    // updated_at nulo é tratado como infinitamente antigo.
    const quando = at ? Date.parse(at) : 0;
    if (quando < corte) obsoletos.push({ item: { id, motivo: 'obsoleto' }, quando });
  }

  obsoletos.sort((a, b) => a.quando - b.quando);
  return [...faltantes, ...obsoletos.map((o) => o.item)].slice(0, limit);
}
