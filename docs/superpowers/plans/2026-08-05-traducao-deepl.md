# Tradução automática (DeepL) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traduzir as descrições (`special`, desc de sets/artefatos) via DeepL no scraper, mantendo nomes em inglês, com cache em tabela.

**Architecture:** O scraper passa a usar dois tradutores — `tTerm` (glossário+passthrough) para termos fixos e nomes, `tDesc` (glossário+DeepL-com-cache) para descrições. O `auto` do DeepL consulta/grava uma tabela `translations`. Sem `DEEPL_API_KEY` setado, cai em passthrough.

**Tech Stack:** Supabase Edge Function (Deno/TS), DeepL API Free, Deno test.

## Global Constraints

- DeepL **Free**: `https://api-free.deepl.com/v2/translate`, `target_lang=PT-BR`, `source_lang=EN`, header `Authorization: DeepL-Auth-Key <key>`. Chave via `Deno.env.get('DEEPL_API_KEY')` (segredo; NUNCA no código/commit).
- Traduz SÓ descrições: `special` (herói), `desc` de sets e artefatos. NOMES (set/artefato/herói/lineup) e termos fixos NÃO vão pro DeepL.
- Fallback: sem `DEEPL_API_KEY` → `passthrough` (pipeline não quebra; testes rodam offline).
- Suíte Deno **offline**: partes de rede (DeepL, cache no DB) NÃO são testadas na suíte; são verificadas manualmente na ativação. As partes puras (`sha256Hex`, `makeCachedAuto`, roteamento nome×desc) são testadas.
- Idempotente; cache por hash SHA-256 do texto EN.

---

## Mapa de arquivos

- `supabase/migrations/0005_translations.sql` — tabela de cache (RLS on, sem policy pública).
- `supabase/functions/scraper/translate.ts` — `sha256Hex`, `makeCachedAuto`, `deeplTranslate`, `cacheGet`, `cacheSet`.
- `supabase/functions/scraper/transform.ts` — `buildGear`/`buildArtifacts` recebem `(d, term, desc)`.
- `supabase/functions/scraper/db.ts` — `localizeRefs(refs, term, desc)`.
- `supabase/functions/scraper/index.ts` — monta `tTerm`/`tDesc`; roteia `special`/labels/name.
- Testes: `translate.test.ts` (add), `transform.build.test.ts` (update), `db.test.ts` (update).

---

### Task 1: Migration da tabela de cache

**Files:**
- Create: `supabase/migrations/0005_translations.sql`

**Interfaces:**
- Produces: tabela `translations (source_hash pk, source_en, target_pt, provider, created_at)`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0005_translations.sql`:
```sql
create table if not exists translations (
  source_hash text primary key,
  source_en text not null,
  target_pt text not null,
  provider text not null default 'deepl',
  created_at timestamptz default now()
);
alter table translations enable row level security;
-- Sem policy de select público: só a service_role (usada pela Edge Function) acessa.
```

- [ ] **Step 2: Validar sintaxe (sem aplicar — aplicação é ops na Task 6)**

Não há como aplicar localmente (sem Docker). Apenas confirme que o arquivo existe e o SQL está bem formado (revisão visual). Será aplicado via Management API na Task 6.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_translations.sql
git commit -m "feat(db): tabela translations (cache de tradução)"
```

---

### Task 2: translate.ts — hash, cached-auto, DeepL, cache DB

**Files:**
- Modify: `supabase/functions/scraper/translate.ts`
- Test: `supabase/functions/scraper/translate.test.ts` (append)

**Interfaces:**
- Consumes: `AutoFn` (já existe em translate.ts).
- Produces:
  - `sha256Hex(text: string): Promise<string>` (puro)
  - `makeCachedAuto({ getCached, setCached, translate }): AutoFn` (puro/injetável)
  - `deeplTranslate(apiKey: string, text: string): Promise<string>` (rede)
  - `cacheGet(sb, en): Promise<string|null>` / `cacheSet(sb, en, pt): Promise<void>` (DB)

- [ ] **Step 1: Testes que falham (puros)**

Append em `supabase/functions/scraper/translate.test.ts`:
```ts
import { makeCachedAuto, sha256Hex } from './translate.ts';

Deno.test('sha256Hex é determinístico', async () => {
  assertEquals(await sha256Hex('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

Deno.test('makeCachedAuto: hit não chama translate', async () => {
  let calls = 0;
  const auto = makeCachedAuto({
    getCached: async () => 'CACHED',
    setCached: async () => {},
    translate: async (s) => { calls++; return 'T:' + s; },
  });
  assertEquals(await auto('hello'), 'CACHED');
  assertEquals(calls, 0);
});

Deno.test('makeCachedAuto: miss traduz e grava', async () => {
  let saved: [string, string] | null = null;
  const auto = makeCachedAuto({
    getCached: async () => null,
    setCached: async (en, pt) => { saved = [en, pt]; },
    translate: async (s) => 'T:' + s,
  });
  assertEquals(await auto('hello'), 'T:hello');
  assertEquals(saved, ['hello', 'T:hello']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/translate.test.ts`
Expected: FAIL (`sha256Hex`/`makeCachedAuto` não exportados).

- [ ] **Step 3: Implementar (append em translate.ts)**

Adicionar ao fim de `supabase/functions/scraper/translate.ts`:
```ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CachedAutoDeps {
  getCached: (en: string) => Promise<string | null>;
  setCached: (en: string, pt: string) => Promise<void>;
  translate: (en: string) => Promise<string>;
}

export function makeCachedAuto(deps: CachedAutoDeps): AutoFn {
  return async (en: string): Promise<string> => {
    if (!en) return en;
    const hit = await deps.getCached(en);
    if (hit !== null) return hit;
    const out = await deps.translate(en);
    await deps.setCached(en, out);
    return out;
  };
}

export async function deeplTranslate(apiKey: string, text: string): Promise<string> {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ text, target_lang: 'PT-BR', source_lang: 'EN' }),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return json.translations[0].text;
}

export async function cacheGet(sb: SupabaseClient, en: string): Promise<string | null> {
  const hash = await sha256Hex(en);
  const { data } = await sb.from('translations').select('target_pt').eq('source_hash', hash).maybeSingle();
  return (data?.target_pt as string | undefined) ?? null;
}

export async function cacheSet(sb: SupabaseClient, en: string, pt: string): Promise<void> {
  const hash = await sha256Hex(en);
  const { error } = await sb.from('translations').upsert({ source_hash: hash, source_en: en, target_pt: pt });
  if (error) throw error;
}
```
(`AutoFn` já é declarado no topo do arquivo; use-o.)

- [ ] **Step 4: Rodar e ver passar + dir inteiro**

Run: `deno test supabase/functions/scraper/translate.test.ts && deno test supabase/functions/scraper/`
Expected: novos testes passam; o resto do scraper segue verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/translate.ts supabase/functions/scraper/translate.test.ts
git commit -m "feat(scraper): DeepL + cache (sha256Hex, makeCachedAuto, deeplTranslate)"
```

---

### Task 3: Builders roteando nome × descrição

**Files:**
- Modify: `supabase/functions/scraper/transform.ts`
- Modify: `supabase/functions/scraper/transform.build.test.ts`

**Interfaces:**
- Produces (assinaturas novas):
  - `buildGear(d, term: T, desc: T): Promise<GearSlotOut[]>` — slot.name/set.name/attrs→`term`; set.desc→`desc`.
  - `buildArtifacts(d, term: T, desc: T): Promise<ArtifactOut[]>` — name→`term`; desc→`desc`.
  - `buildLineups(d, term: T): Promise<LineupOut[]>` — hero names→`term`.

- [ ] **Step 1: Atualizar o teste (falha)**

Reescrever `supabase/functions/scraper/transform.build.test.ts` para usar dois tradutores distintos e assertar o roteamento:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGear, buildArtifacts, buildLineups, parseDetail } from './transform.ts';

const term = async (s: string) => 'TERM:' + s;
const desc = async (s: string) => 'DESC:' + s;
const RAW = [{ data: {
  info: { id: 1, name: 'X' },
  equipment_list: [
    { type: 1, list: [] },
    { type: 3, list: [{
      equipment_slot: { id: 40, name: 'Weapon', icon: 'w.png' },
      list: [{ equipment: { id: 50, icon: 'e.png', set: { id: 60, name: 'Warlord', icon: 's.png', desc: 'ATK +25%' } } }],
      main_attrs: [{ attr_id: 303, name: 'ATK', icon: 'a.png' }],
      sub_attrs: [{ attr_id: 304, name: 'ATK Bonus', icon: 'b.png' }],
    }] },
  ],
  artifactItem_list: [{ type: 3, list: [{ artifact: { id: 70, name: 'Halberd', icon: 'h.png', desc: 'AoE +15%', quality: '1' } }] }],
  lineup: { list: [{ heroes: [{ id: 2, name: 'Elddr', card: 'el.png' }] }] },
} }];

Deno.test('buildGear: nomes via term, desc via desc', async () => {
  const g = await buildGear(parseDetail(RAW), term, desc);
  assertEquals(g[0].slot.name, 'TERM:Weapon');
  assertEquals(g[0].sets[0].name, 'TERM:Warlord');
  assertEquals(g[0].sets[0].desc, 'DESC:ATK +25%');
  assertEquals(g[0].main_attrs[0].name, 'TERM:ATK');
  assertEquals(g[0].sub_attrs[0].name, 'TERM:ATK Bonus');
});

Deno.test('buildArtifacts: nome via term, desc via desc', async () => {
  const a = await buildArtifacts(parseDetail(RAW), term, desc);
  assertEquals(a[0].name, 'TERM:Halberd');
  assertEquals(a[0].desc, 'DESC:AoE +15%');
});

Deno.test('buildLineups: nomes via term', async () => {
  const l = await buildLineups(parseDetail(RAW), term);
  assertEquals(l[0].heroes[0].name, 'TERM:Elddr');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/transform.build.test.ts`
Expected: FAIL (assinaturas antigas recebem 1 tradutor; `desc` indefinido / erro de aridade).

- [ ] **Step 3: Alterar os builders em transform.ts**

Em `supabase/functions/scraper/transform.ts`, alterar as assinaturas e o roteamento:
```ts
export async function buildGear(d: DetailData, term: T, desc: T): Promise<GearSlotOut[]> {
  const grp = systemGroup(d.equipment_list);
  const out: GearSlotOut[] = [];
  for (const slot of grp?.list ?? []) {
    const sets: GearSlotOut['sets'] = [];
    for (const opt of slot.list ?? []) {
      const s = opt.equipment?.set;
      if (s) sets.push({ id: s.id, name: await term(s.name ?? ''), desc: await desc(s.desc ?? ''), icon_url: s.icon, equipment_icon: opt.equipment?.icon });
    }
    const mapAttr = async (a: any) => ({ attr_id: a.attr_id, name: await term(a.name ?? ''), icon_url: a.icon });
    out.push({
      slot: { id: slot.equipment_slot.id, name: await term(slot.equipment_slot.name ?? ''), icon_url: slot.equipment_slot.icon },
      sets,
      main_attrs: await Promise.all((slot.main_attrs ?? []).map(mapAttr)),
      sub_attrs: await Promise.all((slot.sub_attrs ?? []).map(mapAttr)),
    });
  }
  return out;
}

export async function buildArtifacts(d: DetailData, term: T, desc: T): Promise<ArtifactOut[]> {
  const grp = systemGroup(d.artifactItem_list);
  const out: ArtifactOut[] = [];
  for (const item of grp?.list ?? []) {
    const a = item.artifact;
    if (a) out.push({ id: a.id, name: await term(a.name ?? ''), desc: await desc(a.desc ?? ''), icon_url: a.icon, quality: a.quality });
  }
  return out;
}

export async function buildLineups(d: DetailData, term: T): Promise<LineupOut[]> {
  const out: LineupOut[] = [];
  for (const lu of d.lineup?.list ?? []) {
    const heroes = [] as LineupOut['heroes'];
    for (const h of lu.heroes ?? []) heroes.push({ id: h.id, name: await term(h.name ?? ''), card_url: h.card });
    out.push({ heroes });
  }
  return out;
}
```

- [ ] **Step 4: Rodar e ver passar + dir**

Run: `deno test supabase/functions/scraper/transform.build.test.ts && deno test supabase/functions/scraper/`
Expected: os 3 testes passam; o dir segue verde (o `index.ts` ainda chama com a aridade antiga → será ajustado na Task 5; se o `deno test` do dir type-checar `index.ts` e reclamar, é esperado e resolvido na Task 5 — mas como `deno test` só checa arquivos de teste e seus imports, e nenhum teste importa `index.ts`, o dir deve passar).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/transform.ts supabase/functions/scraper/transform.build.test.ts
git commit -m "feat(scraper): builders roteiam nome (term) x descrição (desc)"
```

---

### Task 4: localizeRefs roteando nome × descrição

**Files:**
- Modify: `supabase/functions/scraper/db.ts`
- Modify: `supabase/functions/scraper/db.test.ts`

**Interfaces:**
- Produces: `localizeRefs(refs: Refs, term: T, desc: T): Promise<LocalizedRefs>` — nomes (dungeons/classes/factions/slots/attrs/sets/artifacts) via `term`; `sets.desc`/`artifacts.desc` via `desc`.

- [ ] **Step 1: Atualizar o teste (falha)**

Em `supabase/functions/scraper/db.test.ts`, substituir o teste de `localizeRefs` por:
```ts
const term = async (s: string) => 'TERM:' + s;
const desc = async (s: string) => 'DESC:' + s;

Deno.test('localizeRefs: nomes via term, descrições via desc', async () => {
  const refs = {
    dungeons: [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }],
    classes: [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }],
    factions: [], slots: [], attributes: [],
    sets: [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }],
    artifacts: [{ id: 70, name_en: 'Halberd', desc_en: 'AoE +15%', icon_url: 'h.png', quality: '1' }],
  };
  const l = await localizeRefs(refs as any, term, desc);
  assertEquals(l.dungeons[0].name_pt, 'TERM:Gear Raid I');
  assertEquals(l.classes[0].title_pt, 'TERM:Fighter');
  assertEquals(l.sets[0].name_pt, 'TERM:Warlord');
  assertEquals(l.sets[0].desc_pt, 'DESC:ATK +25%');
  assertEquals(l.artifacts[0].name_pt, 'TERM:Halberd');
  assertEquals(l.artifacts[0].desc_pt, 'DESC:AoE +15%');
});
```
(O teste de `buildHeroRow` continua igual.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/db.test.ts`
Expected: FAIL (aridade — `localizeRefs` recebia 1 tradutor).

- [ ] **Step 3: Alterar `localizeRefs` em db.ts**

Substituir a função `localizeRefs` por:
```ts
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
```
(`LocalizedRefs = Awaited<ReturnType<typeof localizeRefs>>` continua válido.)

- [ ] **Step 4: Rodar e ver passar + dir**

Run: `deno test supabase/functions/scraper/db.test.ts && deno test supabase/functions/scraper/`
Expected: passa; dir verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/db.ts supabase/functions/scraper/db.test.ts
git commit -m "feat(scraper): localizeRefs roteia nome (term) x descrição (desc)"
```

---

### Task 5: Wiring no index.ts (tTerm/tDesc + DeepL)

**Files:**
- Modify: `supabase/functions/scraper/index.ts`

**Interfaces:**
- Consumes: `makeTranslator`, `passthrough`, `makeCachedAuto`, `deeplTranslate`, `cacheGet`, `cacheSet` (translate.ts); `localizeRefs` (2 tradutores); `buildGear`/`buildArtifacts` (2 tradutores); `buildLineups` (1 tradutor).

- [ ] **Step 1: Atualizar o index.ts**

Em `supabase/functions/scraper/index.ts`:
1. Ajustar o import do translate.ts:
```ts
import { makeTranslator, passthrough, makeCachedAuto, deeplTranslate, cacheGet, cacheSet } from './translate.ts';
```
2. Remover a linha antiga `const auto = passthrough;` (se existir) e adicionar o helper:
```ts
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
```
3. Reescrever `processHero`:
```ts
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
```
4. Ajustar `processRefs` para usar `term` nas titles:
```ts
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
```

- [ ] **Step 2: Type-check + dir de testes**

Run: `deno check supabase/functions/scraper/index.ts && deno test supabase/functions/scraper/`
Expected: `deno check` limpo (aridade/tipos batem); a suíte do scraper segue verde.
(Nota: `deno check` baixa os módulos remotos de tipo do esm.sh — precisa de rede, ok.)

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/scraper/index.ts
git commit -m "feat(scraper): index monta tTerm/tDesc (DeepL+cache) e roteia campos"
```

---

### Task 6: Ativação (ops) — segredo, migration, deploy, re-tradução

> **Nota:** esta task é executada pelo controller (precisa da chave DeepL + credenciais Supabase). Não é um subagente de código.

- [ ] **Step 1: Setar o segredo DeepL na Edge Function**

`supabase secrets set DEEPL_API_KEY=<chave :fx> --project-ref uehpltviliyzsdargjpi` (com `SUPABASE_ACCESS_TOKEN` no ambiente).

- [ ] **Step 2: Aplicar a migration 0005 (Management API) + deploy da função**

Aplicar `0005_translations.sql` via Management API (mesmo método das migrations anteriores) e `supabase functions deploy scraper --project-ref uehpltviliyzsdargjpi`.

- [ ] **Step 3: Teste manual (1 herói)**

Invocar `?mode=hero&id=2843769` e conferir via REST que `heroes.special_pt` do Lu Bu agora está em PT-BR, e que a tabela `translations` ganhou linhas.

- [ ] **Step 4: Re-traduzir todos os 161**

Re-rodar o loop `populate-all` (idempotente). 1ª passada traduz (cache preenche); confirmar 161 OK e amostrar alguns `special_pt` em PT.

- [ ] **Step 5 (opcional): commitar o util de carga**

Se desejado, versionar o script `populate-all.mjs` em `scripts/` como utilitário.

## Verificação final

- [ ] `deno test supabase/functions/scraper/` — verde.
- [ ] `deno check supabase/functions/scraper/index.ts` — limpo.
- [ ] Manual: `special_pt` em PT-BR; nomes de sets/artefatos/heróis seguem em inglês; `translations` populando.
- [ ] App (`npm run dev`): a descrição do herói aparece em português.

## Follow-ups

- Sub-projeto B: **cron** de re-sync periódico.
- Revisar termos do glossário que aparecem dentro das descrições traduzidas (consistência prosa × chips).
