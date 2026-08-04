# WoR Guia de Heróis — Fase 1 (PoC) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provar a fatia vertical de ponta a ponta — um herói (Lu Bu, `id 2843769`) atravessando o pipeline (API → tradução → Supabase) e aparecendo por completo no app PWA (índice de modos, lista por modo, detalhe completo), em português.

**Architecture:** Pipeline em Supabase Edge Function (Deno) busca dados da API do jogo, traduz via glossário + tradução automática, e grava em Postgres (tabelas de referência + JSONB por herói + tabela invertida `hero_dungeon_rates`). Um app Vite + React + PWA lê o Supabase pelo client e renderiza índice/modo/detalhe. Lógica de transformação e tradução são módulos puros, testados por TDD.

**Tech Stack:** Supabase (Postgres + Edge Functions Deno), TypeScript, Vite + React 18, React Router, `@supabase/supabase-js`, `vite-plugin-pwa`, Vitest + Testing Library (app), Deno test (pipeline).

## Global Constraints

- Idioma da UI e do conteúdo servido: **português** (dados guardados EN+PT).
- Herói da PoC: **Lu Bu**, `id = 2843769`. Não hardcodar no app — vem do banco.
- API base: `https://app-web.mproject.skystone.games/actgateway/zgamecommunity`.
- Headers obrigatórios em toda chamada à API: `accept: application/json, text/plain, */*`, `x-lang: en`, `x-location: sg`, `user-agent: Mozilla/5.0 (...) Chrome/150.0.0.0`, `referer: https://watcherofrealms.mproject.skystone.games/`, `origin: https://watcherofrealms.mproject.skystone.games`.
- Imagens: **hotlink** das URLs do CDN (`akmwebjv.mproject.skystone.games`), guardadas no banco.
- Gear no MVP: apenas a aba **System Recommended** (no JSON, `equipment_list`/`artifactItem_list` com `type: 3` — o único sem `rate`).
- Todo id de entidade usa o id numérico do jogo como PK (upsert idempotente).
- Nunca duplicar dados: toda escrita é upsert por id.
- Arquivos focados: um arquivo, uma responsabilidade. Nada de arquivo "faz-tudo".

---

## Mapa de arquivos

**Pipeline (`supabase/`):**
- `supabase/migrations/0001_reference_tables.sql` — dungeons, classes, factions, attributes, equipment_sets, equipment_slots, artifacts, glossary.
- `supabase/migrations/0002_hero_tables.sql` — heroes + tabelas filhas + `hero_dungeon_rates`.
- `supabase/functions/scraper/api.ts` — cliente da API do jogo (fetch + headers).
- `supabase/functions/scraper/glossary.ts` — dados do glossário curado (seed) + lookup.
- `supabase/functions/scraper/translate.ts` — tradução (glossário + auto com cache).
- `supabase/functions/scraper/transform.ts` — funções puras: parse do detalhe → linhas/JSONB.
- `supabase/functions/scraper/db.ts` — upserts no Supabase.
- `supabase/functions/scraper/index.ts` — entrypoint HTTP, roteia modos `refs`/`hero`.
- `supabase/functions/scraper/*.test.ts` — testes Deno dos módulos puros.

**App (`app/`):**
- `app/src/lib/supabase.ts` — client do Supabase.
- `app/src/lib/types.ts` — tipos TS do domínio.
- `app/src/hooks/useDungeons.ts`, `useHeroesByDungeon.ts`, `useHero.ts` — data fetching.
- `app/src/components/RateBar.tsx`, `RadarChart.tsx`, `HeroCard.tsx`, `GearSlot.tsx`, `LineupRow.tsx`.
- `app/src/pages/IndexPage.tsx`, `ModePage.tsx`, `HeroPage.tsx`.
- `app/src/App.tsx` — router. `app/src/main.tsx` — bootstrap.
- `app/src/**/*.test.tsx` — testes de componente (Vitest).

---

### Task 1: Scaffolding do repositório (Supabase + app Vite)

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `app/` (via `npm create vite`)
- Create: `.gitignore`, `README.md`

**Interfaces:**
- Consumes: nada.
- Produces: estrutura de pastas `supabase/` e `app/`; `app` roda com `npm run dev`.

- [ ] **Step 1: Inicializar Supabase local**

Run:
```bash
npm i -g supabase
supabase init
```
Isso cria `supabase/config.toml` e a pasta `supabase/`.

- [ ] **Step 2: Criar o app Vite (React + TS)**

Run:
```bash
npm create vite@latest app -- --template react-ts
cd app && npm install
npm install @supabase/supabase-js react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom vite-plugin-pwa
```

- [ ] **Step 3: Configurar Vitest no app**

Create `app/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test-setup.ts' },
});
```
Create `app/src/test-setup.ts`:
```ts
import '@testing-library/jest-dom';
```
Add to `app/package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 4: Verificar que o app sobe e o teste roda**

Run: `cd app && npm run dev` (Ctrl-C após ver "Local:"), depois `npm test`
Expected: dev server sobe; `vitest` roda sem testes ("no test files") sem erro.

- [ ] **Step 5: Criar `.gitignore` e commitar**

Create `.gitignore`:
```
node_modules/
app/node_modules/
app/dist/
.env
.env.local
supabase/.branches/
supabase/.temp/
```

Run:
```bash
git add -A
git commit -m "chore: scaffold supabase pipeline e app vite+react"
```

---

### Task 2: Migration das tabelas de referência

**Files:**
- Create: `supabase/migrations/0001_reference_tables.sql`

**Interfaces:**
- Consumes: nada.
- Produces: tabelas `dungeons`, `classes`, `factions`, `attributes`, `equipment_sets`, `equipment_slots`, `artifacts`, `glossary`. Colunas usadas por `db.ts` e pelos hooks do app.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0001_reference_tables.sql`:
```sql
create table if not exists dungeons (
  id bigint primary key,
  index int,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists classes (
  id bigint primary key,
  title_en text not null,
  title_pt text,
  icon_url text
);
create table if not exists factions (
  id bigint primary key,
  title_en text not null,
  title_pt text,
  icon_url text,
  lord_icon_url text
);
create table if not exists attributes (
  attr_id int primary key,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists equipment_sets (
  id bigint primary key,
  name_en text,
  name_pt text,
  desc_en text,
  desc_pt text,
  icon_url text
);
create table if not exists equipment_slots (
  id bigint primary key,
  name_en text not null,
  name_pt text,
  icon_url text
);
create table if not exists artifacts (
  id bigint primary key,
  name_en text,
  name_pt text,
  desc_en text,
  desc_pt text,
  icon_url text,
  quality text
);
create table if not exists glossary (
  term_en text primary key,
  term_pt text not null,
  category text
);
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
supabase start
supabase db reset
```
Expected: migration aplica sem erro; `supabase db reset` recria as 8 tabelas.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_reference_tables.sql
git commit -m "feat(db): tabelas de referencia"
```

---

### Task 3: Migration das tabelas do herói

**Files:**
- Create: `supabase/migrations/0002_hero_tables.sql`

**Interfaces:**
- Consumes: FKs para `classes`, `factions`, `dungeons` (Task 2).
- Produces: `heroes`, `hero_classes`, `hero_factions`, `hero_labels`, `hero_dungeon_rates`, `hero_gear`, `hero_artifacts`, `hero_lineups`, `hero_videos`. Índice `(dungeon_id, rate desc)` em `hero_dungeon_rates`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0002_hero_tables.sql`:
```sql
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
```

- [ ] **Step 2: Aplicar e verificar**

Run: `supabase db reset`
Expected: ambas migrations aplicam; `\d hero_dungeon_rates` mostra o índice `idx_hdr_dungeon_rate`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_hero_tables.sql
git commit -m "feat(db): tabelas do heroi + hero_dungeon_rates invertida"
```

---

### Task 4: Módulo de glossário (dicionário curado + lookup)

**Files:**
- Create: `supabase/functions/scraper/glossary.ts`
- Test: `supabase/functions/scraper/glossary.test.ts`

**Interfaces:**
- Produces:
  - `GLOSSARY: Record<string, string>` — mapa EN→PT dos termos fixos.
  - `translateTerm(en: string): string | null` — retorna PT do glossário ou `null` se não houver.

- [ ] **Step 1: Escrever o teste que falha**

Create `supabase/functions/scraper/glossary.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { translateTerm } from './glossary.ts';

Deno.test('traduz termo conhecido de classe', () => {
  assertEquals(translateTerm('Fighter'), 'Lutador');
});

Deno.test('traduz stat com pontuacao exata', () => {
  assertEquals(translateTerm('Crit. DMG'), 'Dano Crít.');
});

Deno.test('retorna null para termo desconhecido', () => {
  assertEquals(translateTerm('Totally Unknown Term'), null);
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `deno test supabase/functions/scraper/glossary.test.ts`
Expected: FAIL ("Module not found ./glossary.ts").

- [ ] **Step 3: Implementar o glossário**

Create `supabase/functions/scraper/glossary.ts`:
```ts
// Dicionário curado EN->PT dos termos fixos do jogo.
// Ampliar conforme novos termos aparecerem no pipeline.
export const GLOSSARY: Record<string, string> = {
  // Classes
  'Fighter': 'Lutador', 'Mage': 'Mago', 'Marksman': 'Atirador',
  'Defender': 'Defensor', 'Healer': 'Curandeiro', 'Tactician': 'Tático',
  // Facções
  'Watcher': 'Vigia', 'Northerner': 'Nortista', 'Nightmare': 'Pesadelo',
  'Cultist': 'Cultista', 'Infernal': 'Infernal', 'Piercer': 'Perfurador',
  'Esotericist': 'Esotérico', 'Chaotic': 'Caótico', 'Arbiter': 'Árbitro',
  'Unnamed': 'Inominado',
  // Slots de equipamento
  'Weapon': 'Arma', 'Breastplate': 'Peitoral', 'Bangle': 'Bracelete',
  'Amulet': 'Amuleto', 'Ring': 'Anel',
  // Atributos
  'ATK': 'ATQ', 'HP': 'HP', 'DEF': 'DEF',
  'ATK Bonus': 'Bônus de ATQ', 'HP Bonus': 'Bônus de HP', 'DEF Bonus': 'Bônus de DEF',
  'Crit. Rate': 'Taxa Crít.', 'Crit. DMG': 'Dano Crít.', 'ATK Spd.': 'Vel. de ATQ',
  'Rage Regen': 'Regen. de Fúria',
  // Labels/tags comuns
  'AoE DPS': 'DPS em Área', 'Range Boost': 'Alcance Ampliado', 'Durability': 'Durabilidade',
  'Strong CC': 'Controle Forte', 'Ally Buff': 'Buff de Aliados',
  'DEF Penetration': 'Penetração de DEF', 'Anti-Air Bonus': 'Bônus Antiaéreo',
  'Single-Target DPS': 'DPS Alvo Único', 'Team Protection': 'Proteção de Equipe',
};

export function translateTerm(en: string): string | null {
  return GLOSSARY[en] ?? null;
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `deno test supabase/functions/scraper/glossary.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/glossary.ts supabase/functions/scraper/glossary.test.ts
git commit -m "feat(scraper): glossario curado EN->PT + lookup"
```

---

### Task 5: Módulo de tradução (glossário + auto injetável + cache em memória)

**Files:**
- Create: `supabase/functions/scraper/translate.ts`
- Test: `supabase/functions/scraper/translate.test.ts`

**Interfaces:**
- Consumes: `translateTerm` (Task 4).
- Produces:
  - `type AutoFn = (en: string) => Promise<string>`
  - `makeTranslator(auto: AutoFn): (en: string) => Promise<string>` — retorna função que:
    glossário exato primeiro; senão chama `auto` (memoizado por texto dentro do run).
  - `passthrough: AutoFn` — retorna o próprio texto (fallback sem provedor).

Nota: cache persistente por hash fica para a Fase 2; aqui a memoização é por execução.

- [ ] **Step 1: Escrever o teste que falha**

Create `supabase/functions/scraper/translate.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { makeTranslator, passthrough } from './translate.ts';

Deno.test('usa glossario quando ha match exato', async () => {
  let autoCalls = 0;
  const auto = async (s: string) => { autoCalls++; return 'AUTO:' + s; };
  const t = makeTranslator(auto);
  assertEquals(await t('Fighter'), 'Lutador');
  assertEquals(autoCalls, 0);
});

Deno.test('cai no auto para texto livre e memoiza', async () => {
  let autoCalls = 0;
  const auto = async (s: string) => { autoCalls++; return 'AUTO:' + s; };
  const t = makeTranslator(auto);
  assertEquals(await t('Lu Bu excels with his long range'), 'AUTO:Lu Bu excels with his long range');
  await t('Lu Bu excels with his long range');
  assertEquals(autoCalls, 1); // memoizado
});

Deno.test('passthrough devolve o proprio texto', async () => {
  assertEquals(await passthrough('qualquer coisa'), 'qualquer coisa');
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `deno test supabase/functions/scraper/translate.test.ts`
Expected: FAIL ("Module not found ./translate.ts").

- [ ] **Step 3: Implementar**

Create `supabase/functions/scraper/translate.ts`:
```ts
import { translateTerm } from './glossary.ts';

export type AutoFn = (en: string) => Promise<string>;

export const passthrough: AutoFn = async (en) => en;

export function makeTranslator(auto: AutoFn): (en: string) => Promise<string> {
  const cache = new Map<string, string>();
  return async (en: string): Promise<string> => {
    if (!en) return en;
    const fixed = translateTerm(en);
    if (fixed !== null) return fixed;
    if (cache.has(en)) return cache.get(en)!;
    const out = await auto(en);
    cache.set(en, out);
    return out;
  };
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `deno test supabase/functions/scraper/translate.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/translate.ts supabase/functions/scraper/translate.test.ts
git commit -m "feat(scraper): tradutor glossario+auto injetavel com memoizacao"
```

---

### Task 6: Transform — parse do detalhe, inversão de dungeons, extrações simples

**Files:**
- Create: `supabase/functions/scraper/transform.ts`
- Test: `supabase/functions/scraper/transform.test.ts`

**Interfaces:**
- Produces (todas puras, síncronas):
  - `parseDetail(raw: unknown): DetailData` — desembrulha `raw[0].data`.
  - `invertDungeonRates(d: DetailData): { dungeon_id: number; rate: number }[]`
  - `extractLabels(d: DetailData): string[]`
  - `extractClassIds(d: DetailData): number[]`
  - `extractFactionIds(d: DetailData): number[]`
  - `type DetailData` (exportado, usado pela Task 7 e 8).

- [ ] **Step 1: Escrever o teste que falha**

Create `supabase/functions/scraper/transform.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  parseDetail, invertDungeonRates, extractLabels,
  extractClassIds, extractFactionIds,
} from './transform.ts';

const RAW = [{
  code: 0, message: 'Success', data: {
    info: {
      id: 2843769, name: 'Lu Bu', card: 'card.png', big_card: 'big.png',
      star_level: 5, index: 5, channel: 2841953,
      special: 'Lu Bu excels...', label: ['AoE DPS', 'Range Boost'],
      class: [{ id: 2759165, title: 'Fighter' }],
      factions: [{ id: 2759162, title: 'Chaotic' }, { id: 2759156, title: 'Northerner' }],
    },
    dungeon_usage: [
      { dungeon: { id: 2663460, name: 'Gear Raid I', index: 18 }, rate: '5.91' },
      { dungeon: { id: 3279126, name: 'Titanic Ruins Matrix I Spellbane Form', index: 24 }, rate: '50.00' },
    ],
  },
}];

Deno.test('parseDetail desembrulha data', () => {
  assertEquals(parseDetail(RAW).info.id, 2843769);
});

Deno.test('invertDungeonRates converte rate para numero', () => {
  const rows = invertDungeonRates(parseDetail(RAW));
  assertEquals(rows, [
    { dungeon_id: 2663460, rate: 5.91 },
    { dungeon_id: 3279126, rate: 50 },
  ]);
});

Deno.test('extractLabels/classes/factions', () => {
  const d = parseDetail(RAW);
  assertEquals(extractLabels(d), ['AoE DPS', 'Range Boost']);
  assertEquals(extractClassIds(d), [2759165]);
  assertEquals(extractFactionIds(d), [2759162, 2759156]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/transform.test.ts`
Expected: FAIL ("Module not found ./transform.ts").

- [ ] **Step 3: Implementar**

Create `supabase/functions/scraper/transform.ts`:
```ts
export interface DetailData {
  info: {
    id: number; name: string; card?: string; big_card?: string;
    star_level?: number; index?: number; channel?: number;
    special?: string; label?: string[];
    class?: { id: number; title: string; icon?: string }[];
    factions?: { id: number; title: string; icon?: string; lord_icon?: string }[];
  };
  equipment_list?: any[];
  artifactItem_list?: any[];
  lineup?: { list?: any[] };
  dungeon_usage?: { dungeon: { id: number; name: string; index?: number; icon?: string }; rate: string }[];
}

export function parseDetail(raw: unknown): DetailData {
  const arr = raw as any[];
  if (!Array.isArray(arr) || !arr[0]?.data) throw new Error('resposta de detalhe inesperada');
  return arr[0].data as DetailData;
}

export function invertDungeonRates(d: DetailData) {
  return (d.dungeon_usage ?? []).map((u) => ({
    dungeon_id: u.dungeon.id,
    rate: Number(u.rate),
  }));
}

export function extractLabels(d: DetailData): string[] {
  return d.info.label ?? [];
}

export function extractClassIds(d: DetailData): number[] {
  return (d.info.class ?? []).map((c) => c.id);
}

export function extractFactionIds(d: DetailData): number[] {
  return (d.info.factions ?? []).map((f) => f.id);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `deno test supabase/functions/scraper/transform.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/transform.ts supabase/functions/scraper/transform.test.ts
git commit -m "feat(scraper): transform parse+inversao de dungeons+extracoes simples"
```

---

### Task 7: Transform — coleta de entidades de referência (dedup)

**Files:**
- Modify: `supabase/functions/scraper/transform.ts`
- Test: `supabase/functions/scraper/transform.refs.test.ts`

**Interfaces:**
- Consumes: `DetailData` (Task 6).
- Produces: `collectRefs(d: DetailData): Refs` (pura), com `Refs` contendo arrays dedup por id:
  `dungeons`, `classes`, `factions`, `slots`, `attributes`, `sets`, `artifacts`.

- [ ] **Step 1: Escrever o teste que falha**

Create `supabase/functions/scraper/transform.refs.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { collectRefs, parseDetail } from './transform.ts';

const RAW = [{ data: {
  info: {
    id: 1, name: 'X',
    class: [{ id: 10, title: 'Fighter', icon: 'c.png' }],
    factions: [{ id: 20, title: 'Chaotic', icon: 'f.png', lord_icon: 'l.png' }],
  },
  dungeon_usage: [{ dungeon: { id: 30, name: 'Gear Raid I', index: 18, icon: 'd.png' }, rate: '5' }],
  equipment_list: [{ type: 3, list: [{
    equipment_slot: { id: 40, name: 'Weapon', icon: 'w.png' },
    list: [{ equipment: { id: 50, icon: 'e.png', set: { id: 60, name: 'Warlord', icon: 's.png', desc: 'ATK +25%' } } }],
    main_attrs: [{ attr_id: 303, name: 'ATK', icon: 'a.png' }],
    sub_attrs: [{ attr_id: 304, name: 'ATK Bonus', icon: 'b.png' }],
  }] }],
  artifactItem_list: [{ type: 3, list: [{ artifact: { id: 70, name: 'Halberd', icon: 'h.png', desc: 'AoE +15%', quality: '1' } }] }],
} }];

Deno.test('collectRefs dedup e mapeia entidades', () => {
  const r = collectRefs(parseDetail(RAW));
  assertEquals(r.dungeons, [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }]);
  assertEquals(r.classes, [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }]);
  assertEquals(r.factions, [{ id: 20, title_en: 'Chaotic', icon_url: 'f.png', lord_icon_url: 'l.png' }]);
  assertEquals(r.slots, [{ id: 40, name_en: 'Weapon', icon_url: 'w.png' }]);
  assertEquals(r.attributes, [
    { attr_id: 303, name_en: 'ATK', icon_url: 'a.png' },
    { attr_id: 304, name_en: 'ATK Bonus', icon_url: 'b.png' },
  ]);
  assertEquals(r.sets, [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }]);
  assertEquals(r.artifacts, [{ id: 70, name_en: 'Halberd', desc_en: 'AoE +15%', icon_url: 'h.png', quality: '1' }]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/transform.refs.test.ts`
Expected: FAIL ("collectRefs is not a function").

- [ ] **Step 3: Implementar (append em transform.ts)**

Adicionar ao fim de `supabase/functions/scraper/transform.ts`:
```ts
export interface Refs {
  dungeons: { id: number; index?: number; name_en: string; icon_url?: string }[];
  classes: { id: number; title_en: string; icon_url?: string }[];
  factions: { id: number; title_en: string; icon_url?: string; lord_icon_url?: string }[];
  slots: { id: number; name_en: string; icon_url?: string }[];
  attributes: { attr_id: number; name_en: string; icon_url?: string }[];
  sets: { id: number; name_en?: string; desc_en?: string; icon_url?: string }[];
  artifacts: { id: number; name_en?: string; desc_en?: string; icon_url?: string; quality?: string }[];
}

function pushUnique<T>(arr: T[], seen: Set<number>, key: number, val: T) {
  if (!seen.has(key)) { seen.add(key); arr.push(val); }
}

export function collectRefs(d: DetailData): Refs {
  const r: Refs = { dungeons: [], classes: [], factions: [], slots: [], attributes: [], sets: [], artifacts: [] };
  const seen = { d: new Set<number>(), c: new Set<number>(), f: new Set<number>(), sl: new Set<number>(), a: new Set<number>(), s: new Set<number>(), ar: new Set<number>() };

  for (const u of d.dungeon_usage ?? [])
    pushUnique(r.dungeons, seen.d, u.dungeon.id, { id: u.dungeon.id, index: u.dungeon.index, name_en: u.dungeon.name, icon_url: u.dungeon.icon });
  for (const c of d.info.class ?? [])
    pushUnique(r.classes, seen.c, c.id, { id: c.id, title_en: c.title, icon_url: c.icon });
  for (const f of d.info.factions ?? [])
    pushUnique(r.factions, seen.f, f.id, { id: f.id, title_en: f.title, icon_url: f.icon, lord_icon_url: f.lord_icon });

  for (const group of d.equipment_list ?? []) {
    for (const slot of group.list ?? []) {
      const es = slot.equipment_slot;
      if (es) pushUnique(r.slots, seen.sl, es.id, { id: es.id, name_en: es.name, icon_url: es.icon });
      for (const opt of slot.list ?? []) {
        const set = opt.equipment?.set;
        if (set) pushUnique(r.sets, seen.s, set.id, { id: set.id, name_en: set.name, desc_en: set.desc, icon_url: set.icon });
      }
      for (const at of [...(slot.main_attrs ?? []), ...(slot.sub_attrs ?? [])])
        pushUnique(r.attributes, seen.a, at.attr_id, { attr_id: at.attr_id, name_en: at.name, icon_url: at.icon });
    }
  }
  for (const group of d.artifactItem_list ?? []) {
    for (const item of group.list ?? []) {
      const a = item.artifact;
      if (a) pushUnique(r.artifacts, seen.ar, a.id, { id: a.id, name_en: a.name, desc_en: a.desc, icon_url: a.icon, quality: a.quality });
    }
  }
  return r;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `deno test supabase/functions/scraper/transform.refs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/transform.ts supabase/functions/scraper/transform.refs.test.ts
git commit -m "feat(scraper): collectRefs dedup de entidades de referencia"
```

---

### Task 8: Transform — builders traduzidos de gear/artefatos/times (System Recommended)

**Files:**
- Modify: `supabase/functions/scraper/transform.ts`
- Test: `supabase/functions/scraper/transform.build.test.ts`

**Interfaces:**
- Consumes: `DetailData` (Task 6); um `t: (en: string) => Promise<string>` (Task 5).
- Produces (async):
  - `buildGear(d, t): Promise<GearSlotOut[]>` — só `equipment_list` com `type === 3`.
  - `buildArtifacts(d, t): Promise<ArtifactOut[]>` — só `artifactItem_list` com `type === 3`.
  - `buildLineups(d, t): Promise<LineupOut[]>` — de `lineup.list`.

- [ ] **Step 1: Escrever o teste que falha**

Create `supabase/functions/scraper/transform.build.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildGear, buildArtifacts, buildLineups, parseDetail } from './transform.ts';

const t = async (s: string) => 'PT:' + s;
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

Deno.test('buildGear traduz e estrutura o slot system-recommended', async () => {
  const g = await buildGear(parseDetail(RAW), t);
  assertEquals(g, [{
    slot: { id: 40, name: 'PT:Weapon', icon_url: 'w.png' },
    sets: [{ id: 60, name: 'PT:Warlord', desc: 'PT:ATK +25%', icon_url: 's.png', equipment_icon: 'e.png' }],
    main_attrs: [{ attr_id: 303, name: 'PT:ATK', icon_url: 'a.png' }],
    sub_attrs: [{ attr_id: 304, name: 'PT:ATK Bonus', icon_url: 'b.png' }],
  }]);
});

Deno.test('buildArtifacts type 3', async () => {
  const a = await buildArtifacts(parseDetail(RAW), t);
  assertEquals(a, [{ id: 70, name: 'PT:Halberd', desc: 'PT:AoE +15%', icon_url: 'h.png', quality: '1' }]);
});

Deno.test('buildLineups traduz nomes', async () => {
  const l = await buildLineups(parseDetail(RAW), t);
  assertEquals(l, [{ heroes: [{ id: 2, name: 'PT:Elddr', card_url: 'el.png' }] }]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/transform.build.test.ts`
Expected: FAIL ("buildGear is not a function").

- [ ] **Step 3: Implementar (append em transform.ts)**

Adicionar ao fim de `supabase/functions/scraper/transform.ts`:
```ts
export type T = (en: string) => Promise<string>;

export interface GearSlotOut {
  slot: { id: number; name: string; icon_url?: string };
  sets: { id: number; name: string; desc: string; icon_url?: string; equipment_icon?: string }[];
  main_attrs: { attr_id: number; name: string; icon_url?: string }[];
  sub_attrs: { attr_id: number; name: string; icon_url?: string }[];
}
export interface ArtifactOut { id: number; name: string; desc: string; icon_url?: string; quality?: string }
export interface LineupOut { heroes: { id: number; name: string; card_url?: string }[] }

function systemGroup(list: any[] | undefined) {
  return (list ?? []).find((g) => g.type === 3);
}

export async function buildGear(d: DetailData, t: T): Promise<GearSlotOut[]> {
  const grp = systemGroup(d.equipment_list);
  const out: GearSlotOut[] = [];
  for (const slot of grp?.list ?? []) {
    const sets: GearSlotOut['sets'] = [];
    for (const opt of slot.list ?? []) {
      const s = opt.equipment?.set;
      if (s) sets.push({ id: s.id, name: await t(s.name ?? ''), desc: await t(s.desc ?? ''), icon_url: s.icon, equipment_icon: opt.equipment?.icon });
    }
    const mapAttr = async (a: any) => ({ attr_id: a.attr_id, name: await t(a.name ?? ''), icon_url: a.icon });
    out.push({
      slot: { id: slot.equipment_slot.id, name: await t(slot.equipment_slot.name ?? ''), icon_url: slot.equipment_slot.icon },
      sets,
      main_attrs: await Promise.all((slot.main_attrs ?? []).map(mapAttr)),
      sub_attrs: await Promise.all((slot.sub_attrs ?? []).map(mapAttr)),
    });
  }
  return out;
}

export async function buildArtifacts(d: DetailData, t: T): Promise<ArtifactOut[]> {
  const grp = systemGroup(d.artifactItem_list);
  const out: ArtifactOut[] = [];
  for (const item of grp?.list ?? []) {
    const a = item.artifact;
    if (a) out.push({ id: a.id, name: await t(a.name ?? ''), desc: await t(a.desc ?? ''), icon_url: a.icon, quality: a.quality });
  }
  return out;
}

export async function buildLineups(d: DetailData, t: T): Promise<LineupOut[]> {
  const out: LineupOut[] = [];
  for (const lu of d.lineup?.list ?? []) {
    const heroes = [] as LineupOut['heroes'];
    for (const h of lu.heroes ?? []) heroes.push({ id: h.id, name: await t(h.name ?? ''), card_url: h.card });
    out.push({ heroes });
  }
  return out;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `deno test supabase/functions/scraper/transform.build.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/transform.ts supabase/functions/scraper/transform.build.test.ts
git commit -m "feat(scraper): builders traduzidos de gear/artefatos/times"
```

---

### Task 9: Cliente da API do jogo

**Files:**
- Create: `supabase/functions/scraper/api.ts`
- Test: `supabase/functions/scraper/api.test.ts`

**Interfaces:**
- Produces:
  - `API_BASE: string`, `apiUrl(path: string): string`, `gameHeaders(): HeadersInit` (puros/testáveis).
  - `fetchHeroDetail(id: number): Promise<unknown>` (retorna JSON cru p/ `parseDetail`).
  - `fetchHeroes(): Promise<any>`, `fetchClasses(): Promise<any>`, `fetchFactions(): Promise<any>`.

- [ ] **Step 1: Escrever o teste que falha (partes puras)**

Create `supabase/functions/scraper/api.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { apiUrl, gameHeaders, API_BASE } from './api.ts';

Deno.test('apiUrl concatena base', () => {
  assertEquals(apiUrl('/heroes/2843769?id=2843769'),
    API_BASE + '/heroes/2843769?id=2843769');
});

Deno.test('gameHeaders traz x-lang e x-location', () => {
  const h = gameHeaders() as Record<string, string>;
  assertEquals(h['x-lang'], 'en');
  assertEquals(h['x-location'], 'sg');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/api.test.ts`
Expected: FAIL ("Module not found ./api.ts").

- [ ] **Step 3: Implementar**

Create `supabase/functions/scraper/api.ts`:
```ts
export const API_BASE = 'https://app-web.mproject.skystone.games/actgateway/zgamecommunity';

export function apiUrl(path: string): string {
  return API_BASE + path;
}

export function gameHeaders(): HeadersInit {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://watcherofrealms.mproject.skystone.games',
    'referer': 'https://watcherofrealms.mproject.skystone.games/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'x-lang': 'en',
    'x-location': 'sg',
  };
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(apiUrl(path), { headers: gameHeaders() });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json();
}

export const fetchHeroDetail = (id: number) => getJson(`/heroes/${id}?id=${id}`);
export const fetchHeroes = () => getJson('/heroes');
export const fetchClasses = () => getJson('/classes');
export const fetchFactions = () => getJson('/factions');
```

- [ ] **Step 4: Rodar e ver passar**

Run: `deno test supabase/functions/scraper/api.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/api.ts supabase/functions/scraper/api.test.ts
git commit -m "feat(scraper): cliente da API do jogo com headers"
```

> **Nota de descoberta (vídeos):** o JSON de `/heroes/{id}` **não** traz os vídeos/guias —
> eles aparecem na seção "Player Guides" da página, servida por outro endpoint ainda não
> capturado. No PoC, `hero_videos` é gravado como `[]` e a seção de vídeos do app só
> renderiza se houver itens. Capturar o endpoint de guias fica como item da Fase 2 (ou
> um ajuste dentro da Fase 1 se você capturar o request no navegador).

---

### Task 10: Módulo de persistência (localização de refs + linha do herói + writers)

**Files:**
- Create: `supabase/functions/scraper/db.ts`
- Test: `supabase/functions/scraper/db.test.ts`

**Interfaces:**
- Consumes: `Refs` (Task 7), `DetailData` (Task 6), `T` (Task 8).
- Produces:
  - `localizeRefs(refs: Refs, t: T): Promise<LocalizedRefs>` — adiciona `*_pt` a cada entidade.
  - `buildHeroRow(d, namePt, specialPt): HeroRow` (pura).
  - `persist(sb, args): Promise<void>` — orquestra os upserts (verificado na Task 11).

- [ ] **Step 1: Escrever o teste que falha (partes puras)**

Create `supabase/functions/scraper/db.test.ts`:
```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { localizeRefs, buildHeroRow } from './db.ts';
import { parseDetail } from './transform.ts';

const t = async (s: string) => 'PT:' + s;

Deno.test('localizeRefs adiciona name_pt/title_pt/desc_pt', async () => {
  const refs = {
    dungeons: [{ id: 30, index: 18, name_en: 'Gear Raid I', icon_url: 'd.png' }],
    classes: [{ id: 10, title_en: 'Fighter', icon_url: 'c.png' }],
    factions: [], slots: [], attributes: [],
    sets: [{ id: 60, name_en: 'Warlord', desc_en: 'ATK +25%', icon_url: 's.png' }],
    artifacts: [],
  };
  const l = await localizeRefs(refs as any, t);
  assertEquals(l.dungeons[0].name_pt, 'PT:Gear Raid I');
  assertEquals(l.classes[0].title_pt, 'PT:Fighter');
  assertEquals(l.sets[0].name_pt, 'PT:Warlord');
  assertEquals(l.sets[0].desc_pt, 'PT:ATK +25%');
});

Deno.test('buildHeroRow monta a linha de heroes', () => {
  const d = parseDetail([{ data: { info: {
    id: 2843769, name: 'Lu Bu', card: 'c.png', big_card: 'b.png',
    star_level: 5, index: 5, channel: 1, special: 'excels...',
  } } }]);
  const row = buildHeroRow(d, 'Lu Bu', 'domina...');
  assertEquals(row.id, 2843769);
  assertEquals(row.name_pt, 'Lu Bu');
  assertEquals(row.special_pt, 'domina...');
  assertEquals(row.card_url, 'c.png');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `deno test supabase/functions/scraper/db.test.ts`
Expected: FAIL ("Module not found ./db.ts").

- [ ] **Step 3: Implementar**

Create `supabase/functions/scraper/db.ts`:
```ts
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { DetailData, Refs, GearSlotOut, ArtifactOut, LineupOut } from './transform.ts';

export type T = (en: string) => Promise<string>;

export interface HeroRow {
  id: number; name_en: string; name_pt: string;
  card_url?: string; big_card_url?: string; star_level?: number; index?: number;
  is_lord: boolean; channel?: number; special_en?: string; special_pt?: string;
  source_raw: unknown;
}

export function buildHeroRow(d: DetailData, namePt: string, specialPt: string): HeroRow {
  const i = d.info;
  return {
    id: i.id, name_en: i.name, name_pt: namePt,
    card_url: i.card, big_card_url: i.big_card, star_level: i.star_level, index: i.index,
    is_lord: false, channel: i.channel, special_en: i.special, special_pt: specialPt,
    source_raw: d,
  };
}

export async function localizeRefs(refs: Refs, t: T) {
  const loc = async <A extends Record<string, any>>(rows: A[], fields: [string, string][]) =>
    Promise.all(rows.map(async (r) => {
      const o: any = { ...r };
      for (const [from, to] of fields) o[to] = r[from] != null ? await t(r[from]) : null;
      return o;
    }));
  return {
    dungeons: await loc(refs.dungeons, [['name_en', 'name_pt']]),
    classes: await loc(refs.classes, [['title_en', 'title_pt']]),
    factions: await loc(refs.factions, [['title_en', 'title_pt']]),
    slots: await loc(refs.slots, [['name_en', 'name_pt']]),
    attributes: await loc(refs.attributes, [['name_en', 'name_pt']]),
    sets: await loc(refs.sets, [['name_en', 'name_pt'], ['desc_en', 'desc_pt']]),
    artifacts: await loc(refs.artifacts, [['name_en', 'name_pt'], ['desc_en', 'desc_pt']]),
  };
}
export type LocalizedRefs = Awaited<ReturnType<typeof localizeRefs>>;

export interface PersistArgs {
  hero: HeroRow;
  refs: LocalizedRefs;
  classIds: number[]; factionIds: number[];
  labels: { ordinal: number; label_en: string; label_pt: string }[];
  rates: { dungeon_id: number; rate: number }[];
  gear: GearSlotOut[]; artifacts: ArtifactOut[]; lineups: LineupOut[]; videos: unknown[];
}

export async function persist(sb: SupabaseClient, a: PersistArgs): Promise<void> {
  const up = async (table: string, rows: any[], onConflict: string) => {
    if (rows.length) { const { error } = await sb.from(table).upsert(rows, { onConflict }); if (error) throw error; }
  };
  await up('dungeons', a.refs.dungeons, 'id');
  await up('classes', a.refs.classes, 'id');
  await up('factions', a.refs.factions, 'id');
  await up('equipment_slots', a.refs.slots, 'id');
  await up('attributes', a.refs.attributes, 'attr_id');
  await up('equipment_sets', a.refs.sets, 'id');
  await up('artifacts', a.refs.artifacts, 'id');

  { const { error } = await sb.from('heroes').upsert(a.hero, { onConflict: 'id' }); if (error) throw error; }
  const hid = a.hero.id;
  await sb.from('hero_classes').delete().eq('hero_id', hid);
  await up('hero_classes', a.classIds.map((c) => ({ hero_id: hid, class_id: c })), 'hero_id,class_id');
  await sb.from('hero_factions').delete().eq('hero_id', hid);
  await up('hero_factions', a.factionIds.map((f) => ({ hero_id: hid, faction_id: f })), 'hero_id,faction_id');
  await sb.from('hero_labels').delete().eq('hero_id', hid);
  await up('hero_labels', a.labels.map((l) => ({ hero_id: hid, ...l })), 'hero_id,ordinal');
  await sb.from('hero_dungeon_rates').delete().eq('hero_id', hid);
  await up('hero_dungeon_rates', a.rates.map((r) => ({ hero_id: hid, ...r })), 'hero_id,dungeon_id');
  await up('hero_gear', [{ hero_id: hid, gear: a.gear }], 'hero_id');
  await up('hero_artifacts', [{ hero_id: hid, artifacts: a.artifacts }], 'hero_id');
  await up('hero_lineups', [{ hero_id: hid, lineups: a.lineups }], 'hero_id');
  await up('hero_videos', [{ hero_id: hid, videos: a.videos }], 'hero_id');
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `deno test supabase/functions/scraper/db.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/db.ts supabase/functions/scraper/db.test.ts
git commit -m "feat(scraper): persistencia (localizeRefs, heroRow, persist)"
```

---

### Task 11: Entrypoint da Edge Function + rodar o PoC (Lu Bu de ponta a ponta)

**Files:**
- Create: `supabase/functions/scraper/index.ts`

**Interfaces:**
- Consumes: `api.ts`, `translate.ts`, `transform.ts`, `db.ts`.
- Produces: HTTP handler. `GET ?mode=hero&id=2843769` processa e persiste um herói; `GET ?mode=refs` popula classes/factions completas.

- [ ] **Step 1: Implementar o entrypoint**

Create `supabase/functions/scraper/index.ts`:
```ts
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
```

- [ ] **Step 2: Subir a função localmente**

Run:
```bash
supabase start
supabase functions serve scraper --no-verify-jwt
```
As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente local são injetadas pelo CLI.

- [ ] **Step 3: Popular refs e o herói do PoC**

Em outro terminal:
```bash
curl "http://localhost:54321/functions/v1/scraper?mode=refs"
curl "http://localhost:54321/functions/v1/scraper?mode=hero&id=2843769"
```
Expected: `refs ok` e `hero 2843769 ok`.

- [ ] **Step 4: Verificar no banco**

Run:
```bash
supabase db shell <<'SQL'
select id, name_pt from heroes;
select count(*) from hero_dungeon_rates where hero_id = 2843769;
select jsonb_array_length(gear) from hero_gear where hero_id = 2843769;
SQL
```
Expected: 1 herói (Lu Bu); `hero_dungeon_rates` com 19 linhas; `gear` com 5 slots.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scraper/index.ts
git commit -m "feat(scraper): entrypoint modes refs/hero + PoC Lu Bu populado"
```

---

### Task 12: Leitura pública (RLS) + client Supabase + tipos do app

**Files:**
- Create: `supabase/migrations/0003_read_policies.sql`
- Create: `app/.env.local`, `app/src/lib/supabase.ts`, `app/src/lib/types.ts`
- Test: `app/src/lib/types.test.ts`

**Interfaces:**
- Produces: `supabase` (client anon); tipos `Dungeon`, `HeroCardData`, `HeroDetail`, `GearSlot`, `Artifact`, `Lineup`, `DungeonRate`.

- [ ] **Step 1: Migration de RLS + leitura pública**

Create `supabase/migrations/0003_read_policies.sql`:
```sql
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
```
Run: `supabase db reset` — Expected: aplica sem erro.

- [ ] **Step 2: Client e env**

Create `app/.env.local` (valores do `supabase status`):
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key do supabase status>
```
Create `app/src/lib/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

- [ ] **Step 3: Tipos do domínio + teste**

Create `app/src/lib/types.ts`:
```ts
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
```
Create `app/src/lib/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { Dungeon } from './types';

describe('types', () => {
  it('Dungeon aceita forma esperada', () => {
    const d: Dungeon = { id: 1, index: 18, name_pt: 'Raide', name_en: 'Raid', icon_url: null };
    expect(d.id).toBe(1);
  });
});
```

- [ ] **Step 4: Rodar teste + build**

Run: `cd app && npm test && npx tsc --noEmit`
Expected: PASS; sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_read_policies.sql app/src/lib app/.env.local
git commit -m "feat(app): RLS de leitura publica + client supabase + tipos"
```
(Confirme que `app/.env.local` está no `.gitignore`; se sim, não será comitado — ok.)

---

### Task 13: Componente RateBar

**Files:**
- Create: `app/src/components/RateBar.tsx`
- Test: `app/src/components/RateBar.test.tsx`

**Interfaces:**
- Produces: `RateBar({ value, max }: { value: number; max?: number })` — barra + valor formatado (1 casa).

- [ ] **Step 1: Teste que falha**

Create `app/src/components/RateBar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RateBar } from './RateBar';

describe('RateBar', () => {
  it('mostra o valor formatado', () => {
    render(<RateBar value={50} />);
    expect(screen.getByText('50.0')).toBeInTheDocument();
  });
  it('largura proporcional a value/max', () => {
    render(<RateBar value={25} max={50} />);
    expect(screen.getByTestId('ratebar-fill')).toHaveStyle({ width: '50%' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/RateBar.test.tsx`
Expected: FAIL ("Cannot find module './RateBar'").

- [ ] **Step 3: Implementar**

Create `app/src/components/RateBar.tsx`:
```tsx
export function RateBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="ratebar" aria-label={`taxa ${value}`}>
      <div className="ratebar-track">
        <div className="ratebar-fill" data-testid="ratebar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ratebar-value">{value.toFixed(1)}</span>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/RateBar.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/RateBar.tsx app/src/components/RateBar.test.tsx
git commit -m "feat(app): componente RateBar"
```

---

### Task 14: Componente RadarChart (SVG próprio)

**Files:**
- Create: `app/src/components/RadarChart.tsx`
- Test: `app/src/components/RadarChart.test.tsx`

**Interfaces:**
- Produces:
  - `computePolygon(values: number[], max: number, size: number): string` (pura).
  - `RadarChart({ values, labels, max, size }): JSX` — polígono + eixos numerados.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/RadarChart.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RadarChart, computePolygon } from './RadarChart';

describe('computePolygon', () => {
  it('coloca o primeiro eixo no topo', () => {
    const pts = computePolygon([10, 0, 0, 0], 10, 100).split(' ');
    expect(pts[0]).toBe('50.00,5.00'); // topo: raio 45 a partir do centro 50
  });
});

describe('RadarChart', () => {
  it('renderiza um polígono e os índices dos eixos', () => {
    render(<RadarChart values={[1, 2, 3]} labels={['1', '2', '3']} max={3} size={100} />);
    expect(document.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/RadarChart.test.tsx`
Expected: FAIL ("Cannot find module './RadarChart'").

- [ ] **Step 3: Implementar**

Create `app/src/components/RadarChart.tsx`:
```tsx
export function computePolygon(values: number[], max: number, size: number): string {
  const c = size / 2;
  const r = c * 0.9;
  const n = values.length;
  return values.map((v, i) => {
    const ratio = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = c + r * ratio * Math.cos(angle);
    const y = c + r * ratio * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export function RadarChart({ values, labels, max, size = 320 }: {
  values: number[]; labels: string[]; max: number; size?: number;
}) {
  const c = size / 2;
  const r = c * 0.9;
  const n = values.length;
  const polygon = computePolygon(values, max, size);
  return (
    <div className="radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} className="radar-grid" fill="none" />
        <polygon points={polygon} className="radar-area" />
      </svg>
      {labels.map((lab, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = c + (r + 12) * Math.cos(angle);
        const y = c + (r + 12) * Math.sin(angle);
        return (
          <span key={i} className="radar-label"
            style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)' }}>
            {lab}
          </span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/RadarChart.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/RadarChart.tsx app/src/components/RadarChart.test.tsx
git commit -m "feat(app): componente RadarChart em SVG"
```

---

### Task 15: Componente HeroCard

**Files:**
- Create: `app/src/components/HeroCard.tsx`
- Test: `app/src/components/HeroCard.test.tsx`

**Interfaces:**
- Consumes: `HeroCardData` (Task 12), `RateBar` (Task 13).
- Produces: `HeroCard({ hero, rate }: { hero: HeroCardData; rate?: number })` — imagem + nome PT (fallback EN) + RateBar quando `rate` definido.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/HeroCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroCard } from './HeroCard';

const hero = { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png' };

describe('HeroCard', () => {
  it('mostra nome e imagem', () => {
    render(<HeroCard hero={hero} />);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'c.png');
  });
  it('mostra a taxa quando fornecida', () => {
    render(<HeroCard hero={hero} rate={50} />);
    expect(screen.getByText('50.0')).toBeInTheDocument();
  });
  it('usa name_en quando name_pt e nulo', () => {
    render(<HeroCard hero={{ ...hero, name_pt: null }} />);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/HeroCard.test.tsx`
Expected: FAIL ("Cannot find module './HeroCard'").

- [ ] **Step 3: Implementar**

Create `app/src/components/HeroCard.tsx`:
```tsx
import type { HeroCardData } from '../lib/types';
import { RateBar } from './RateBar';

export function HeroCard({ hero, rate }: { hero: HeroCardData; rate?: number }) {
  const name = hero.name_pt ?? hero.name_en;
  return (
    <div className="hero-card">
      {hero.card_url && <img src={hero.card_url} alt={name} loading="lazy" />}
      <span className="hero-card-name">{name}</span>
      {rate !== undefined && <RateBar value={rate} max={50} />}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/HeroCard.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HeroCard.tsx app/src/components/HeroCard.test.tsx
git commit -m "feat(app): componente HeroCard"
```

---

### Task 16: Camada de dados (queries + hooks)

**Files:**
- Create: `app/src/lib/queries.ts`, `app/src/hooks/useAsync.ts`
- Create: `app/src/hooks/useDungeons.ts`, `useHeroesByDungeon.ts`, `useHero.ts`
- Test: `app/src/lib/queries.test.ts`

**Interfaces:**
- Produces:
  - `assembleHeroDetail(parts): HeroDetail` (pura) — junta linhas das tabelas num `HeroDetail`.
  - `getDungeons(sb)`, `getHeroesByDungeon(sb, id)`, `getHeroDetail(sb, id)` (async).
  - `useAsync<T>(fn, deps)` → `{ data, loading, error }`.
  - `useDungeons()`, `useHeroesByDungeon(id)`, `useHero(id)`.

- [ ] **Step 1: Teste que falha (assembleHeroDetail puro)**

Create `app/src/lib/queries.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assembleHeroDetail } from './queries';

describe('assembleHeroDetail', () => {
  it('monta HeroDetail a partir das partes', () => {
    const detail = assembleHeroDetail({
      hero: { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina' },
      labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
      rates: [{ dungeon_id: 30, rate: 50 }],
      gear: { gear: [] }, artifacts: { artifacts: [] }, lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.name_pt).toBe('Lu Bu');
    expect(detail.rates[0].rate).toBe(50);
    expect(detail.labels[0].label_pt).toBe('DPS em Área');
    expect(detail.gear).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/lib/queries.test.ts`
Expected: FAIL ("Cannot find module './queries'").

- [ ] **Step 3: Implementar queries + hooks**

Create `app/src/lib/queries.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Dungeon, HeroCardData, HeroDetail } from './types';

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

export async function getHeroesByDungeon(sb: SupabaseClient, dungeonId: number): Promise<(HeroCardData & { rate: number })[]> {
  const { data, error } = await sb
    .from('hero_dungeon_rates')
    .select('rate, heroes(id, name_pt, name_en, card_url)')
    .eq('dungeon_id', dungeonId)
    .order('rate', { ascending: false });
  if (error) throw error;
  return (data as any[]).map((r) => ({ ...r.heroes, rate: r.rate }));
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
```
Create `app/src/hooks/useAsync.ts`:
```ts
import { useEffect, useState } from 'react';

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then((d) => { if (alive) { setData(d); setError(null); } })
        .catch((e) => { if (alive) setError(e as Error); })
        .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}
```
Create `app/src/hooks/useDungeons.ts`:
```ts
import { supabase } from '../lib/supabase';
import { getDungeons } from '../lib/queries';
import { useAsync } from './useAsync';
export const useDungeons = () => useAsync(() => getDungeons(supabase), []);
```
Create `app/src/hooks/useHeroesByDungeon.ts`:
```ts
import { supabase } from '../lib/supabase';
import { getHeroesByDungeon } from '../lib/queries';
import { useAsync } from './useAsync';
export const useHeroesByDungeon = (id: number) => useAsync(() => getHeroesByDungeon(supabase, id), [id]);
```
Create `app/src/hooks/useHero.ts`:
```ts
import { supabase } from '../lib/supabase';
import { getHeroDetail } from '../lib/queries';
import { useAsync } from './useAsync';
export const useHero = (id: number) => useAsync(() => getHeroDetail(supabase, id), [id]);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/lib/queries.test.ts && npx tsc --noEmit`
Expected: PASS; sem erros de tipo.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/queries.ts app/src/lib/queries.test.ts app/src/hooks
git commit -m "feat(app): queries + hooks de dados"
```

---

### Task 17: Páginas Índice e Modo

**Files:**
- Create: `app/src/pages/IndexPage.tsx`, `app/src/pages/ModePage.tsx`
- Test: `app/src/pages/IndexPage.test.tsx`

**Interfaces:**
- Consumes: `useDungeons`, `useHeroesByDungeon`, `HeroCard`, `RateBar`.
- Produces: `IndexPage()` (grid de modos, link `/modo/:id`); `ModePage()` (lista ranqueada).

- [ ] **Step 1: Teste que falha (IndexPage com hook mockado)**

Create `app/src/pages/IndexPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [{ id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'd.png' }],
    loading: false, error: null,
  }),
}));

import { IndexPage } from './IndexPage';

describe('IndexPage', () => {
  it('lista os modos com nome PT', () => {
    render(<MemoryRouter><IndexPage /></MemoryRouter>);
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/pages/IndexPage.test.tsx`
Expected: FAIL ("Cannot find module './IndexPage'").

- [ ] **Step 3: Implementar as páginas**

Create `app/src/pages/IndexPage.tsx`:
```tsx
import { Link } from 'react-router-dom';
import { useDungeons } from '../hooks/useDungeons';

export function IndexPage() {
  const { data, loading, error } = useDungeons();
  if (loading) return <p>Carregando…</p>;
  if (error) return <p>Erro ao carregar modos.</p>;
  return (
    <main className="index-page">
      <h1>Modos</h1>
      <div className="mode-grid">
        {(data ?? []).map((d) => (
          <Link key={d.id} to={`/modo/${d.id}`} className="mode-tile">
            {d.icon_url && <img src={d.icon_url} alt="" loading="lazy" />}
            <span>{d.name_pt ?? d.name_en}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
```
Create `app/src/pages/ModePage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useHeroesByDungeon } from '../hooks/useHeroesByDungeon';
import { HeroCard } from '../components/HeroCard';

export function ModePage() {
  const { dungeonId } = useParams();
  const id = Number(dungeonId);
  const { data, loading, error } = useHeroesByDungeon(id);
  if (loading) return <p>Carregando…</p>;
  if (error) return <p>Erro ao carregar heróis.</p>;
  return (
    <main className="mode-page">
      <Link to="/">← Modos</Link>
      <div className="hero-list">
        {(data ?? []).map((h) => (
          <Link key={h.id} to={`/heroi/${h.id}`} className="hero-list-item">
            <HeroCard hero={h} rate={h.rate} />
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/pages/IndexPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/IndexPage.tsx app/src/pages/ModePage.tsx app/src/pages/IndexPage.test.tsx
git commit -m "feat(app): paginas Indice e Modo"
```

---

### Task 18: Componentes GearSlot e LineupRow

**Files:**
- Create: `app/src/components/GearSlot.tsx`, `app/src/components/LineupRow.tsx`
- Test: `app/src/components/GearSlot.test.tsx`, `app/src/components/LineupRow.test.tsx`

**Interfaces:**
- Consumes: `GearSlot` (tipo), `Lineup` (tipo) (Task 12).
- Produces: `GearSlotView({ slot })`; `LineupRow({ lineup })`.

- [ ] **Step 1: Testes que falham**

Create `app/src/components/GearSlot.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GearSlotView } from './GearSlot';

const slot = {
  slot: { id: 40, name: 'Arma', icon_url: 'w.png' },
  sets: [{ id: 60, name: 'Warlord', desc: 'ATQ +25%', icon_url: 's.png', equipment_icon: 'e.png' }],
  main_attrs: [{ attr_id: 303, name: 'ATQ', icon_url: 'a.png' }],
  sub_attrs: [{ attr_id: 304, name: 'Bônus de ATQ', icon_url: 'b.png' }],
};

describe('GearSlotView', () => {
  it('mostra nome do slot, set e atributos', () => {
    render(<GearSlotView slot={slot} />);
    expect(screen.getByText('Arma')).toBeInTheDocument();
    expect(screen.getByText('Warlord')).toBeInTheDocument();
    expect(screen.getByText('ATQ')).toBeInTheDocument();
    expect(screen.getByText('Bônus de ATQ')).toBeInTheDocument();
  });
});
```
Create `app/src/components/LineupRow.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LineupRow } from './LineupRow';

describe('LineupRow', () => {
  it('mostra os herois do time', () => {
    render(<LineupRow lineup={{ heroes: [{ id: 2, name: 'Elddr', card_url: 'el.png' }] }} />);
    expect(screen.getByText('Elddr')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'el.png');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/GearSlot.test.tsx src/components/LineupRow.test.tsx`
Expected: FAIL (módulos não encontrados).

- [ ] **Step 3: Implementar**

Create `app/src/components/GearSlot.tsx`:
```tsx
import type { GearSlot } from '../lib/types';

export function GearSlotView({ slot }: { slot: GearSlot }) {
  return (
    <div className="gear-slot">
      <div className="gear-slot-head">
        {slot.slot.icon_url && <img src={slot.slot.icon_url} alt="" />}
        <strong>{slot.slot.name}</strong>
      </div>
      <ul className="gear-sets">
        {slot.sets.map((s) => (
          <li key={s.id}>
            {s.icon_url && <img src={s.icon_url} alt="" />}
            <span className="set-name">{s.name}</span>
            <span className="set-desc">{s.desc}</span>
          </li>
        ))}
      </ul>
      <div className="gear-attrs">
        <div className="main"><span>Principal:</span> {slot.main_attrs.map((a) => a.name).join(', ')}</div>
        <div className="sub"><span>Secundários:</span> {slot.sub_attrs.map((a) => a.name).join(', ')}</div>
      </div>
    </div>
  );
}
```
Create `app/src/components/LineupRow.tsx`:
```tsx
import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="lineup-row">
      {lineup.heroes.map((h) => (
        <div key={h.id} className="lineup-hero">
          {h.card_url && <img src={h.card_url} alt={h.name} loading="lazy" />}
          <span>{h.name}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/GearSlot.test.tsx src/components/LineupRow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GearSlot.tsx app/src/components/LineupRow.tsx app/src/components/GearSlot.test.tsx app/src/components/LineupRow.test.tsx
git commit -m "feat(app): componentes GearSlot e LineupRow"
```

---

### Task 19: Página de detalhe do herói (HeroPage)

**Files:**
- Create: `app/src/pages/HeroPage.tsx`
- Test: `app/src/pages/HeroPage.test.tsx`

**Interfaces:**
- Consumes: `useHero`, `useDungeons`, `RadarChart`, `GearSlotView`, `LineupRow`.
- Produces: `HeroPage()` — cabeçalho, radar (alinhado à ordem das dungeons), gear, artefatos, times, descrição, vídeos (só se houver).

- [ ] **Step 1: Teste que falha (hooks mockados)**

Create `app/src/pages/HeroPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ heroId: '1' }),
}));
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({ data: [{ id: 30, index: 1, name_pt: 'Raide I', name_en: 'Gear Raid I' }], loading: false, error: null }),
}));
vi.mock('../hooks/useHero', () => ({
  useHero: () => ({
    data: {
      id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina o campo',
      labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
      rates: [{ dungeon_id: 30, rate: 50 }],
      gear: [{ slot: { id: 40, name: 'Arma' }, sets: [{ id: 60, name: 'Warlord', desc: 'ATQ +25%' }], main_attrs: [{ attr_id: 303, name: 'ATQ' }], sub_attrs: [] }],
      artifacts: [{ id: 70, name: 'Alabarda', desc: 'Área +15%' }],
      lineups: [{ heroes: [{ id: 2, name: 'Elddr', card_url: 'el.png' }] }],
      videos: [],
    }, loading: false, error: null,
  }),
}));

import { HeroPage } from './HeroPage';

describe('HeroPage', () => {
  it('renderiza cabeçalho, radar, gear, artefato, time e descrição', () => {
    render(<MemoryRouter><HeroPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Lu Bu' })).toBeInTheDocument();
    expect(screen.getByText('DPS em Área')).toBeInTheDocument();
    expect(document.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('Warlord')).toBeInTheDocument();
    expect(screen.getByText('Alabarda')).toBeInTheDocument();
    expect(screen.getByText('Elddr')).toBeInTheDocument();
    expect(screen.getByText('domina o campo')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/pages/HeroPage.test.tsx`
Expected: FAIL ("Cannot find module './HeroPage'").

- [ ] **Step 3: Implementar**

Create `app/src/pages/HeroPage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useHero } from '../hooks/useHero';
import { useDungeons } from '../hooks/useDungeons';
import { RadarChart } from '../components/RadarChart';
import { GearSlotView } from '../components/GearSlot';
import { LineupRow } from '../components/LineupRow';

export function HeroPage() {
  const { heroId } = useParams();
  const { data: hero, loading, error } = useHero(Number(heroId));
  const { data: dungeons } = useDungeons();
  if (loading) return <p>Carregando…</p>;
  if (error || !hero) return <p>Erro ao carregar herói.</p>;

  const ordered = (dungeons ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const rateMap = new Map(hero.rates.map((r) => [r.dungeon_id, r.rate]));
  const values = ordered.map((d) => rateMap.get(d.id) ?? 0);
  const labels = ordered.map((d) => String(d.index ?? ''));
  const maxRate = Math.max(50, ...values);

  return (
    <main className="hero-page">
      <Link to="/">← Modos</Link>
      <header className="hero-header">
        {hero.big_card_url && <img className="hero-big" src={hero.big_card_url} alt={hero.name_pt ?? hero.name_en} />}
        <div>
          <h1>{hero.name_pt ?? hero.name_en}</h1>
          <div className="stars">{'★'.repeat(hero.star_level ?? 0)}</div>
          <div className="labels">{hero.labels.map((l, i) => <span key={i} className="label">{l.label_pt ?? l.label_en}</span>)}</div>
        </div>
      </header>

      {values.length > 0 && (
        <section><h2>Conteúdos Ideais</h2>
          <RadarChart values={values} labels={labels} max={maxRate} /></section>
      )}

      <section><h2>Equipamento (Recomendado pelo Sistema)</h2>
        {hero.gear.map((g) => <GearSlotView key={g.slot.id} slot={g} />)}</section>

      <section><h2>Artefatos</h2>
        <ul className="artifact-list">
          {hero.artifacts.map((a) => (
            <li key={a.id}>{a.icon_url && <img src={a.icon_url} alt="" />}<span>{a.name}</span><span className="desc">{a.desc}</span></li>
          ))}
        </ul></section>

      <section><h2>Times Recomendados</h2>
        {hero.lineups.map((l, i) => <LineupRow key={i} lineup={l} />)}</section>

      <section><h2>Descrição</h2><p>{hero.special_pt}</p></section>

      {hero.videos.length > 0 && (
        <section><h2>Vídeos</h2><p>{hero.videos.length} guia(s) disponível(is)</p></section>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/pages/HeroPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/HeroPage.tsx app/src/pages/HeroPage.test.tsx
git commit -m "feat(app): pagina de detalhe do heroi"
```

---

### Task 20: Router, configuração PWA e verificação de ponta a ponta

**Files:**
- Modify: `app/src/App.tsx`, `app/src/main.tsx`, `app/vite.config.ts`
- Create: `app/public/manifest` ícones (placeholder) e estilos base em `app/src/index.css`

**Interfaces:**
- Consumes: todas as páginas.
- Produces: app roteado e instalável (PWA), exibindo o Lu Bu de ponta a ponta.

- [ ] **Step 1: Router**

Replace `app/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IndexPage } from './pages/IndexPage';
import { ModePage } from './pages/ModePage';
import { HeroPage } from './pages/HeroPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/modo/:dungeonId" element={<ModePage />} />
        <Route path="/heroi/:heroId" element={<HeroPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```
Garanta que `app/src/main.tsx` importe `./index.css` e renderize `<App />`.

- [ ] **Step 2: Configurar PWA**

Replace `app/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'WoR Guia de Heróis',
        short_name: 'WoR Guia',
        theme_color: '#0f1a2b',
        background_color: '#0f1a2b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [{
          urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
          handler: 'StaleWhileRevalidate',
          options: { cacheName: 'supabase-data' },
        }],
      },
    }),
  ],
});
```
Adicione dois ícones PNG placeholder em `app/public/pwa-192.png` e `app/public/pwa-512.png` (podem ser quadrados simples por enquanto).

- [ ] **Step 3: Estilos base mínimos**

Create `app/src/index.css` com layout básico (grid de modos, lista de heróis, `.radar { position: relative }`, `.ratebar-track`/`.ratebar-fill`). Regra obrigatória: `.radar { position: relative; }` para os rótulos absolutos; `.ratebar-fill { background: #4f8cff; height: 8px; }`.

- [ ] **Step 4: Verificação de ponta a ponta (a fatia vertical do PoC)**

Pré-condição: `supabase start` rodando e o PoC populado (Task 11).
Run: `cd app && npm run dev`
Verificar no navegador:
1. `/` mostra o grid dos 19 modos com nomes em PT.
2. Clicar em "Titanic Ruins Matrix I Spellbane Form" (index 24) → o Lu Bu aparece no topo com taxa ~50.
3. Clicar no Lu Bu → detalhe renderiza: radar preenchido, gear System Recommended (5 slots), artefatos, times, descrição em PT.

Também rodar toda a suíte:
Run: `cd app && npm test` e `deno test supabase/functions/scraper/`
Expected: todos os testes passam.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/main.tsx app/vite.config.ts app/src/index.css app/public/pwa-192.png app/public/pwa-512.png
git commit -m "feat(app): router + PWA + estilos; PoC ponta a ponta verificado"
```

---

## Verificação final da Fase 1

- [ ] Todos os testes Deno passam (`deno test supabase/functions/scraper/`).
- [ ] Todos os testes do app passam (`cd app && npm test`).
- [ ] `npx tsc --noEmit` no app sem erros.
- [ ] Fatia vertical confirmada no navegador: índice → modo → detalhe do Lu Bu, em PT.
- [ ] Banco: 1 herói, 19 linhas em `hero_dungeon_rates`, gear com 5 slots.

## Follow-ups (Fase 2 — plano separado)

- `mode=all`: iterar `/heroes` e processar todos os heróis com rate limiting.
- Agendamento cron (pg_cron / Scheduled Edge Function).
- Provedor real de tradução automática (DeepL/Google) + cache persistente por hash.
- Endpoint de vídeos/guias (capturar o request da seção "Player Guides").
- Abas "Server Stats"/"Top Player Stats" de gear (types 1 e 2, com `rate`).
- Espelhar imagens no Supabase Storage (opcional).
