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

export interface Refs {
  dungeons: { id: number; index?: number; name_en: string; icon_url?: string }[];
  classes: { id: number; title_en: string; icon_url?: string }[];
  factions: { id: number; title_en: string; icon_url?: string; lord_icon_url?: string }[];
  slots: { id: number; name_en: string; icon_url?: string }[];
  attributes: { attr_id: number; name_en: string; icon_url?: string }[];
  sets: { id: number; name_en?: string; desc_en?: string; icon_url?: string }[];
  artifacts: { id: number; name_en?: string; desc_en?: string; icon_url?: string; quality?: string }[];
}

function pushUnique<T>(arr: T[], seen: Set<number>, key: number, val: T) {
  if (!seen.has(key)) { seen.add(key); arr.push(val); }
}

export function collectRefs(d: DetailData): Refs {
  const r: Refs = { dungeons: [], classes: [], factions: [], slots: [], attributes: [], sets: [], artifacts: [] };
  const seen = { d: new Set<number>(), c: new Set<number>(), f: new Set<number>(), sl: new Set<number>(), a: new Set<number>(), s: new Set<number>(), ar: new Set<number>() };

  for (const u of d.dungeon_usage ?? [])
    pushUnique(r.dungeons, seen.d, u.dungeon.id, { id: u.dungeon.id, index: u.dungeon.index, name_en: u.dungeon.name, icon_url: u.dungeon.icon });
  for (const c of d.info.class ?? [])
    pushUnique(r.classes, seen.c, c.id, { id: c.id, title_en: c.title, icon_url: c.icon });
  for (const f of d.info.factions ?? [])
    pushUnique(r.factions, seen.f, f.id, { id: f.id, title_en: f.title, icon_url: f.icon, lord_icon_url: f.lord_icon });

  for (const group of d.equipment_list ?? []) {
    for (const slot of group.list ?? []) {
      const es = slot.equipment_slot;
      if (es) pushUnique(r.slots, seen.sl, es.id, { id: es.id, name_en: es.name, icon_url: es.icon });
      for (const opt of slot.list ?? []) {
        const set = opt.equipment?.set;
        if (set) pushUnique(r.sets, seen.s, set.id, { id: set.id, name_en: set.name, desc_en: set.desc, icon_url: set.icon });
      }
      for (const at of [...(slot.main_attrs ?? []), ...(slot.sub_attrs ?? [])])
        pushUnique(r.attributes, seen.a, at.attr_id, { attr_id: at.attr_id, name_en: at.name, icon_url: at.icon });
    }
  }
  for (const group of d.artifactItem_list ?? []) {
    for (const item of group.list ?? []) {
      const a = item.artifact;
      if (a) pushUnique(r.artifacts, seen.ar, a.id, { id: a.id, name_en: a.name, desc_en: a.desc, icon_url: a.icon, quality: a.quality });
    }
  }
  return r;
}
