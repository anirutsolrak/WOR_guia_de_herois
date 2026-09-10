import type { SupabaseClient } from '@supabase/supabase-js';
import type { Dungeon, HeroDetail, HeroRankItem, HeroSearchItem } from './types';

export function assembleHeroDetail(p: any): HeroDetail {
  return {
    id: p.hero.id, name_pt: p.hero.name_pt, name_en: p.hero.name_en,
    big_card_url: p.hero.big_card_url, star_level: p.hero.star_level, special_pt: p.hero.special_pt,
    labels: p.labels ?? [],
    // rank() e count() voltam como bigint — o PostgREST pode entregá-los como string.
    rates: (p.rates ?? []).map((r: any) => ({
      dungeon_id: Number(r.dungeon_id),
      rate: Number(r.rate),
      rank: Number(r.rank),
      total: Number(r.total),
    })),
    gear: p.gear?.gear ?? [], artifacts: p.artifacts?.artifacts ?? [],
    lineups: p.lineups?.lineups ?? [], videos: p.videos?.videos ?? [],
    classes: (p.hero.hero_classes ?? []).map((hc: any) => hc.classes).filter(Boolean),
    factions: (p.hero.hero_factions ?? []).map((hf: any) => hf.factions).filter(Boolean),
  };
}

export async function getDungeons(sb: SupabaseClient): Promise<Dungeon[]> {
  const { data, error } = await sb.from('dungeons').select('*').order('index', { ascending: true });
  if (error) throw error;
  return data as Dungeon[];
}

export async function getHeroSearchIndex(sb: SupabaseClient): Promise<HeroSearchItem[]> {
  const { data, error } = await sb
    .from('heroes')
    .select('id, name_pt, name_en, card_url')
    .order('name_en', { ascending: true });
  if (error) throw error;
  return data as HeroSearchItem[];
}

export function mapHeroRankItems(rows: any[]): HeroRankItem[] {
  return (rows ?? []).map((r) => {
    const h = r.heroes;
    return {
      id: h.id, name_pt: h.name_pt, name_en: h.name_en, card_url: h.card_url,
      rate: r.rate,
      factions: (h.hero_factions ?? []).map((hf: any) => hf.factions).filter(Boolean),
    };
  });
}

export async function getHeroesByDungeon(sb: SupabaseClient, dungeonId: number): Promise<HeroRankItem[]> {
  const { data, error } = await sb
    .from('hero_dungeon_rates')
    .select('rate, heroes(id, name_pt, name_en, card_url, hero_factions(factions(title_en, title_pt)))')
    .eq('dungeon_id', dungeonId)
    .order('rate', { ascending: false });
  if (error) throw error;
  return mapHeroRankItems(data as any[]);
}

export async function getHeroDetail(sb: SupabaseClient, heroId: number): Promise<HeroDetail> {
  const [hero, labels, rates, gear, artifacts, lineups, videos] = await Promise.all([
    sb.from('heroes')
      .select('*, hero_factions(factions(title_en, title_pt)), hero_classes(classes(title_en, title_pt))')
      .eq('id', heroId).single(),
    sb.from('hero_labels').select('label_pt, label_en').eq('hero_id', heroId).order('ordinal'),
    sb.from('hero_dungeon_ranks').select('dungeon_id, rate, rank, total').eq('hero_id', heroId),
    sb.from('hero_gear').select('gear').eq('hero_id', heroId).single(),
    sb.from('hero_artifacts').select('artifacts').eq('hero_id', heroId).single(),
    sb.from('hero_lineups').select('lineups').eq('hero_id', heroId).single(),
    sb.from('hero_videos').select('videos').eq('hero_id', heroId).single(),
  ]);
  if (hero.error) throw hero.error;
  const others: [string, { error: any }][] = [
    ['hero_labels', labels], ['hero_dungeon_ranks', rates], ['hero_gear', gear],
    ['hero_artifacts', artifacts], ['hero_lineups', lineups], ['hero_videos', videos],
  ];
  for (const [relation, result] of others) {
    if (result.error) console.warn(`getHeroDetail: falha ao ler ${relation}`, result.error);
  }
  return assembleHeroDetail({
    hero: hero.data, labels: labels.data, rates: rates.data,
    gear: gear.data, artifacts: artifacts.data, lineups: lineups.data, videos: videos.data,
  });
}
