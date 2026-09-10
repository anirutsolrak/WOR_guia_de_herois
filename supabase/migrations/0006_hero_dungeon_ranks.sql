create or replace view hero_dungeon_ranks as
select
  hero_id,
  dungeon_id,
  rate,
  rank()   over (partition by dungeon_id order by rate desc) as rank,
  count(*) over (partition by dungeon_id)                    as total
from hero_dungeon_rates;

grant select on hero_dungeon_ranks to anon, authenticated;
