export interface DetailData {
  info: {
    id: number; name: string; card?: string; big_card?: string;
    star_level?: number; index?: number; channel?: number;
    special?: string; label?: string[];
    class?: { id: number; title: string; icon?: string }[];
    factions?: { id: number; title: string; icon?: string; lord_icon?: string }[];
  };
  equipment_list?: any[];
  artifactItem_list?: any[];
  lineup?: { list?: any[] };
  dungeon_usage?: { dungeon: { id: number; name: string; index?: number; icon?: string }; rate: string }[];
}

export function parseDetail(raw: unknown): DetailData {
  const arr = raw as any[];
  if (!Array.isArray(arr) || !arr[0]?.data) throw new Error('resposta de detalhe inesperada');
  return arr[0].data as DetailData;
}

export function invertDungeonRates(d: DetailData) {
  return (d.dungeon_usage ?? []).map((u) => ({
    dungeon_id: u.dungeon.id,
    rate: Number(u.rate),
  }));
}

export function extractLabels(d: DetailData): string[] {
  return d.info.label ?? [];
}

export function extractClassIds(d: DetailData): number[] {
  return (d.info.class ?? []).map((c) => c.id);
}

export function extractFactionIds(d: DetailData): number[] {
  return (d.info.factions ?? []).map((f) => f.id);
}
