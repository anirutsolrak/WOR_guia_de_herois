# Redesign da tela de Modo (ranking em linhas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `/modo/:dungeonId` como um ranking em linhas (leaderboard) com identidade de facção, reusando o design system, e estender a camada de dados para trazer as facções dos heróis.

**Architecture:** Uma função pura mapeia a facção (EN) para a CSS var da cor (`factionColors.ts`). `getHeroesByDungeon` passa a trazer as facções via nested select; o achatamento vira função pura testável (`mapHeroRankItems`). Componentes de apresentação (`HeroRankRow`, `AppShell` com prop `banner`) montam a tela; `ModePage` é reescrita usando `useDungeons` (header) + `useHeroesByDungeon` (lista).

**Tech Stack:** Vite + React 18 + TS, Tailwind v4 (tokens já configurados), Vitest + Testing Library, react-router-dom, `@supabase/supabase-js`.

## Global Constraints

- Reusa o design system existente (tokens Tailwind `bg-surface`/`text-fg`/`text-muted`/`border-*`/`font-display`, cores de facção `--color-faction-*`). Dark-only.
- Extensão de dados permitida SÓ nisto: `getHeroesByDungeon` ganha as facções; novos `mapHeroRankItems` (puro), tipo `HeroRankItem`, e `factionColors.ts`. Nada mais no pipeline/queries.
- `factionColor(titleEn)` retorna a CSS var da cor da facção (ex.: `'Chaotic' → 'var(--color-faction-chaotic)'`); desconhecido → `var(--color-faction-unnamed)`.
- Suíte automatizada **offline** (sem testes de rede). A extensão da query é verificada por checagem manual contra o Supabase real (anon key do `app/.env.local`) na Task 2.
- Linha do ranking é `<Link>` para `/heroi/:id`; nome usa `name_pt ?? name_en`; rate normalizado por `max(50, maiorRateDaLista)`.
- `HeroCard` e o CSS legado ficam intactos (deixam de ser usados no Modo, não removê-los).

---

## Mapa de arquivos

- `app/src/lib/types.ts` — adicionar `HeroRankItem`.
- `app/src/lib/factionColors.ts` — `factionColor()` (puro) + teste.
- `app/src/lib/queries.ts` — `mapHeroRankItems()` (puro) + estender `getHeroesByDungeon`.
- `app/src/components/AppShell.tsx` — prop opcional `banner?: string`.
- `app/src/components/HeroRankRow.tsx` — a linha do ranking + teste.
- `app/src/pages/ModePage.tsx` — reescrita + teste.
- Testes: `factionColors.test.ts`, `queries.test.ts` (add mapHeroRankItems), `AppShell.test.tsx` (add banner), `HeroRankRow.test.tsx`, `ModePage.test.tsx`.

---

### Task 1: factionColors (puro)

**Files:**
- Create: `app/src/lib/factionColors.ts`
- Test: `app/src/lib/factionColors.test.ts`

**Interfaces:**
- Produces: `factionColor(titleEn: string): string` — CSS var da cor da facção.

- [ ] **Step 1: Teste que falha**

Create `app/src/lib/factionColors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { factionColor } from './factionColors';

describe('factionColor', () => {
  const cases: [string, string][] = [
    ['Watcher', 'var(--color-faction-watcher)'],
    ['Northerner', 'var(--color-faction-northerner)'],
    ['Nightmare', 'var(--color-faction-nightmare)'],
    ['Cultist', 'var(--color-faction-cultist)'],
    ['Infernal', 'var(--color-faction-infernal)'],
    ['Piercer', 'var(--color-faction-piercer)'],
    ['Esotericist', 'var(--color-faction-esotericist)'],
    ['Chaotic', 'var(--color-faction-chaotic)'],
    ['Arbiter', 'var(--color-faction-arbiter)'],
    ['Unnamed', 'var(--color-faction-unnamed)'],
  ];
  it.each(cases)('%s -> %s', (en, cssVar) => {
    expect(factionColor(en)).toBe(cssVar);
  });
  it('desconhecido cai em unnamed', () => {
    expect(factionColor('Qualquer')).toBe('var(--color-faction-unnamed)');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/lib/factionColors.test.ts`
Expected: FAIL ("Cannot find module './factionColors'").

- [ ] **Step 3: Implementar**

Create `app/src/lib/factionColors.ts`:
```ts
const KEYS: Record<string, string> = {
  Watcher: 'watcher',
  Northerner: 'northerner',
  Nightmare: 'nightmare',
  Cultist: 'cultist',
  Infernal: 'infernal',
  Piercer: 'piercer',
  Esotericist: 'esotericist',
  Chaotic: 'chaotic',
  Arbiter: 'arbiter',
  Unnamed: 'unnamed',
};

export function factionColor(titleEn: string): string {
  const key = KEYS[titleEn] ?? 'unnamed';
  return `var(--color-faction-${key})`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/lib/factionColors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/factionColors.ts app/src/lib/factionColors.test.ts
git commit -m "feat(app): factionColor (cor por facção)"
```

---

### Task 2: Estender getHeroesByDungeon com as facções (+ mapeamento puro)

**Files:**
- Modify: `app/src/lib/types.ts` (add `HeroRankItem`)
- Modify: `app/src/lib/queries.ts` (add `mapHeroRankItems`, estender `getHeroesByDungeon`)
- Test: `app/src/lib/queries.test.ts` (add testes de `mapHeroRankItems`)

**Interfaces:**
- Produces:
  - `HeroRankItem { id: number; name_pt: string | null; name_en: string; card_url: string | null; rate: number; factions: { title_en: string; title_pt: string | null }[] }`
  - `mapHeroRankItems(rows: any[]): HeroRankItem[]` (puro)
  - `getHeroesByDungeon(sb, dungeonId): Promise<HeroRankItem[]>` (query estendida)

- [ ] **Step 1: Teste que falha (mapeamento puro)**

Append em `app/src/lib/queries.test.ts`:
```ts
import { mapHeroRankItems } from './queries';

describe('mapHeroRankItems', () => {
  it('achata o payload nested (heroes + hero_factions.factions)', () => {
    const rows = [{
      rate: 50,
      heroes: {
        id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png',
        hero_factions: [
          { factions: { title_en: 'Chaotic', title_pt: 'Caótico' } },
          { factions: { title_en: 'Northerner', title_pt: 'Nortista' } },
        ],
      },
    }];
    const out = mapHeroRankItems(rows);
    expect(out[0]).toEqual({
      id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50,
      factions: [
        { title_en: 'Chaotic', title_pt: 'Caótico' },
        { title_en: 'Northerner', title_pt: 'Nortista' },
      ],
    });
  });
  it('herói sem facções vira []', () => {
    const out = mapHeroRankItems([{ rate: 1, heroes: { id: 2, name_pt: null, name_en: 'X', card_url: null } }]);
    expect(out[0].factions).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/lib/queries.test.ts`
Expected: FAIL ("mapHeroRankItems is not a function" / não exportado).

- [ ] **Step 3: Implementar**

Em `app/src/lib/types.ts`, adicionar:
```ts
export interface HeroRankItem {
  id: number;
  name_pt: string | null;
  name_en: string;
  card_url: string | null;
  rate: number;
  factions: { title_en: string; title_pt: string | null }[];
}
```
Em `app/src/lib/queries.ts`, adicionar `mapHeroRankItems` e reescrever `getHeroesByDungeon`
(importe `HeroRankItem` do `./types`):
```ts
export function mapHeroRankItems(rows: any[]): import('./types').HeroRankItem[] {
  return (rows ?? []).map((r) => {
    const h = r.heroes;
    return {
      id: h.id, name_pt: h.name_pt, name_en: h.name_en, card_url: h.card_url,
      rate: r.rate,
      factions: (h.hero_factions ?? []).map((hf: any) => hf.factions).filter(Boolean),
    };
  });
}

export async function getHeroesByDungeon(sb: SupabaseClient, dungeonId: number): Promise<import('./types').HeroRankItem[]> {
  const { data, error } = await sb
    .from('hero_dungeon_rates')
    .select('rate, heroes(id, name_pt, name_en, card_url, hero_factions(factions(title_en, title_pt)))')
    .eq('dungeon_id', dungeonId)
    .order('rate', { ascending: false });
  if (error) throw error;
  return mapHeroRankItems(data as any[]);
}
```
(Substitua a versão antiga de `getHeroesByDungeon`. Se preferir, importe `HeroRankItem` no topo em vez do `import('./types')` inline — desde que `tsc` fique limpo. **Atenção:** se o import de `HeroCardData` no topo de `queries.ts` ficar sem uso após a troca, remova-o do import para não quebrar o `tsc` com `noUnusedLocals`.)

- [ ] **Step 4: Rodar e ver passar + tsc**

Run: `cd app && npx vitest run src/lib/queries.test.ts && npx tsc --noEmit`
Expected: os 2 testes novos passam; `tsc` limpo (o `ModePage` antigo ainda compila — `HeroRankItem` é superset de `HeroCardData`).

- [ ] **Step 5: Verificação manual contra o Supabase real (sem teste de rede na suíte)**

Leia a URL e a anon key de `app/.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e rode:
```bash
URL=$(grep VITE_SUPABASE_URL app/.env.local | cut -d= -f2)
ANON=$(grep VITE_SUPABASE_ANON_KEY app/.env.local | cut -d= -f2)
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$URL/rest/v1/hero_dungeon_rates?dungeon_id=eq.3279126&select=rate,heroes(name_pt,hero_factions(factions(title_en,title_pt)))&order=rate.desc"
```
Expected: retorna o Lu Bu (`name_pt: "Lu Bu"`) com `hero_factions` contendo `Chaotic`/`Caótico` e `Northerner`/`Nortista`. Isso confirma que o nested select da query funciona no banco real. Cole o resultado no report.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/types.ts app/src/lib/queries.ts app/src/lib/queries.test.ts
git commit -m "feat(app): getHeroesByDungeon traz facções + mapHeroRankItems"
```

---

### Task 3: AppShell ganha prop `banner`

**Files:**
- Modify: `app/src/components/AppShell.tsx`
- Modify: `app/src/components/AppShell.test.tsx`

**Interfaces:**
- Produces: `AppShell` aceita `banner?: string` — quando presente, uma imagem de fundo (sutil) atrás do conteúdo da faixa, sob o brilho radial.

- [ ] **Step 1: Teste que falha (adicionar casos de banner)**

Append em `app/src/components/AppShell.test.tsx` (dentro do `describe('AppShell')`):
```ts
  it('mostra o banner de fundo quando passado', () => {
    render(<AppShell title="T" banner="b.png"><div /></AppShell>);
    expect(screen.getByTestId('shell-banner')).toHaveAttribute('src', 'b.png');
  });
  it('sem banner, não renderiza a imagem de fundo', () => {
    render(<AppShell title="T"><div /></AppShell>);
    expect(screen.queryByTestId('shell-banner')).toBeNull();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/AppShell.test.tsx`
Expected: FAIL (os 2 casos novos — `shell-banner` não existe).

- [ ] **Step 3: Implementar**

Em `app/src/components/AppShell.tsx`:
1. Adicionar `banner?: string` à assinatura de props (junto de `title`, `subtitle`, `search`, `onSearch`, `children`).
2. Dentro do `<header ...>` (que já é `relative overflow-hidden`), como PRIMEIRO filho, antes do `<div className="mx-auto max-w-5xl ...">`, inserir:
```tsx
{banner && (
  <img
    data-testid="shell-banner"
    src={banner}
    alt=""
    className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right opacity-20"
  />
)}
```
O conteúdo da faixa (marca/título/subtítulo/busca) já vem depois e fica por cima; o brilho radial do `<header>` continua. (Não mexa no resto do componente.)

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/AppShell.test.tsx`
Expected: PASS (os 3 testes antigos + 2 novos).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/AppShell.tsx app/src/components/AppShell.test.tsx
git commit -m "feat(app): AppShell aceita banner de fundo"
```

---

### Task 4: Componente HeroRankRow

**Files:**
- Create: `app/src/components/HeroRankRow.tsx`
- Test: `app/src/components/HeroRankRow.test.tsx`

**Interfaces:**
- Consumes: `HeroRankItem` (Task 2), `factionColor` (Task 1).
- Produces: `HeroRankRow({ item, rank, maxRate }: { item: HeroRankItem; rank: number; maxRate: number })` — uma linha do ranking, link para `/heroi/:id`.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/HeroRankRow.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HeroRankRow } from './HeroRankRow';

const item = {
  id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50,
  factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
};

describe('HeroRankRow', () => {
  it('renderiza rank, nome, chip de facção, valor e link para o herói', () => {
    render(<MemoryRouter><HeroRankRow item={item} rank={1} maxRate={50} /></MemoryRouter>);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lu Bu/i })).toHaveAttribute('href', '/heroi/1');
  });
  it('usa name_en quando name_pt é nulo', () => {
    render(<MemoryRouter><HeroRankRow item={{ ...item, name_pt: null }} rank={2} maxRate={50} /></MemoryRouter>);
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/HeroRankRow.test.tsx`
Expected: FAIL ("Cannot find module './HeroRankRow'").

- [ ] **Step 3: Implementar**

Create `app/src/components/HeroRankRow.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { HeroRankItem } from '../lib/types';
import { factionColor } from '../lib/factionColors';

export function HeroRankRow({ item, rank, maxRate }: { item: HeroRankItem; rank: number; maxRate: number }) {
  const name = item.name_pt ?? item.name_en;
  const ringColor = factionColor(item.factions[0]?.title_en ?? 'Unnamed');
  const pct = Math.max(0, Math.min(100, (item.rate / maxRate) * 100));
  const medal = rank === 1 ? '#e0b23c' : rank === 2 ? '#c4ccd6' : rank === 3 ? '#cd7f32' : undefined;

  return (
    <Link
      to={`/heroi/${item.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                 transition hover:border-accent/50 hover:bg-surface-2"
    >
      <span className="w-7 shrink-0 text-center font-display text-lg font-bold"
            style={{ color: medal ?? 'var(--color-muted)' }}>{rank}</span>

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2" style={{ borderColor: ringColor }}>
        {item.card_url && <img src={item.card_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display font-semibold text-fg">{name}</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {item.factions.map((f) => (
            <span key={f.title_en}
                  className="rounded-full border px-2 py-[1px] text-[11px]"
                  style={{ color: factionColor(f.title_en), borderColor: factionColor(f.title_en) }}>
              {f.title_pt ?? f.title_en}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-28 shrink-0 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-strong">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right text-xs tabular-nums text-muted">{item.rate.toFixed(1)}</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/HeroRankRow.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HeroRankRow.tsx app/src/components/HeroRankRow.test.tsx
git commit -m "feat(app): componente HeroRankRow (linha do ranking)"
```

---

### Task 5: Reescrever ModePage

**Files:**
- Modify (reescrever): `app/src/pages/ModePage.tsx`
- Create: `app/src/pages/ModePage.test.tsx`

**Interfaces:**
- Consumes: `useDungeons` (header), `useHeroesByDungeon` (lista, agora `HeroRankItem[]`), `AppShell` (com `banner`), `HeroRankRow`.
- Produces: `ModePage()` — cabeçalho com identidade do modo + ranking em linhas + estado vazio.

- [ ] **Step 1: Escrever o teste (que falha com a ModePage antiga)**

Create `app/src/pages/ModePage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const { heroesMock } = vi.hoisted(() => ({ heroesMock: vi.fn() }));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ dungeonId: '30' }),
}));
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [{ id: 30, index: 12, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'b.png' }],
    loading: false, error: null,
  }),
}));
vi.mock('../hooks/useHeroesByDungeon', () => ({
  useHeroesByDungeon: () => heroesMock(),
}));

import { ModePage } from './ModePage';

const renderPage = () => render(<MemoryRouter><ModePage /></MemoryRouter>);

describe('ModePage', () => {
  it('mostra o nome do modo no header e as linhas do ranking', () => {
    heroesMock.mockReturnValue({
      data: [{ id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'c.png', rate: 50, factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }] }],
      loading: false, error: null,
    });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Guerra de Guilda' })).toBeInTheDocument();
    expect(screen.getByText('Lu Bu')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
  });
  it('mostra estado vazio quando não há heróis', () => {
    heroesMock.mockReturnValue({ data: [], loading: false, error: null });
    renderPage();
    expect(screen.getByText(/Nenhum herói ranqueado/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/pages/ModePage.test.tsx`
Expected: FAIL (a ModePage antiga não tem header com nome do modo nem o estado vazio).

- [ ] **Step 3: Reescrever a ModePage**

Overwrite `app/src/pages/ModePage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useDungeons } from '../hooks/useDungeons';
import { useHeroesByDungeon } from '../hooks/useHeroesByDungeon';
import { AppShell } from '../components/AppShell';
import { HeroRankRow } from '../components/HeroRankRow';

export function ModePage() {
  const { dungeonId } = useParams();
  const id = Number(dungeonId);
  const { data: dungeons } = useDungeons();
  const { data, loading, error } = useHeroesByDungeon(id);

  const mode = (dungeons ?? []).find((d) => d.id === id);
  const title = mode ? (mode.name_pt ?? mode.name_en) : 'Modo';
  const items = data ?? [];
  const maxRate = Math.max(50, ...items.map((h) => h.rate));

  return (
    <AppShell title={title} subtitle="Ranking de heróis" banner={mode?.icon_url ?? undefined}>
      <Link to="/" className="mb-4 inline-block text-sm text-muted hover:text-fg">← Modos</Link>
      {loading && <p className="text-muted">Carregando…</p>}
      {error && <p className="text-muted">Erro ao carregar heróis.</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-muted">Nenhum herói ranqueado ainda neste modo.</p>
      )}
      <div className="space-y-2">
        {items.map((item, i) => (
          <HeroRankRow key={item.id} item={item} rank={i + 1} maxRate={maxRate} />
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Rodar e ver passar (e a suíte + tsc)**

Run: `cd app && npx vitest run src/pages/ModePage.test.tsx && npx vitest run && npx tsc --noEmit`
Expected: o teste do Modo passa; a suíte inteira passa; `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/ModePage.tsx app/src/pages/ModePage.test.tsx
git commit -m "feat(app): tela de Modo redesenhada (ranking em linhas)"
```

---

## Verificação final

- [ ] `cd app && npx vitest run` — suíte inteira passa.
- [ ] `cd app && npx tsc --noEmit` — sem erros.
- [ ] `cd app && npm run build` — build conclui.
- [ ] Manual (Task 2 Step 5): a query estendida retorna as facções no Supabase real.
- [ ] Visual (você/humano): `npm run dev` → abrir um modo (ex.: Titanic Spellbane) → cabeçalho com o nome/banner do modo, e o Lu Bu numa linha de ranking com anel/chip de facção (Caótico/Nortista) e barra de rate. Modos vazios mostram o estado vazio.

## Follow-ups (fora deste plano)

- Redesign da tela **Herói**.
- Tier badges (S/A/B) a partir do rate.
- Chip de classe (join de classe) além do de facção.
- Remover `HeroCard` legado quando nada mais usar.
