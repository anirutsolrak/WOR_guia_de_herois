# Busca universal de heróis + posição por conteúdo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma barra de busca de heróis global no header e, na página do herói, uma
lista da sua posição (rank) em cada um dos 19 conteúdos.

**Architecture:** Os 161 heróis são carregados uma vez num cache de módulo e filtrados em
memória por uma função pura (`searchHeroes`), consumida por um combobox montado no `AppShell`.
A posição por conteúdo vem de uma view no Postgres (`hero_dungeon_ranks`) com `rank()` e
`count()` como window functions, lida pela mesma chamada `getHeroDetail` que já existe.

**Tech Stack:** React 19 + React Router 7, TypeScript, Tailwind 4, Vite 8, Vitest 4 +
Testing Library, Supabase (Postgres + PostgREST).

**Spec:** `docs/superpowers/specs/2026-09-10-busca-universal-design.md`

## Global Constraints

- Diretório de trabalho do app: `app/`. Todos os comandos `npm` rodam lá.
- Testes: `npm test` (roda `vitest run --passWithNoTests`). Para um arquivo só:
  `npx vitest run src/lib/heroSearch.test.ts`.
- Baseline antes deste plano: **17 arquivos de teste, 60 testes, todos passando.** Nenhuma task
  pode deixar o suite vermelho no commit.
- Textos de interface em **português**; nomes de teste em português, como nos arquivos vizinhos.
- Nomes exibidos de herói e de modo seguem sempre `name_pt ?? name_en`.
- Só funções **puras** ganham teste unitário em `lib/queries.ts` — funções que chamam o
  Supabase não são testadas (convenção existente em `queries.test.ts`).
- Estilo: Tailwind com os tokens do projeto (`bg-surface`, `border-border`, `text-muted`,
  `text-subtle`, `text-fg`, `bg-surface-2`, `border-border-strong`, `from-accent`, `to-accent-2`).
- Commits em português, no padrão `feat(escopo): …` / `test(escopo): …` do histórico.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0006_hero_dungeon_ranks.sql` | View `hero_dungeon_ranks` + grant de leitura (novo) |
| `app/src/lib/types.ts` | `HeroSearchItem` (novo); `DungeonRate` += `rank`, `total` |
| `app/src/lib/heroSearch.ts` | `normalize`, `displayName`, `searchHeroes` — puro, sem React (novo) |
| `app/src/lib/queries.ts` | `getHeroSearchIndex` (novo); `getHeroDetail` lê a view; `assembleHeroDetail` converte tipos |
| `app/src/hooks/useHeroSearchIndex.ts` | Cache de módulo + `useAsync` (novo) |
| `app/src/components/HeroSearchBar.tsx` | Combobox acessível de busca (novo) |
| `app/src/components/HeroContentRanks.tsx` | Lista de posição por conteúdo (novo) |
| `app/src/components/AppShell.tsx` | Remove `search`/`onSearch`; monta `HeroSearchBar` |
| `app/src/pages/IndexPage.tsx` | Filtro de modos migra para o corpo da página |
| `app/src/pages/HeroPage.tsx` | Usa `useDungeons` e renderiza `HeroContentRanks` |

**Ordem das tasks:** 1 (banco) → 2 (busca pura) → 3 (dados da busca) → 4 (componente de busca)
→ 5 (montagem no shell) → 6 (dados de rank) → 7 (componente de rank) → 8 (montagem na página).
As tasks 2–5 e 6–8 são independentes entre si depois da task 1.

---

### Task 1: View `hero_dungeon_ranks` no Postgres

**Files:**
- Create: `supabase/migrations/0006_hero_dungeon_ranks.sql`

**Interfaces:**
- Consumes: tabela `hero_dungeon_rates (hero_id, dungeon_id, rate)` de `0002_hero_tables.sql`.
- Produces: view `hero_dungeon_ranks (hero_id bigint, dungeon_id bigint, rate numeric,
  rank bigint, total bigint)`, legível via PostgREST em `/rest/v1/hero_dungeon_ranks`.

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/0006_hero_dungeon_ranks.sql`:

```sql
create or replace view hero_dungeon_ranks as
select
  hero_id,
  dungeon_id,
  rate,
  rank()   over (partition by dungeon_id order by rate desc) as rank,
  count(*) over (partition by dungeon_id)                    as total
from hero_dungeon_rates;

grant select on hero_dungeon_ranks to anon, authenticated;
```

`rank()` e não `dense_rank()`: em empate de `rate`, dois heróis dividem a posição e a seguinte
é pulada — é como um ranking de jogo se comporta. A view herda o RLS de `hero_dungeon_rates`,
que já tem `public_read` (ver `0003_read_policies.sql`); não há dado privado envolvido.

- [ ] **Step 2: Aplicar no projeto da nuvem**

```bash
supabase db push
```

Esperado: a saída lista `0006_hero_dungeon_ranks.sql` como aplicada.

- [ ] **Step 3: Verificar que a view responde e os números fecham**

Do diretório `app/`, usando as credenciais de `.env.local`:

```bash
URL=$(grep -o 'VITE_SUPABASE_URL=.*' .env.local | cut -d= -f2-)
KEY=$(grep -o 'VITE_SUPABASE_ANON_KEY=.*' .env.local | cut -d= -f2-)
curl -s -H "apikey: $KEY" \
  "$URL/rest/v1/hero_dungeon_ranks?dungeon_id=eq.30&order=rank.asc&limit=3&select=hero_id,rate,rank,total"
```

Esperado: três objetos com `rank` 1, 2, 3 (ou empates repetindo a posição), `rate` decrescente
e o mesmo `total` nos três. Se vier `[]`, a dungeon 30 não tem rates — repetir com outro
`dungeon_id` retornado por `curl -s -H "apikey: $KEY" "$URL/rest/v1/dungeons?select=id&limit=5"`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_hero_dungeon_ranks.sql
git commit -m "feat(db): view hero_dungeon_ranks (posição do herói por conteúdo)"
```

---

### Task 2: `searchHeroes` — filtro puro de heróis

**Files:**
- Create: `app/src/lib/heroSearch.ts`
- Create: `app/src/lib/heroSearch.test.ts`
- Modify: `app/src/lib/types.ts` (adiciona `HeroSearchItem`)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces:
  - `interface HeroSearchItem { id: number; name_pt: string | null; name_en: string; card_url: string | null }`
  - `normalize(s: string): string`
  - `displayName(h: HeroSearchItem): string`
  - `searchHeroes(items: HeroSearchItem[], q: string, limit?: number): HeroSearchItem[]`

- [ ] **Step 1: Adicionar o tipo**

Em `app/src/lib/types.ts`, junto dos outros `export interface`:

```ts
export interface HeroSearchItem { id: number; name_pt: string | null; name_en: string; card_url: string | null; }
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `app/src/lib/heroSearch.test.ts`:

```tsx
import { describe, it, expect } from 'vitest';
import { normalize, displayName, searchHeroes } from './heroSearch';
import type { HeroSearchItem } from './types';

const heroes: HeroSearchItem[] = [
  { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' },
  { id: 2, name_pt: 'Zéfiro', name_en: 'Zephyr', card_url: 'ze.png' },
  { id: 3, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: 'ld.png' },
  { id: 4, name_pt: null, name_en: 'Baludo', card_url: null },
];

describe('normalize', () => {
  it('tira acento e caixa', () => {
    expect(normalize('Zéfiro')).toBe('zefiro');
    expect(normalize('CAÓTICO')).toBe('caotico');
  });
});

describe('displayName', () => {
  it('prefere name_pt e cai para name_en quando nulo', () => {
    expect(displayName(heroes[1])).toBe('Zéfiro');
    expect(displayName(heroes[3])).toBe('Baludo');
  });
});

describe('searchHeroes', () => {
  it('busca sem acento nos dois sentidos', () => {
    expect(searchHeroes(heroes, 'zefiro').map((h) => h.id)).toEqual([2]);
    expect(searchHeroes(heroes, 'Zéf').map((h) => h.id)).toEqual([2]);
  });

  it('casa pelo name_en quando o PT difere', () => {
    expect(searchHeroes(heroes, 'zephyr').map((h) => h.id)).toEqual([2]);
  });

  it('coloca quem começa com o termo antes de quem só o contém', () => {
    expect(searchHeroes(heroes, 'lu').map((h) => h.id)).toEqual([1, 3, 4]);
  });

  it('ordena alfabeticamente dentro do mesmo grupo', () => {
    expect(searchHeroes(heroes, 'lud').map((h) => h.id)).toEqual([3, 4]);
  });

  it('respeita o limite', () => {
    expect(searchHeroes(heroes, 'lu', 2).map((h) => h.id)).toEqual([1, 3]);
  });

  it('termo vazio ou só espaços devolve lista vazia', () => {
    expect(searchHeroes(heroes, '')).toEqual([]);
    expect(searchHeroes(heroes, '   ')).toEqual([]);
  });
});
```

- [ ] **Step 3: Rodar os testes e ver falhar**

```bash
cd app && npx vitest run src/lib/heroSearch.test.ts
```

Esperado: FAIL — `Failed to resolve import "./heroSearch"`.

- [ ] **Step 4: Implementar**

Criar `app/src/lib/heroSearch.ts`:

```ts
import type { HeroSearchItem } from './types';

/** Minúsculas e sem diacríticos, para que "Zéfiro" e "zefiro" casem. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function displayName(h: HeroSearchItem): string {
  return h.name_pt ?? h.name_en;
}

export function searchHeroes(items: HeroSearchItem[], q: string, limit = 8): HeroSearchItem[] {
  const nq = normalize(q.trim());
  if (!nq) return [];

  const hits = [];
  for (const item of items) {
    const pt = item.name_pt ? normalize(item.name_pt) : '';
    const en = normalize(item.name_en);
    if (!pt.includes(nq) && !en.includes(nq)) continue;
    hits.push({
      item,
      prefix: pt.startsWith(nq) || en.startsWith(nq),
      sortKey: normalize(displayName(item)),
    });
  }

  hits.sort((a, b) =>
    a.prefix === b.prefix ? a.sortKey.localeCompare(b.sortKey) : a.prefix ? -1 : 1,
  );
  return hits.slice(0, limit).map((h) => h.item);
}
```

- [ ] **Step 5: Rodar os testes e ver passar**

```bash
cd app && npx vitest run src/lib/heroSearch.test.ts
```

Esperado: PASS, 8 testes.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/heroSearch.ts app/src/lib/heroSearch.test.ts app/src/lib/types.ts
git commit -m "feat(busca): searchHeroes (normalização de acento, prefixo primeiro)"
```

---

### Task 3: Índice de heróis com cache de módulo

**Files:**
- Modify: `app/src/lib/queries.ts`
- Create: `app/src/hooks/useHeroSearchIndex.ts`

**Interfaces:**
- Consumes: `HeroSearchItem` (Task 2); `useAsync` de `app/src/hooks/useAsync.ts`.
- Produces:
  - `getHeroSearchIndex(sb: SupabaseClient): Promise<HeroSearchItem[]>`
  - `useHeroSearchIndex(): { data: HeroSearchItem[] | null; loading: boolean; error: Error | null }`

Sem teste unitário nesta task: as duas funções só fazem I/O, e a convenção de
`queries.test.ts` é testar apenas as funções puras (`assembleHeroDetail`, `mapHeroRankItems`).
O comportamento observável é coberto pelo teste de `HeroSearchBar` na Task 4, com o hook
mockado.

- [ ] **Step 1: Adicionar a query**

Em `app/src/lib/queries.ts`, incluir `HeroSearchItem` no import de tipos e adicionar, ao lado
de `getDungeons`:

```ts
export async function getHeroSearchIndex(sb: SupabaseClient): Promise<HeroSearchItem[]> {
  const { data, error } = await sb
    .from('heroes')
    .select('id, name_pt, name_en, card_url')
    .order('name_en', { ascending: true });
  if (error) throw error;
  return data as HeroSearchItem[];
}
```

- [ ] **Step 2: Criar o hook com cache**

Criar `app/src/hooks/useHeroSearchIndex.ts`:

```ts
import { supabase } from '../lib/supabase';
import { getHeroSearchIndex } from '../lib/queries';
import { useAsync } from './useAsync';
import type { HeroSearchItem } from '../lib/types';

// Cache no escopo do módulo: são ~161 heróis (~20 KB). Buscar uma vez por sessão
// evita refazer a rede a cada navegação entre páginas.
let cache: Promise<HeroSearchItem[]> | null = null;

export function loadHeroSearchIndex(): Promise<HeroSearchItem[]> {
  if (!cache) {
    cache = getHeroSearchIndex(supabase).catch((e) => {
      cache = null; // uma falha não deve envenenar o cache para sempre
      throw e;
    });
  }
  return cache;
}

export const useHeroSearchIndex = () => useAsync(loadHeroSearchIndex, []);
```

- [ ] **Step 3: Verificar que o build de tipos passa**

```bash
cd app && npx tsc -b
```

Esperado: sem saída (sucesso).

- [ ] **Step 4: Rodar o suite inteiro**

```bash
cd app && npm test
```

Esperado: 18 arquivos, 68 testes, todos passando (os 60 do baseline + 8 da Task 2).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/queries.ts app/src/hooks/useHeroSearchIndex.ts
git commit -m "feat(busca): getHeroSearchIndex + hook com cache de módulo"
```

---

### Task 4: Componente `HeroSearchBar`

**Files:**
- Create: `app/src/components/HeroSearchBar.tsx`
- Create: `app/src/components/HeroSearchBar.test.tsx`

**Interfaces:**
- Consumes: `useHeroSearchIndex()` (Task 3); `searchHeroes`, `displayName` (Task 2);
  `HeroSearchItem` (Task 2).
- Produces: `<HeroSearchBar />` — componente sem props, usado pelo `AppShell` na Task 5.
  Exige estar dentro de um Router (usa `useNavigate`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `app/src/components/HeroSearchBar.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({
    data: [
      { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' },
      { id: 3, name_pt: 'Ludmila', name_en: 'Ludmila', card_url: 'ld.png' },
      { id: 2, name_pt: 'Zéfiro', name_en: 'Zephyr', card_url: 'ze.png' },
    ],
    loading: false, error: null,
  }),
}));

import { HeroSearchBar } from './HeroSearchBar';

function Probe() {
  return <span data-testid="rota">{useLocation().pathname}</span>;
}

function renderBar() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <HeroSearchBar />
      <Probe />
    </MemoryRouter>,
  );
  return screen.getByRole('combobox');
}

describe('HeroSearchBar', () => {
  it('sem termo digitado, não mostra o listbox', () => {
    const input = renderBar();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('digitar filtra e abre o listbox', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Lu Bu', 'Ludmila']);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('acha por name_en mesmo com o PT diferente, e mostra o nome original', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'zephyr' } });
    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Zéfiro');
    expect(option).toHaveTextContent('Zephyr');
  });

  it('seta para baixo + Enter navega para o herói ativo', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/3');
  });

  it('Enter sem seleção navega para o primeiro resultado', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/1');
  });

  it('Esc fecha o listbox sem limpar o texto digitado', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input).toHaveValue('lu');
  });

  it('clicar numa opção navega e limpa o campo', () => {
    const input = renderBar();
    fireEvent.change(input, { target: { value: 'lu' } });
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(screen.getByTestId('rota')).toHaveTextContent('/heroi/3');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

```bash
cd app && npx vitest run src/components/HeroSearchBar.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./HeroSearchBar"`.

- [ ] **Step 3: Implementar o componente**

Criar `app/src/components/HeroSearchBar.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeroSearchIndex } from '../hooks/useHeroSearchIndex';
import { searchHeroes, displayName } from '../lib/heroSearch';
import type { HeroSearchItem } from '../lib/types';

export function HeroSearchBar() {
  const { data, error } = useHeroSearchIndex();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);

  // Falha ao carregar o índice degrada para "sem sugestões": a página não quebra.
  const results = useMemo(() => (error ? [] : searchHeroes(data ?? [], q)), [data, error, q]);
  const open = !dismissed && results.length > 0;

  function go(hero: HeroSearchItem) {
    setQ('');
    setActive(-1);
    setDismissed(false);
    navigate(`/heroi/${hero.id}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hero = results[active] ?? results[0];
      if (hero) go(hero);
    } else if (e.key === 'Escape') {
      setDismissed(true);
      setActive(-1);
    }
  }

  return (
    <div className="relative mt-4 max-w-sm">
      <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface
                      px-3 py-2 text-sm text-muted focus-within:border-accent">
        <span aria-hidden>🔎</span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="hero-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `hero-opt-${results[active].id}` : undefined}
          aria-label="Buscar herói"
          placeholder="Buscar herói…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(-1); setDismissed(false); }}
          onKeyDown={onKeyDown}
          onBlur={() => setDismissed(true)}
          className="w-full bg-transparent text-fg placeholder:text-subtle focus:outline-none"
        />
      </div>

      {open && (
        <ul
          id="hero-search-listbox"
          role="listbox"
          aria-label="Heróis encontrados"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-strong
                     bg-surface shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        >
          {results.map((hero, i) => (
            <li
              key={hero.id}
              id={`hero-opt-${hero.id}`}
              role="option"
              aria-selected={i === active}
              // preventDefault no mousedown evita que o blur feche a lista antes do clique
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(hero)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2
                          ${i === active ? 'bg-surface-2' : ''}`}
            >
              {hero.card_url && (
                <img src={hero.card_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
              )}
              <span className="truncate text-sm text-fg">{displayName(hero)}</span>
              {hero.name_pt && hero.name_pt !== hero.name_en && (
                <span className="ml-auto shrink-0 text-xs text-subtle">{hero.name_en}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

```bash
cd app && npx vitest run src/components/HeroSearchBar.test.tsx
```

Esperado: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HeroSearchBar.tsx app/src/components/HeroSearchBar.test.tsx
git commit -m "feat(busca): combobox HeroSearchBar (teclado, mouse, a11y)"
```

---

### Task 5: Montar a busca no `AppShell` e mover o filtro de modos

**Files:**
- Modify: `app/src/components/AppShell.tsx`
- Modify: `app/src/components/AppShell.test.tsx`
- Modify: `app/src/pages/IndexPage.tsx`
- Modify: `app/src/pages/IndexPage.test.tsx`
- Modify: `app/src/pages/ModePage.test.tsx`
- Modify: `app/src/pages/HeroPage.test.tsx`

**Interfaces:**
- Consumes: `<HeroSearchBar />` (Task 4).
- Produces: `AppShell` com a assinatura
  `{ title: string; subtitle?: string; banner?: string; children: ReactNode }` —
  **sem** `search` e `onSearch`. Todo consumidor de `AppShell` passa a exigir um Router.

Por que os quatro arquivos de teste mudam: `AppShell` passa a renderizar `HeroSearchBar`, que
usa `useNavigate` e o hook do índice. Todo teste que monta uma página precisa, então, estar
dentro de um Router (já estão) e mockar `useHeroSearchIndex` — senão o teste importa
`lib/supabase.ts`, que chama `createClient` com env vars ausentes em CI.

- [ ] **Step 1: Atualizar o teste do `AppShell`**

Em `app/src/components/AppShell.test.tsx`, adicionar no topo (depois dos imports do vitest):

```tsx
import { MemoryRouter } from 'react-router-dom';

vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({
    data: [{ id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', card_url: 'lu.png' }],
    loading: false, error: null,
  }),
}));
```

Envolver **todos** os `render(<AppShell …>)` do arquivo em `<MemoryRouter>` e substituir o
teste `'mostra busca só quando onSearch é passado e emite o valor'` por:

```tsx
  it('mostra sempre a busca de heróis', () => {
    render(<MemoryRouter><AppShell title="T"><div /></AppShell></MemoryRouter>);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-label', 'Buscar herói');
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(screen.getByRole('option')).toHaveTextContent('Lu Bu');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && npx vitest run src/components/AppShell.test.tsx
```

Esperado: FAIL — nenhum elemento com `role="combobox"` (o `AppShell` ainda usa o input antigo).

- [ ] **Step 3: Atualizar o `AppShell`**

Em `app/src/components/AppShell.tsx`:

1. Importar o componente: `import { HeroSearchBar } from './HeroSearchBar';`
2. Remover `search` e `onSearch` da assinatura e do tipo das props, deixando
   `{ title, subtitle, banner, children }`.
3. Substituir todo o bloco `{onSearch && ( … )}` por `<HeroSearchBar />`.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && npx vitest run src/components/AppShell.test.tsx
```

Esperado: PASS. `IndexPage.test.tsx` ainda estará quebrado — é o próximo passo.

- [ ] **Step 5: Mover o filtro de modos para o corpo do `IndexPage`**

Em `app/src/pages/IndexPage.tsx`, remover `search={q}` e `onSearch={setQ}` do `<AppShell>` e
inserir, como primeiro filho do `<AppShell>`, acima de `{loading && …}`:

```tsx
      <div className="mb-6 flex max-w-sm items-center gap-2 rounded-lg border border-border-strong
                      bg-surface px-3 py-2 text-sm text-muted focus-within:border-accent">
        <span aria-hidden>⚑</span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar modo…"
          aria-label="Filtrar modo"
          className="w-full bg-transparent text-fg placeholder:text-subtle focus:outline-none"
        />
      </div>
```

O restante da página (agrupamento por categoria, `useMemo`, estado `q`) fica igual.

- [ ] **Step 6: Atualizar os testes das três páginas**

Em `app/src/pages/IndexPage.test.tsx`, `ModePage.test.tsx` e `HeroPage.test.tsx`, adicionar o
mock junto dos outros `vi.mock` já existentes (atenção ao caminho: a partir de `pages/` é
`../hooks/useHeroSearchIndex`):

```tsx
vi.mock('../hooks/useHeroSearchIndex', () => ({
  useHeroSearchIndex: () => ({ data: [], loading: false, error: null }),
}));
```

E em `IndexPage.test.tsx`, no teste `'a busca filtra os cards'`, trocar
`screen.getByRole('textbox')` por `screen.getByLabelText('Filtrar modo')` — agora existem dois
campos na página e o alvo precisa ser explícito.

- [ ] **Step 7: Rodar o suite inteiro**

```bash
cd app && npm test
```

Esperado: 19 arquivos, 75 testes, todos passando (a Task 5 troca um teste do AppShell por
outro, sem alterar a contagem).

- [ ] **Step 8: Commit**

```bash
git add app/src/components/AppShell.tsx app/src/components/AppShell.test.tsx \
        app/src/pages/IndexPage.tsx app/src/pages/IndexPage.test.tsx \
        app/src/pages/ModePage.test.tsx app/src/pages/HeroPage.test.tsx
git commit -m "feat(busca): barra de heróis global no AppShell; filtro de modo vai ao corpo"
```

---

### Task 6: `rank` e `total` no `HeroDetail`

**Files:**
- Modify: `app/src/lib/types.ts`
- Modify: `app/src/lib/queries.ts`
- Modify: `app/src/lib/queries.test.ts`

**Interfaces:**
- Consumes: view `hero_dungeon_ranks` (Task 1).
- Produces: `interface DungeonRate { dungeon_id: number; rate: number; rank: number; total: number }`,
  disponível em `HeroDetail.rates` para a Task 7.

- [ ] **Step 1: Escrever o teste que falha**

Em `app/src/lib/queries.test.ts`, adicionar dentro do `describe('assembleHeroDetail', …)`:

```tsx
  it('converte rank e total para número, inclusive quando chegam como string', () => {
    const detail = assembleHeroDetail({
      hero: { id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: null, star_level: 5, special_pt: null },
      labels: [],
      rates: [{ dungeon_id: 30, rate: '92.5', rank: '3', total: '57' }],
      gear: { gear: [] }, artifacts: { artifacts: [] }, lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.rates[0]).toEqual({ dungeon_id: 30, rate: 92.5, rank: 3, total: 57 });
  });
```

No teste `'monta HeroDetail a partir das partes'`, que já existe logo acima, completar a
fixture de `rates` para `[{ dungeon_id: 30, rate: 50, rank: 1, total: 10 }]` — sem isso o
objeto passa a carregar `NaN` nos campos novos.

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && npx vitest run src/lib/queries.test.ts
```

Esperado: FAIL — `expected { dungeon_id: 30, rate: '92.5', rank: '3', total: '57' } to deeply
equal { dungeon_id: 30, rate: 92.5, rank: 3, total: 57 }`.

- [ ] **Step 3: Atualizar o tipo**

Em `app/src/lib/types.ts`, substituir a linha do `DungeonRate` por:

```ts
export interface DungeonRate { dungeon_id: number; rate: number; rank: number; total: number; }
```

- [ ] **Step 4: Converter no assemble e ler a view**

Em `app/src/lib/queries.ts`, dentro de `assembleHeroDetail`, trocar `rates: p.rates ?? [],` por:

```ts
    // rank() e count() voltam como bigint — o PostgREST pode entregá-los como string.
    rates: (p.rates ?? []).map((r: any) => ({
      dungeon_id: Number(r.dungeon_id),
      rate: Number(r.rate),
      rank: Number(r.rank),
      total: Number(r.total),
    })),
```

E em `getHeroDetail`, trocar a linha do `Promise.all` que lê os rates por:

```ts
    sb.from('hero_dungeon_ranks').select('dungeon_id, rate, rank, total').eq('hero_id', heroId),
```

- [ ] **Step 5: Rodar e ver passar**

```bash
cd app && npx vitest run src/lib/queries.test.ts
```

Esperado: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/types.ts app/src/lib/queries.ts app/src/lib/queries.test.ts
git commit -m "feat(heroi): getHeroDetail lê hero_dungeon_ranks (rank + total)"
```

---

### Task 7: Componente `HeroContentRanks`

**Files:**
- Create: `app/src/components/HeroContentRanks.tsx`
- Create: `app/src/components/HeroContentRanks.test.tsx`

**Interfaces:**
- Consumes: `DungeonRate` (Task 6) e `Dungeon` (já existe em `types.ts`).
- Produces: `<HeroContentRanks rates={DungeonRate[]} dungeons={Dungeon[]} />`, usado pela
  `HeroPage` na Task 8. Exige Router (cada linha é um `Link`).

- [ ] **Step 1: Escrever os testes que falham**

Criar `app/src/components/HeroContentRanks.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HeroContentRanks } from './HeroContentRanks';
import type { Dungeon, DungeonRate } from '../lib/types';

const dungeons: Dungeon[] = [
  { id: 10, index: 1, name_pt: 'Arena de Honra', name_en: 'Honor Arena', icon_url: 'a.png' },
  { id: 20, index: 2, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'b.png' },
  { id: 30, index: 3, name_pt: null, name_en: 'Guild War', icon_url: null },
];

const rates: DungeonRate[] = [
  { dungeon_id: 20, rate: 98.4, rank: 1, total: 57 },
  { dungeon_id: 10, rate: 91.2, rank: 4, total: 60 },
];

const renderRanks = () =>
  render(<MemoryRouter><HeroContentRanks rates={rates} dungeons={dungeons} /></MemoryRouter>);

describe('HeroContentRanks', () => {
  it('ordena por melhor posição, não pela ordem dos modos', () => {
    renderRanks();
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[0]).toContain('Raide de Equipamento I');
    expect(linhas[1]).toContain('Arena de Honra');
  });

  it('mostra a posição e o total de ranqueados', () => {
    renderRanks();
    expect(screen.getByText('#1 de 57')).toBeInTheDocument();
    expect(screen.getByText('#4 de 60')).toBeInTheDocument();
  });

  it('modo sem rank aparece por último, com travessão e usando name_en', () => {
    renderRanks();
    const linhas = screen.getAllByRole('link').map((l) => l.textContent ?? '');
    expect(linhas[2]).toContain('Guild War');
    expect(linhas[2]).toContain('—');
  });

  it('cada linha linka para a página do modo', () => {
    renderRanks();
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/modo/20');
  });

  it('herói sem nenhum rank mostra os três modos esmaecidos', () => {
    render(<MemoryRouter><HeroContentRanks rates={[]} dungeons={dungeons} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && npx vitest run src/components/HeroContentRanks.test.tsx
```

Esperado: FAIL — `Failed to resolve import "./HeroContentRanks"`.

- [ ] **Step 3: Implementar o componente**

Criar `app/src/components/HeroContentRanks.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { Dungeon, DungeonRate } from '../lib/types';

export function HeroContentRanks({ rates, dungeons }: { rates: DungeonRate[]; dungeons: Dungeon[] }) {
  const byDungeon = new Map(rates.map((r) => [r.dungeon_id, r]));

  const ranked = dungeons
    .filter((d) => byDungeon.has(d.id))
    .sort((a, b) => byDungeon.get(a.id)!.rank - byDungeon.get(b.id)!.rank);

  const unranked = dungeons
    .filter((d) => !byDungeon.has(d.id))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  // Mesma normalização usada no ranking do modo: 50 é o piso da escala.
  const maxRate = Math.max(50, ...ranked.map((d) => byDungeon.get(d.id)!.rate));

  return (
    <div className="space-y-1.5">
      {ranked.map((d) => {
        const r = byDungeon.get(d.id)!;
        const pct = Math.max(0, Math.min(100, (r.rate / maxRate) * 100));
        return (
          <Link
            key={d.id}
            to={`/modo/${d.id}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                       transition hover:border-accent/50 hover:bg-surface-2"
          >
            {d.icon_url && <img src={d.icon_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{d.name_pt ?? d.name_en}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              #{r.rank} de {r.total}
            </span>
            <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-border-strong">
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                   style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}

      {unranked.map((d) => (
        <Link
          key={d.id}
          to={`/modo/${d.id}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2
                     opacity-50 transition hover:opacity-80"
        >
          {d.icon_url && <img src={d.icon_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />}
          <span className="min-w-0 flex-1 truncate text-sm text-subtle">{d.name_pt ?? d.name_en}</span>
          <span className="shrink-0 text-xs text-subtle">—</span>
          <div className="w-20 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && npx vitest run src/components/HeroContentRanks.test.tsx
```

Esperado: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HeroContentRanks.tsx app/src/components/HeroContentRanks.test.tsx
git commit -m "feat(heroi): HeroContentRanks (posição por conteúdo, sem-rank no fim)"
```

---

### Task 8: Seção "Conteúdos" na página do herói

**Files:**
- Modify: `app/src/pages/HeroPage.tsx`
- Modify: `app/src/pages/HeroPage.test.tsx`

**Interfaces:**
- Consumes: `<HeroContentRanks>` (Task 7); `useDungeons()` (já existe);
  `HeroDetail.rates` com `rank`/`total` (Task 6).
- Produces: nada para tasks seguintes — é a última.

- [ ] **Step 1: Atualizar o teste**

Em `app/src/pages/HeroPage.test.tsx`:

1. No mock de `useDungeons`, usar dois modos, para haver um ranqueado e um sem rank:

```tsx
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [
      { id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: null },
      { id: 31, index: 2, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: null },
    ],
    loading: false, error: null,
  }),
}));
```

2. No mock de `useHero`, trocar a linha de `rates` por:

```tsx
      rates: [{ dungeon_id: 30, rate: 50, rank: 2, total: 40 }],
```

3. Adicionar um teste novo ao `describe('HeroPage', …)`:

```tsx
  it('lista a posição do herói por conteúdo, com os sem rank no fim', () => {
    render(<MemoryRouter><HeroPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Conteúdos' })).toBeInTheDocument();
    expect(screen.getByText('#2 de 40')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Raide de Equipamento I/ }))
      .toHaveAttribute('href', '/modo/30');
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && npx vitest run src/pages/HeroPage.test.tsx
```

Esperado: FAIL — não existe heading com o nome "Conteúdos".

- [ ] **Step 3: Renderizar a seção na página**

Em `app/src/pages/HeroPage.tsx`:

1. Adicionar os imports:

```tsx
import { useDungeons } from '../hooks/useDungeons';
import { HeroContentRanks } from '../components/HeroContentRanks';
```

2. Dentro do componente, ao lado do `useHero`:

```tsx
  const { data: dungeons } = useDungeons();
```

3. Como **primeira** seção da coluna direita (a `<div className="space-y-8">`), antes da seção
   "Equipamento (Recomendado)":

```tsx
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Conteúdos</h2>
            <HeroContentRanks rates={hero.rates} dungeons={dungeons ?? []} />
          </section>
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && npx vitest run src/pages/HeroPage.test.tsx
```

Esperado: PASS.

- [ ] **Step 5: Rodar o suite inteiro e o build**

```bash
cd app && npm test && npx tsc -b && npm run lint
```

Esperado: 20 arquivos, 82 testes, todos passando; `tsc` e `oxlint` sem erros.

- [ ] **Step 6: Verificar no app rodando**

```bash
cd app && npm run dev
```

Abrir `http://localhost:5173`, digitar "lu" na barra do topo, clicar num herói sugerido e
conferir que a página dele abre com a seção "Conteúdos" no topo da coluna direita, ordenada da
melhor posição para a pior, com os modos sem rank esmaecidos no fim.

- [ ] **Step 7: Commit**

```bash
git add app/src/pages/HeroPage.tsx app/src/pages/HeroPage.test.tsx
git commit -m "feat(heroi): seção Conteúdos com a posição do herói em cada modo"
```
