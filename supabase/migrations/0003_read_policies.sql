do $$
declare tbl text;
begin
  foreach tbl in array array[
    'dungeons','classes','factions','attributes','equipment_sets','equipment_slots',
    'artifacts','glossary','heroes','hero_classes','hero_factions','hero_labels',
    'hero_dungeon_rates','hero_gear','hero_artifacts','hero_lineups','hero_videos'
  ] loop
    execute format('alter table %I enable row level security;', tbl);
    execute format('drop policy if exists public_read on %I;', tbl);
    execute format('create policy public_read on %I for select using (true);', tbl);
  end loop;
end $$;
