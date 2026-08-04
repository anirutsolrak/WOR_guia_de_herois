import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DetailData, Refs, GearSlotOut, ArtifactOut, LineupOut } from './transform.ts';

export type T = (en: string) => Promise<string>;

export interface HeroRow {
  id: number; name_en: string; name_pt: string;
  card_url?: string; big_card_url?: string; star_level?: number; index?: number;
  is_lord: boolean; channel?: number; special_en?: string; special_pt?: string;
  source_raw: unknown;
}

export function buildHeroRow(d: DetailData, namePt: string, specialPt: string): HeroRow {
  const i = d.info;
  return {
    id: i.id, name_en: i.name, name_pt: namePt,
    card_url: i.card, big_card_url: i.big_card, star_level: i.star_level, index: i.index,
    is_lord: false, channel: i.channel, special_en: i.special, special_pt: specialPt,
    source_raw: d,
  };
}

export async function localizeRefs(refs: Refs, t: T) {
  const loc = async <A extends Record<string, any>>(rows: A[], fields: [string, string][]) =>
    Promise.all(rows.map(async (r) => {
      const o: any = { ...r };
      for (const [from, to] of fields) o[to] = r[from] != null ? await t(r[from]) : null;
      return o;
    }));
  return {
    dungeons: await loc(refs.dungeons, [['name_en', 'name_pt']]),
    classes: await loc(refs.classes, [['title_en', 'title_pt']]),
    factions: await loc(refs.factions, [['title_en', 'title_pt']]),
    slots: await loc(refs.slots, [['name_en', 'name_pt']]),
    attributes: await loc(refs.attributes, [['name_en', 'name_pt']]),
    sets: await loc(refs.sets, [['name_en', 'name_pt'], ['desc_en', 'desc_pt']]),
    artifacts: await loc(refs.artifacts, [['name_en', 'name_pt'], ['desc_en', 'desc_pt']]),
  };
}
export type LocalizedRefs = Awaited<ReturnType<typeof localizeRefs>>;

export interface PersistArgs {
  hero: HeroRow;
  refs: LocalizedRefs;
  classIds: number[]; factionIds: number[];
  labels: { ordinal: number; label_en: string; label_pt: string }[];
  rates: { dungeon_id: number; rate: number }[];
  gear: GearSlotOut[]; artifacts: ArtifactOut[]; lineups: LineupOut[]; videos: unknown[];
}

export async function persist(sb: SupabaseClient, a: PersistArgs): Promise<void> {
  const up = async (table: string, rows: any[], onConflict: string) => {
    if (rows.length) { const { error } = await sb.from(table).upsert(rows, { onConflict }); if (error) throw error; }
  };
  await up('dungeons', a.refs.dungeons, 'id');
  await up('classes', a.refs.classes, 'id');
  await up('factions', a.refs.factions, 'id');
  await up('equipment_slots', a.refs.slots, 'id');
  await up('attributes', a.refs.attributes, 'attr_id');
  await up('equipment_sets', a.refs.sets, 'id');
  await up('artifacts', a.refs.artifacts, 'id');

  { const { error } = await sb.from('heroes').upsert(a.hero, { onConflict: 'id' }); if (error) throw error; }
  const hid = a.hero.id;
  await sb.from('hero_classes').delete().eq('hero_id', hid);
  await up('hero_classes', a.classIds.map((c) => ({ hero_id: hid, class_id: c })), 'hero_id,class_id');
  await sb.from('hero_factions').delete().eq('hero_id', hid);
  await up('hero_factions', a.factionIds.map((f) => ({ hero_id: hid, faction_id: f })), 'hero_id,faction_id');
  await sb.from('hero_labels').delete().eq('hero_id', hid);
  await up('hero_labels', a.labels.map((l) => ({ hero_id: hid, ...l })), 'hero_id,ordinal');
  await sb.from('hero_dungeon_rates').delete().eq('hero_id', hid);
  await up('hero_dungeon_rates', a.rates.map((r) => ({ hero_id: hid, ...r })), 'hero_id,dungeon_id');
  await up('hero_gear', [{ hero_id: hid, gear: a.gear }], 'hero_id');
  await up('hero_artifacts', [{ hero_id: hid, artifacts: a.artifacts }], 'hero_id');
  await up('hero_lineups', [{ hero_id: hid, lineups: a.lineups }], 'hero_id');
  await up('hero_videos', [{ hero_id: hid, videos: a.videos }], 'hero_id');
}
