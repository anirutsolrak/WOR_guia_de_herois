import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchHeroDetail, fetchClasses, fetchFactions } from './api.ts';
import { makeTranslator, passthrough } from './translate.ts';
import {
  parseDetail, invertDungeonRates, extractLabels, extractClassIds, extractFactionIds,
  collectRefs, buildGear, buildArtifacts, buildLineups,
} from './transform.ts';
import { localizeRefs, buildHeroRow, persist } from './db.ts';

function sbClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// PoC: sem provedor de traducao configurado -> passthrough (glossario ainda atua).
const auto = passthrough;

async function processHero(id: number) {
  const sb = sbClient();
  const t = makeTranslator(auto);
  const d = parseDetail(await fetchHeroDetail(id));
  const refs = await localizeRefs(collectRefs(d), t);
  const namePt = await t(d.info.name);
  const specialPt = await t(d.info.special ?? '');
  const labelsEn = extractLabels(d);
  const labels = await Promise.all(labelsEn.map(async (l, i) => ({ ordinal: i, label_en: l, label_pt: await t(l) })));
  await persist(sb, {
    hero: buildHeroRow(d, namePt, specialPt),
    refs, classIds: extractClassIds(d), factionIds: extractFactionIds(d),
    labels, rates: invertDungeonRates(d),
    gear: await buildGear(d, t), artifacts: await buildArtifacts(d, t),
    lineups: await buildLineups(d, t), videos: [],
  });
}

async function processRefs() {
  const sb = sbClient();
  const t = makeTranslator(auto);
  const classes = (await fetchClasses()).data?.classes ?? [];
  const factions = (await fetchFactions()).data?.camp ?? [];
  for (const c of classes) if (c.title !== 'All Classes')
    await sb.from('classes').upsert({ id: c.id, title_en: c.title, title_pt: await t(c.title), icon_url: c.icon }, { onConflict: 'id' });
  for (const f of factions) if (f.title !== 'All Factions')
    await sb.from('factions').upsert({ id: f.id, title_en: f.title, title_pt: await t(f.title), icon_url: f.icon, lord_icon_url: f.lord_icon }, { onConflict: 'id' });
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    if (mode === 'refs') { await processRefs(); return new Response('refs ok'); }
    if (mode === 'hero') {
      const id = Number(url.searchParams.get('id'));
      if (!id) return new Response('id ausente', { status: 400 });
      await processHero(id);
      return new Response(`hero ${id} ok`);
    }
    return new Response('use ?mode=refs ou ?mode=hero&id=XXXX', { status: 400 });
  } catch (e) {
    return new Response('erro: ' + (e as Error).message, { status: 500 });
  }
});
