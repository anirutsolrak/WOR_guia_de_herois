create or replace function upsert_hero(p jsonb)
returns void
language plpgsql
as $$
declare
  hid bigint := (p->'hero'->>'id')::bigint;
begin
  insert into dungeons (id, index, name_en, name_pt, icon_url)
  select id, index, name_en, name_pt, icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'dungeons','[]'::jsonb))
    as x(id bigint, index int, name_en text, name_pt text, icon_url text)
  on conflict (id) do update set index=excluded.index, name_en=excluded.name_en, name_pt=excluded.name_pt, icon_url=excluded.icon_url;

  insert into classes (id, title_en, title_pt, icon_url)
  select id, title_en, title_pt, icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'classes','[]'::jsonb))
    as x(id bigint, title_en text, title_pt text, icon_url text)
  on conflict (id) do update set title_en=excluded.title_en, title_pt=excluded.title_pt, icon_url=excluded.icon_url;

  insert into factions (id, title_en, title_pt, icon_url, lord_icon_url)
  select id, title_en, title_pt, icon_url, lord_icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'factions','[]'::jsonb))
    as x(id bigint, title_en text, title_pt text, icon_url text, lord_icon_url text)
  on conflict (id) do update set title_en=excluded.title_en, title_pt=excluded.title_pt, icon_url=excluded.icon_url, lord_icon_url=excluded.lord_icon_url;

  insert into equipment_slots (id, name_en, name_pt, icon_url)
  select id, name_en, name_pt, icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'slots','[]'::jsonb))
    as x(id bigint, name_en text, name_pt text, icon_url text)
  on conflict (id) do update set name_en=excluded.name_en, name_pt=excluded.name_pt, icon_url=excluded.icon_url;

  insert into attributes (attr_id, name_en, name_pt, icon_url)
  select attr_id, name_en, name_pt, icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'attributes','[]'::jsonb))
    as x(attr_id int, name_en text, name_pt text, icon_url text)
  on conflict (attr_id) do update set name_en=excluded.name_en, name_pt=excluded.name_pt, icon_url=excluded.icon_url;

  insert into equipment_sets (id, name_en, name_pt, desc_en, desc_pt, icon_url)
  select id, name_en, name_pt, desc_en, desc_pt, icon_url
  from jsonb_to_recordset(coalesce(p->'refs'->'sets','[]'::jsonb))
    as x(id bigint, name_en text, name_pt text, desc_en text, desc_pt text, icon_url text)
  on conflict (id) do update set name_en=excluded.name_en, name_pt=excluded.name_pt, desc_en=excluded.desc_en, desc_pt=excluded.desc_pt, icon_url=excluded.icon_url;

  insert into artifacts (id, name_en, name_pt, desc_en, desc_pt, icon_url, quality)
  select id, name_en, name_pt, desc_en, desc_pt, icon_url, quality
  from jsonb_to_recordset(coalesce(p->'refs'->'artifacts','[]'::jsonb))
    as x(id bigint, name_en text, name_pt text, desc_en text, desc_pt text, icon_url text, quality text)
  on conflict (id) do update set name_en=excluded.name_en, name_pt=excluded.name_pt, desc_en=excluded.desc_en, desc_pt=excluded.desc_pt, icon_url=excluded.icon_url, quality=excluded.quality;

  insert into heroes (id, name_en, name_pt, card_url, big_card_url, star_level, index, is_lord, channel, special_en, special_pt, source_raw, updated_at)
  select id, name_en, name_pt, card_url, big_card_url, star_level, index, is_lord, channel, special_en, special_pt, source_raw, now()
  from jsonb_to_record(p->'hero')
    as x(id bigint, name_en text, name_pt text, card_url text, big_card_url text, star_level int, index int, is_lord boolean, channel bigint, special_en text, special_pt text, source_raw jsonb)
  on conflict (id) do update set name_en=excluded.name_en, name_pt=excluded.name_pt, card_url=excluded.card_url, big_card_url=excluded.big_card_url, star_level=excluded.star_level, index=excluded.index, is_lord=excluded.is_lord, channel=excluded.channel, special_en=excluded.special_en, special_pt=excluded.special_pt, source_raw=excluded.source_raw, updated_at=now();

  delete from hero_classes where hero_id = hid;
  insert into hero_classes (hero_id, class_id)
  select hid, v::bigint from jsonb_array_elements_text(coalesce(p->'class_ids','[]'::jsonb)) v
  on conflict (hero_id, class_id) do nothing;

  delete from hero_factions where hero_id = hid;
  insert into hero_factions (hero_id, faction_id)
  select hid, v::bigint from jsonb_array_elements_text(coalesce(p->'faction_ids','[]'::jsonb)) v
  on conflict (hero_id, faction_id) do nothing;

  delete from hero_labels where hero_id = hid;
  insert into hero_labels (hero_id, ordinal, label_en, label_pt)
  select hid, ordinal, label_en, label_pt
  from jsonb_to_recordset(coalesce(p->'labels','[]'::jsonb)) as x(ordinal int, label_en text, label_pt text)
  on conflict (hero_id, ordinal) do nothing;

  delete from hero_dungeon_rates where hero_id = hid;
  insert into hero_dungeon_rates (hero_id, dungeon_id, rate)
  select hid, dungeon_id, rate
  from jsonb_to_recordset(coalesce(p->'rates','[]'::jsonb)) as x(dungeon_id bigint, rate numeric)
  on conflict (hero_id, dungeon_id) do nothing;

  insert into hero_gear (hero_id, gear) values (hid, coalesce(p->'gear','[]'::jsonb))
  on conflict (hero_id) do update set gear = excluded.gear;
  insert into hero_artifacts (hero_id, artifacts) values (hid, coalesce(p->'artifacts','[]'::jsonb))
  on conflict (hero_id) do update set artifacts = excluded.artifacts;
  insert into hero_lineups (hero_id, lineups) values (hid, coalesce(p->'lineups','[]'::jsonb))
  on conflict (hero_id) do update set lineups = excluded.lineups;
  insert into hero_videos (hero_id, videos) values (hid, coalesce(p->'videos','[]'::jsonb))
  on conflict (hero_id) do update set videos = excluded.videos;
end;
$$;
