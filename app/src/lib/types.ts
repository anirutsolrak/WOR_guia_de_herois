export interface Dungeon { id: number; index: number | null; name_pt: string | null; name_en: string; icon_url: string | null; }
export interface DungeonRate { dungeon_id: number; rate: number; }
export interface HeroCardData { id: number; name_pt: string | null; name_en: string; card_url: string | null; }
export interface Attr { attr_id: number; name: string; icon_url?: string; }
export interface GearSlot {
  slot: { id: number; name: string; icon_url?: string };
  sets: { id: number; name: string; desc: string; icon_url?: string; equipment_icon?: string }[];
  main_attrs: Attr[]; sub_attrs: Attr[];
}
export interface Artifact { id: number; name: string; desc: string; icon_url?: string; quality?: string; }
export interface Lineup { heroes: { id: number; name: string; card_url?: string }[]; }
export interface HeroDetail {
  id: number; name_pt: string | null; name_en: string;
  big_card_url: string | null; star_level: number | null; special_pt: string | null;
  labels: { label_pt: string | null; label_en: string }[];
  rates: DungeonRate[];
  gear: GearSlot[]; artifacts: Artifact[]; lineups: Lineup[]; videos: unknown[];
}
