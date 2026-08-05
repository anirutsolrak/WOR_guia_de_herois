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

export async function localizeRefs(refs: Refs, term: T, desc: T) {
  const loc = async <A extends Record<string, any>>(rows: A[], fields: [string, string, T][]) =>
    Promise.all(rows.map(async (r) => {
      const o: any = { ...r };
      for (const [from, to, tr] of fields) o[to] = r[from] != null ? await tr(r[from]) : null;
      return o;
    }));
  return {
    dungeons: await loc(refs.dungeons, [['name_en', 'name_pt', term]]),
    classes: await loc(refs.classes, [['title_en', 'title_pt', term]]),
    factions: await loc(refs.factions, [['title_en', 'title_pt', term]]),
    slots: await loc(refs.slots, [['name_en', 'name_pt', term]]),
    attributes: await loc(refs.attributes, [['name_en', 'name_pt', term]]),
    sets: await loc(refs.sets, [['name_en', 'name_pt', term], ['desc_en', 'desc_pt', desc]]),
    artifacts: await loc(refs.artifacts, [['name_en', 'name_pt', term], ['desc_en', 'desc_pt', desc]]),
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

export function buildPayload(a: PersistArgs) {
  return {
    hero: a.hero,
    refs: a.refs,
    class_ids: a.classIds,
    faction_ids: a.factionIds,
    labels: a.labels,
    rates: a.rates,
    gear: a.gear,
    artifacts: a.artifacts,
    lineups: a.lineups,
    videos: a.videos,
  };
}

export async function persist(sb: SupabaseClient, a: PersistArgs): Promise<void> {
  const { error } = await sb.rpc('upsert_hero', { p: buildPayload(a) });
  if (error) throw error;
}
