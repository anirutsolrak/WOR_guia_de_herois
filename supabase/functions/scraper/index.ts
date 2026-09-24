import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchHeroDetail, fetchHeroes, fetchClasses, fetchFactions } from './api.ts';
import { makeTranslator, passthrough, makeCachedAuto, deeplTranslate, cacheGet, cacheSet } from './translate.ts';
import {
  parseDetail, invertDungeonRates, extractLabels, extractClassIds, extractFactionIds,
  collectRefs, buildGear, buildArtifacts, buildLineups,
} from './transform.ts';
import { localizeRefs, buildHeroRow, persist } from './db.ts';
import { buildSyncQueue } from './sync.ts';

function sbClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

function makeTranslators(sb: ReturnType<typeof sbClient>) {
  const key = Deno.env.get('DEEPL_API_KEY');
  const auto = key
    ? makeCachedAuto({
        getCached: (en) => cacheGet(sb, en),
        setCached: (en, pt) => cacheSet(sb, en, pt),
        translate: (en) => deeplTranslate(key, en),
      })
    : passthrough;
  return { term: makeTranslator(passthrough), desc: makeTranslator(auto) };
}

async function processHero(id: number) {
  const sb = sbClient();
  const { term, desc } = makeTranslators(sb);
  const d = parseDetail(await fetchHeroDetail(id));
  const refs = await localizeRefs(collectRefs(d), term, desc);
  const namePt = await term(d.info.name);
  const specialPt = await desc(d.info.special ?? '');
  const labels = await Promise.all(
    extractLabels(d).map(async (l, i) => ({ ordinal: i, label_en: l, label_pt: await term(l) })),
  );
  await persist(sb, {
    hero: buildHeroRow(d, namePt, specialPt),
    refs, classIds: extractClassIds(d), factionIds: extractFactionIds(d),
    labels, rates: invertDungeonRates(d),
    gear: await buildGear(d, term, desc),
    artifacts: await buildArtifacts(d, term, desc),
    lineups: await buildLineups(d, term),
    videos: [],
  });
}

async function processRefs() {
  const sb = sbClient();
  const { term } = makeTranslators(sb);
  const classes = (await fetchClasses()).data?.classes ?? [];
  const factions = (await fetchFactions()).data?.camp ?? [];
  for (const c of classes) if (c.title !== 'All Classes')
    await sb.from('classes').upsert({ id: c.id, title_en: c.title, title_pt: await term(c.title), icon_url: c.icon }, { onConflict: 'id' });
  for (const f of factions) if (f.title !== 'All Factions')
    await sb.from('factions').upsert({ id: f.id, title_en: f.title, title_pt: await term(f.title), icon_url: f.icon, lord_icon_url: f.lord_icon }, { onConflict: 'id' });
}

const LIMIT_PADRAO = 5;
const LIMIT_TETO = 20;

/** Uma execução da sincronização: descobre o que falta ou envelheceu e processa um lote. */
async function processSync(limitBruto: number) {
  const sb = sbClient();
  const apiIds: number[] = ((await fetchHeroes()).data?.list ?? []).map((h: { id: number }) => h.id);

  const { data: existentes, error } = await sb.from('heroes').select('id, updated_at');
  if (error) throw error;

  // Teto no servidor: um limit alto demais derrubaria a invocação por timeout.
  const limit = Math.min(Math.max(1, limitBruto || LIMIT_PADRAO), LIMIT_TETO);
  const pendentes = buildSyncQueue(apiIds, existentes ?? [], new Date(), Number.MAX_SAFE_INTEGER);
  const lote = pendentes.slice(0, limit);

  const processados: number[] = [];
  const erros: { id: number; erro: string }[] = [];
  for (const item of lote) {
    // Um herói que falha não pode abortar o lote inteiro.
    try {
      await processHero(item.id);
      processados.push(item.id);
    } catch (e) {
      erros.push({ id: item.id, erro: (e as Error).message });
    }
  }

  const restantes = pendentes.slice(lote.length);
  return {
    processados: processados.length,
    ids: processados,
    erros,
    faltantes_restantes: restantes.filter((r) => r.motivo === 'faltante').length,
    obsoletos_restantes: restantes.filter((r) => r.motivo === 'obsoleto').length,
  };
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    if (mode === 'refs') { await processRefs(); return new Response('refs ok'); }
    if (mode === 'sync') {
      const r = await processSync(Number(url.searchParams.get('limit')));
      return new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } });
    }
    if (mode === 'hero') {
      const id = Number(url.searchParams.get('id'));
      if (!id) return new Response('id ausente', { status: 400 });
      await processHero(id);
      return new Response(`hero ${id} ok`);
    }
    return new Response('use ?mode=sync&limit=N, ?mode=refs ou ?mode=hero&id=XXXX', { status: 400 });
  } catch (e) {
    return new Response('erro: ' + (e as Error).message, { status: 500 });
  }
});
