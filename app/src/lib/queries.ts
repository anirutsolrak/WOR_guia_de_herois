import type { SupabaseClient } from '@supabase/supabase-js';
import type { Dungeon, HeroDetail, HeroRankItem } from './types';

export function assembleHeroDetail(p: any): HeroDetail {
  return {
    id: p.hero.id, name_pt: p.hero.name_pt, name_en: p.hero.name_en,
    big_card_url: p.hero.big_card_url, star_level: p.hero.star_level, special_pt: p.hero.special_pt,
    labels: p.labels ?? [], rates: p.rates ?? [],
    gear: p.gear?.gear ?? [], artifacts: p.artifacts?.artifacts ?? [],
    lineups: p.lineups?.lineups ?? [], videos: p.videos?.videos ?? [],
  };
}

export async function getDungeons(sb: SupabaseClient): Promise<Dungeon[]> {
  const { data, error } = await sb.from('dungeons').select('*').order('index', { ascending: true });
  if (error) throw error;
  return data as Dungeon[];
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
    sb.from('heroes').select('*').eq('id', heroId).single(),
    sb.from('hero_labels').select('label_pt, label_en').eq('hero_id', heroId).order('ordinal'),
    sb.from('hero_dungeon_rates').select('dungeon_id, rate').eq('hero_id', heroId),
    sb.from('hero_gear').select('gear').eq('hero_id', heroId).single(),
    sb.from('hero_artifacts').select('artifacts').eq('hero_id', heroId).single(),
    sb.from('hero_lineups').select('lineups').eq('hero_id', heroId).single(),
    sb.from('hero_videos').select('videos').eq('hero_id', heroId).single(),
  ]);
  if (hero.error) throw hero.error;
  return assembleHeroDetail({
    hero: hero.data, labels: labels.data, rates: rates.data,
    gear: gear.data, artifacts: artifacts.data, lineups: lineups.data, videos: videos.data,
  });
}
