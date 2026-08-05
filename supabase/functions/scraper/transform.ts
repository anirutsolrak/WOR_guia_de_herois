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
  // A API do jogo pode retornar o envelope como objeto {code,data} ou como
  // array [{code,data}] dependendo do endpoint/versão. Aceita ambos.
  const root: any = Array.isArray(raw) ? raw[0] : raw;
  if (!root?.data) throw new Error('resposta de detalhe inesperada');
  return root.data as DetailData;
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

export type T = (en: string) => Promise<string>;

export interface GearSlotOut {
  slot: { id: number; name: string; icon_url?: string };
  sets: { id: number; name: string; desc: string; icon_url?: string; equipment_icon?: string }[];
  main_attrs: { attr_id: number; name: string; icon_url?: string }[];
  sub_attrs: { attr_id: number; name: string; icon_url?: string }[];
}
export interface ArtifactOut { id: number; name: string; desc: string; icon_url?: string; quality?: string }
export interface LineupOut { heroes: { id: number; name: string; card_url?: string }[] }

function systemGroup(list: any[] | undefined) {
  return (list ?? []).find((g) => g.type === 3);
}

export async function buildGear(d: DetailData, t: T): Promise<GearSlotOut[]> {
  const grp = systemGroup(d.equipment_list);
  const out: GearSlotOut[] = [];
  for (const slot of grp?.list ?? []) {
    const sets: GearSlotOut['sets'] = [];
    for (const opt of slot.list ?? []) {
      const s = opt.equipment?.set;
      if (s) sets.push({ id: s.id, name: await t(s.name ?? ''), desc: await t(s.desc ?? ''), icon_url: s.icon, equipment_icon: opt.equipment?.icon });
    }
    const mapAttr = async (a: any) => ({ attr_id: a.attr_id, name: await t(a.name ?? ''), icon_url: a.icon });
    out.push({
      slot: { id: slot.equipment_slot.id, name: await t(slot.equipment_slot.name ?? ''), icon_url: slot.equipment_slot.icon },
      sets,
      main_attrs: await Promise.all((slot.main_attrs ?? []).map(mapAttr)),
      sub_attrs: await Promise.all((slot.sub_attrs ?? []).map(mapAttr)),
    });
  }
  return out;
}

export async function buildArtifacts(d: DetailData, t: T): Promise<ArtifactOut[]> {
  const grp = systemGroup(d.artifactItem_list);
  const out: ArtifactOut[] = [];
  for (const item of grp?.list ?? []) {
    const a = item.artifact;
    if (a) out.push({ id: a.id, name: await t(a.name ?? ''), desc: await t(a.desc ?? ''), icon_url: a.icon, quality: a.quality });
  }
  return out;
}

export async function buildLineups(d: DetailData, t: T): Promise<LineupOut[]> {
  const out: LineupOut[] = [];
  for (const lu of d.lineup?.list ?? []) {
    const heroes = [] as LineupOut['heroes'];
    for (const h of lu.heroes ?? []) heroes.push({ id: h.id, name: await t(h.name ?? ''), card_url: h.card });
    out.push({ heroes });
  }
  return out;
}
