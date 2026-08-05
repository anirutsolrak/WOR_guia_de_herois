create table if not exists heroes (
  id bigint primary key,
  name_en text not null,
  name_pt text,
  card_url text,
  big_card_url text,
  star_level int,
  index int,
  is_lord boolean default false,
  channel bigint,
  special_en text,
  special_pt text,
  source_raw jsonb,
  updated_at timestamptz default now()
);
create table if not exists hero_classes (
  hero_id bigint references heroes(id) on delete cascade,
  class_id bigint references classes(id),
  primary key (hero_id, class_id)
);
create table if not exists hero_factions (
  hero_id bigint references heroes(id) on delete cascade,
  faction_id bigint references factions(id),
  primary key (hero_id, faction_id)
);
create table if not exists hero_labels (
  hero_id bigint references heroes(id) on delete cascade,
  ordinal int,
  label_en text not null,
  label_pt text,
  primary key (hero_id, ordinal)
);
create table if not exists hero_dungeon_rates (
  hero_id bigint references heroes(id) on delete cascade,
  dungeon_id bigint references dungeons(id),
  rate numeric not null,
  primary key (hero_id, dungeon_id)
);
create index if not exists idx_hdr_dungeon_rate
  on hero_dungeon_rates (dungeon_id, rate desc);
create table if not exists hero_gear (
  hero_id bigint primary key references heroes(id) on delete cascade,
  gear jsonb not null
);
create table if not exists hero_artifacts (
  hero_id bigint primary key references heroes(id) on delete cascade,
  artifacts jsonb not null
);
create table if not exists hero_lineups (
  hero_id bigint primary key references heroes(id) on delete cascade,
  lineups jsonb not null
);
create table if not exists hero_videos (
  hero_id bigint primary key references heroes(id) on delete cascade,
  videos jsonb not null
);
