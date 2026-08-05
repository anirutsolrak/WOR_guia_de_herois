# Redesign do Front — Design System + Índice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a estética "modern gaming tracker" no app, estabelecendo o design system (Tailwind v4 + tokens + fontes) e redesenhando a tela **Índice** (faixa editorial + seções por categoria + cards de modo cinematográficos), sem alterar dados/lógica.

**Architecture:** Tailwind v4 (CSS-first, via `@tailwindcss/vite` + `@import "tailwindcss"` + `@theme`) fornece os tokens. Um módulo puro de categorização agrupa os 19 modos. Componentes de apresentação (`AppShell`, `ModeCard`, `SectionHeader`) montam a tela; `IndexPage` é reescrita para agrupar/filtrar e renderizar. Lógica de dados (hooks/queries/types) fica intacta.

**Tech Stack:** Vite + React 18 + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), `@fontsource/inter` + `@fontsource/space-grotesk`, Vitest + Testing Library, react-router-dom.

## Global Constraints

- Redesign é **UI-only**: NÃO alterar hooks, queries, tipos, dados nem o pipeline. `IndexPage` continua usando `useDungeons()`.
- Tailwind **v4** (CSS-first): plugin `@tailwindcss/vite`, `@import "tailwindcss";` no CSS, tokens em `@theme {}`. Sem `tailwind.config.js` de v3. Dark-only.
- Fontes **auto-hospedadas** via `@fontsource` (sem CDN — PWA-safe): Space Grotesk (display) + Inter (corpo).
- Tokens de cor (hexes exatos): `bg #0a0f1a`, `surface #0d1524`, `surface-2 #111c30`, `border #1e2c45`, `border-strong #223049`, `fg #eaf1ff`, `muted #93a4c4`, `subtle #6b7d9c`; acento `#4f8cff`→`#8a5cff`.
- Imagens por **hotlink** do CDN (`icon_url` das dungeons), como já é hoje.
- Card de modo é um link para `/modo/:id`; nome usa `name_pt ?? name_en`.
- Categorização (name_en → categoria), ordem fixa: Arena, Gear, Guilda, Torres & Ilusões, (Outros como fallback). Guilda inclui Guild War + Titanic Ruins + Drake's Chasm.
- Testes de componente assertam comportamento (texto/role/atributo/testid), não CSS computado (jsdom não aplica estilo).

---

## Mapa de arquivos

- `app/vite.config.ts` — adiciona o plugin `@tailwindcss/vite` (ao lado do PWA já existente).
- `app/src/index.css` — adiciona `@import "tailwindcss"`, `@theme` com tokens e camada base (body, brilho de fundo). **Mantém o CSS legado existente** (classes `.radar`, `.ratebar-*`, `.hero-card`, etc.) para Modo/Herói continuarem funcionando até seus redesigns.
- `app/src/main.tsx` — importa as fontes `@fontsource`.
- `app/src/lib/categories.ts` — `categorize()` + `CATEGORY_ORDER` (puro).
- `app/src/components/AppShell.tsx` — faixa editorial (marca + título + tagline + busca) + slot de conteúdo.
- `app/src/components/ModeCard.tsx` — card cinematográfico de modo.
- `app/src/components/SectionHeader.tsx` — label de categoria com tick.
- `app/src/pages/IndexPage.tsx` — reescrita (agrupa por categoria, filtra pela busca).
- Testes: `categories.test.ts`, `ModeCard.test.tsx`, `AppShell.test.tsx`, `IndexPage.test.tsx` (reescrito).

Componentes de Modo/Herói e o CSS deles: intocados nesta fatia (o `index.css` novo não deve quebrar as classes que eles usam — ver Task 1).

---

### Task 1: Tailwind v4 + tokens + fontes (preservando o CSS legado)

**Files:**
- Modify: `app/vite.config.ts`
- Modify: `app/src/index.css`
- Modify: `app/src/main.tsx`

**Interfaces:**
- Produces: utilitários de token do Tailwind (`bg-surface`, `text-fg`, `text-muted`, `border-border`, `font-display`, `font-sans`, `text-accent`, etc.) e as fontes carregadas. Consumidos pelas Tasks 3-5.

- [ ] **Step 1: Instalar dependências**

Run:
```bash
cd app && npm install tailwindcss @tailwindcss/vite @fontsource/inter @fontsource/space-grotesk
```

- [ ] **Step 2: Adicionar o plugin do Tailwind ao Vite**

Edit `app/vite.config.ts` — importe e adicione `tailwindcss()` ao array de plugins, ANTES do `VitePWA(...)`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // ... manter a config PWA existente exatamente como está ...
    }),
  ],
});
```
(Preserve o objeto de opções do `VitePWA` que já existe — só adicione a linha `tailwindcss()`.)

- [ ] **Step 3: Reescrever o topo do `index.css` com Tailwind + tokens, mantendo o legado**

No `app/src/index.css`, ADICIONE no TOPO do arquivo (antes de qualquer CSS existente):
```css
@import "tailwindcss";

@theme {
  --color-bg: #0a0f1a;
  --color-surface: #0d1524;
  --color-surface-2: #111c30;
  --color-border: #1e2c45;
  --color-border-strong: #223049;
  --color-fg: #eaf1ff;
  --color-muted: #93a4c4;
  --color-subtle: #6b7d9c;
  --color-accent: #4f8cff;
  --color-accent-2: #8a5cff;

  --color-faction-watcher: #35c4c4;
  --color-faction-northerner: #6bb8ff;
  --color-faction-nightmare: #a06bff;
  --color-faction-cultist: #e05cc0;
  --color-faction-infernal: #ff6b4a;
  --color-faction-piercer: #52c46a;
  --color-faction-esotericist: #7c6bff;
  --color-faction-chaotic: #e0455f;
  --color-faction-arbiter: #e0b23c;
  --color-faction-unnamed: #8ea3c4;

  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  body {
    background-color: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
  }
}
```
**MANTENHA todo o CSS legado que já existe abaixo disso** (as regras `:root`, `.mode-grid`, `.hero-card`, `.radar`, `.ratebar-*`, etc.) — Modo/Herói ainda dependem delas. Apenas remova, do bloco `:root` legado, as declarações `color`/`background`/`font` conflitantes se causarem conflito visível (senão, pode deixar; o `@layer base` acima tem precedência para o body).

- [ ] **Step 4: Importar as fontes no `main.tsx`**

Em `app/src/main.tsx`, adicione no topo (antes de `import './index.css'`):
```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
```

- [ ] **Step 5: Verificar build + testes**

Run:
```bash
cd app && npm run build && npx vitest run
```
Expected: build conclui (Tailwind processa sem erro, fontes empacotadas); todos os testes continuam passando (nenhum teste depende de CSS). Se o build reclamar de conteúdo Tailwind vazio, tudo bem — os utilitários entram nas próximas tasks.

- [ ] **Step 6: Commit**

```bash
git add app/vite.config.ts app/src/index.css app/src/main.tsx app/package.json app/package-lock.json
git commit -m "feat(app): Tailwind v4 + tokens de design + fontes (mantendo CSS legado)"
```

---

### Task 2: Módulo de categorização (puro)

**Files:**
- Create: `app/src/lib/categories.ts`
- Test: `app/src/lib/categories.test.ts`

**Interfaces:**
- Produces:
  - `type CategoryKey = 'arena' | 'gear' | 'guild' | 'towers' | 'other'`
  - `interface Category { key: CategoryKey; label: string }`
  - `CATEGORY_ORDER: Category[]` (na ordem: Arena, Gear, Guilda, Torres & Ilusões, Outros)
  - `categorize(nameEn: string): CategoryKey`

- [ ] **Step 1: Escrever o teste que falha**

Create `app/src/lib/categories.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { categorize, CATEGORY_ORDER } from './categories';

describe('categorize', () => {
  const cases: [string, string][] = [
    ['Arena Single-Target DPS Challenge', 'arena'],
    ['Arena AoE DPS Challenge', 'arena'],
    ['Arena Anti-Air DPS Challenge', 'arena'],
    ['Gear Raid I', 'gear'],
    ['Gear Raid III', 'gear'],
    ['Gear Dungeon II', 'gear'],
    ['Artifact Material Raid', 'gear'],
    ['Guild War', 'guild'],
    ['Titanic Ruins Apocalypse I & II', 'guild'],
    ['Titanic Ruins Matrix I Bulwark Form', 'guild'],
    ['Titanic Ruins Matrix I Spellbane Form', 'guild'],
    ["Drake's Chasm Nightmare IV", 'guild'],
    ["Drake's Chasm Abyss I", 'guild'],
    ['Tower of Deception', 'towers'],
    ["Malrik's Halls of Illusion The Black Sewer", 'towers'],
    ["Malrik's Halls of Illusion Heart of the Volcano", 'towers'],
  ];
  it.each(cases)('%s -> %s', (name, key) => {
    expect(categorize(name)).toBe(key);
  });
  it('desconhecido cai em other', () => {
    expect(categorize('Algo Novo Qualquer')).toBe('other');
  });
  it('CATEGORY_ORDER tem as 5 categorias na ordem certa', () => {
    expect(CATEGORY_ORDER.map((c) => c.key)).toEqual(['arena', 'gear', 'guild', 'towers', 'other']);
    expect(CATEGORY_ORDER.find((c) => c.key === 'guild')!.label).toBe('Guilda');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/lib/categories.test.ts`
Expected: FAIL ("Cannot find module './categories'").

- [ ] **Step 3: Implementar**

Create `app/src/lib/categories.ts`:
```ts
export type CategoryKey = 'arena' | 'gear' | 'guild' | 'towers' | 'other';

export interface Category {
  key: CategoryKey;
  label: string;
}

export const CATEGORY_ORDER: Category[] = [
  { key: 'arena', label: 'Arena' },
  { key: 'gear', label: 'Gear' },
  { key: 'guild', label: 'Guilda' },
  { key: 'towers', label: 'Torres & Ilusões' },
  { key: 'other', label: 'Outros' },
];

// Categoriza pelo name_en (estável). Ordem de checagem importa: nenhum nome
// dos 19 modos atuais contém palavras-chave de duas categorias.
export function categorize(nameEn: string): CategoryKey {
  const n = nameEn.toLowerCase();
  if (n.includes('arena')) return 'arena';
  if (n.includes('gear') || n.includes('artifact material')) return 'gear';
  if (n.includes('guild') || n.includes('titanic') || n.includes('drake')) return 'guild';
  if (n.includes('tower') || n.includes('malrik')) return 'towers';
  return 'other';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/lib/categories.test.ts`
Expected: PASS (todos os casos + fallback + ordem).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/categories.ts app/src/lib/categories.test.ts
git commit -m "feat(app): módulo de categorização dos modos"
```

---

### Task 3: Componente ModeCard (card cinematográfico)

**Files:**
- Create: `app/src/components/ModeCard.tsx`
- Test: `app/src/components/ModeCard.test.tsx`

**Interfaces:**
- Consumes: `Dungeon` de `../lib/types` (campos `id`, `name_pt`, `name_en`, `icon_url`).
- Produces: `ModeCard({ dungeon }: { dungeon: Dungeon })` — um `<Link to="/modo/:id">` com imagem de fundo + gradiente + nome.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/ModeCard.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ModeCard } from './ModeCard';

const dungeon = { id: 30, index: 12, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'gw.png' };

describe('ModeCard', () => {
  it('linka para /modo/:id e mostra nome PT + imagem', () => {
    render(<MemoryRouter><ModeCard dungeon={dungeon} /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Guerra de Guilda/i });
    expect(link).toHaveAttribute('href', '/modo/30');
    expect(screen.getByRole('img')).toHaveAttribute('src', 'gw.png');
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
  });
  it('usa name_en quando name_pt é nulo', () => {
    render(<MemoryRouter><ModeCard dungeon={{ ...dungeon, name_pt: null }} /></MemoryRouter>);
    expect(screen.getByText('Guild War')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/ModeCard.test.tsx`
Expected: FAIL ("Cannot find module './ModeCard'").

- [ ] **Step 3: Implementar**

Create `app/src/components/ModeCard.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { Dungeon } from '../lib/types';

export function ModeCard({ dungeon }: { dungeon: Dungeon }) {
  const name = dungeon.name_pt ?? dungeon.name_en;
  return (
    <Link
      to={`/modo/${dungeon.id}`}
      className="group relative block h-24 overflow-hidden rounded-xl border border-border-strong
                 shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition
                 duration-150 hover:-translate-y-[3px] hover:border-accent/60
                 hover:shadow-[0_10px_28px_rgba(80,140,255,0.28)]"
    >
      {dungeon.icon_url && (
        <img
          src={dungeon.icon_url}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover opacity-85
                     transition duration-150 group-hover:opacity-100 group-hover:scale-[1.03]"
        />
      )}
      <span className="pointer-events-none absolute inset-0
                       bg-gradient-to-b from-black/10 to-[#080e1a]/90" />
      <span className="absolute inset-x-3 bottom-2.5 z-10 font-display text-sm font-bold
                       text-fg drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
        {name}
      </span>
    </Link>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/ModeCard.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ModeCard.tsx app/src/components/ModeCard.test.tsx
git commit -m "feat(app): componente ModeCard cinematográfico"
```

---

### Task 4: AppShell (faixa editorial) + SectionHeader

**Files:**
- Create: `app/src/components/AppShell.tsx`
- Create: `app/src/components/SectionHeader.tsx`
- Test: `app/src/components/AppShell.test.tsx`

**Interfaces:**
- Produces:
  - `AppShell({ title, subtitle, search, onSearch, children }: { title: string; subtitle?: string; search?: string; onSearch?: (v: string) => void; children: React.ReactNode })` — marca + faixa editorial + busca (só quando `onSearch` é passado) + slot de conteúdo.
  - `SectionHeader({ label }: { label: string })` — label de categoria com tick de acento.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/AppShell.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppShell } from './AppShell';
import { SectionHeader } from './SectionHeader';

describe('AppShell', () => {
  it('mostra marca, título, subtítulo e conteúdo', () => {
    render(
      <AppShell title="Melhores heróis por conteúdo" subtitle="Escolha um modo">
        <div>corpo</div>
      </AppShell>,
    );
    expect(screen.getByText('WoR Guia')).toBeInTheDocument();
    expect(screen.getByText('Melhores heróis por conteúdo')).toBeInTheDocument();
    expect(screen.getByText('Escolha um modo')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('mostra busca só quando onSearch é passado e emite o valor', () => {
    const onSearch = vi.fn();
    const { rerender } = render(<AppShell title="T"><div /></AppShell>);
    expect(screen.queryByRole('textbox')).toBeNull();

    rerender(<AppShell title="T" search="" onSearch={onSearch}><div /></AppShell>);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'lu' } });
    expect(onSearch).toHaveBeenCalledWith('lu');
  });
});

describe('SectionHeader', () => {
  it('renderiza o label', () => {
    render(<SectionHeader label="Guilda" />);
    expect(screen.getByText('Guilda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/AppShell.test.tsx`
Expected: FAIL ("Cannot find module './AppShell'").

- [ ] **Step 3: Implementar**

Create `app/src/components/SectionHeader.tsx`:
```tsx
export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-[3px] rounded-sm bg-accent" />
      <h2 className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </h2>
    </div>
  );
}
```
Create `app/src/components/AppShell.tsx`:
```tsx
import type { ReactNode } from 'react';

export function AppShell({
  title, subtitle, search, onSearch, children,
}: {
  title: string;
  subtitle?: string;
  search?: string;
  onSearch?: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="relative overflow-hidden border-b border-border
                         bg-[radial-gradient(120%_140%_at_80%_-20%,rgba(80,140,255,0.22),transparent_60%)]">
        <div className="mx-auto max-w-5xl px-5 py-7">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg
                             bg-gradient-to-br from-accent to-accent-2 text-sm
                             shadow-[0_3px_10px_rgba(80,140,255,0.5)]">◉</span>
            <span className="bg-gradient-to-r from-[#cfe0ff] to-[#9ab6ff] bg-clip-text
                             font-display font-extrabold tracking-tight text-transparent">
              WoR Guia
            </span>
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          {onSearch && (
            <div className="mt-4 flex max-w-sm items-center gap-2 rounded-lg border border-border-strong
                            bg-surface px-3 py-2 text-sm text-muted focus-within:border-accent">
              <span aria-hidden>🔎</span>
              <input
                type="text"
                value={search ?? ''}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar modo…"
                className="w-full bg-transparent text-fg placeholder:text-subtle focus:outline-none"
              />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/AppShell.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/AppShell.tsx app/src/components/SectionHeader.tsx app/src/components/AppShell.test.tsx
git commit -m "feat(app): AppShell (faixa editorial) + SectionHeader"
```

---

### Task 5: Reescrever IndexPage (agrupar + filtrar)

**Files:**
- Modify (reescrever): `app/src/pages/IndexPage.tsx`
- Modify (reescrever): `app/src/pages/IndexPage.test.tsx`

**Interfaces:**
- Consumes: `useDungeons` (hook existente), `AppShell`, `SectionHeader`, `ModeCard`, `categorize`, `CATEGORY_ORDER`, tipos `Dungeon`/`CategoryKey`.
- Produces: `IndexPage()` — agrupa as dungeons por categoria (na ordem de `CATEGORY_ORDER`, pulando vazias), filtra pela busca (por nome PT/EN), dentro do `AppShell`.

- [ ] **Step 1: Reescrever o teste (que falha com a implementação antiga)**

Overwrite `app/src/pages/IndexPage.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [
      { id: 1, index: 1, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: 'a.png' },
      { id: 2, index: 2, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: 'b.png' },
      { id: 3, index: 3, name_pt: 'Arena AoE', name_en: 'Arena AoE DPS Challenge', icon_url: 'c.png' },
    ],
    loading: false, error: null,
  }),
}));

import { IndexPage } from './IndexPage';

const renderPage = () => render(<MemoryRouter><IndexPage /></MemoryRouter>);

describe('IndexPage', () => {
  it('agrupa os modos nas seções por categoria', () => {
    renderPage();
    expect(screen.getByText('Arena')).toBeInTheDocument();
    expect(screen.getByText('Gear')).toBeInTheDocument();
    expect(screen.getByText('Guilda')).toBeInTheDocument();
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
  });

  it('a busca filtra os cards', () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'guilda' } });
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
    expect(screen.queryByText('Raide de Equipamento I')).toBeNull();
    expect(screen.queryByText('Gear')).toBeNull(); // seção Gear some quando vazia
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/pages/IndexPage.test.tsx`
Expected: FAIL (a IndexPage antiga não tem busca/seções — erro em `getByText('Arena')` ou no `textbox`).

- [ ] **Step 3: Reescrever a IndexPage**

Overwrite `app/src/pages/IndexPage.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { useDungeons } from '../hooks/useDungeons';
import { AppShell } from '../components/AppShell';
import { SectionHeader } from '../components/SectionHeader';
import { ModeCard } from '../components/ModeCard';
import { CATEGORY_ORDER, categorize, type CategoryKey } from '../lib/categories';
import type { Dungeon } from '../lib/types';

export function IndexPage() {
  const { data, loading, error } = useDungeons();
  const [q, setQ] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<CategoryKey, Dungeon[]>();
    const query = q.trim().toLowerCase();
    for (const d of data ?? []) {
      const name = (d.name_pt ?? d.name_en).toLowerCase();
      if (query && !name.includes(query)) continue;
      const key = categorize(d.name_en);
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return map;
  }, [data, q]);

  return (
    <AppShell
      title="Melhores heróis por conteúdo"
      subtitle="Escolha um modo e veja o ranking"
      search={q}
      onSearch={setQ}
    >
      {loading && <p className="text-muted">Carregando…</p>}
      {error && <p className="text-muted">Erro ao carregar modos.</p>}
      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat.key}>
              <SectionHeader label={cat.label} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((d) => <ModeCard key={d.id} dungeon={d} />)}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Rodar e ver passar (e a suíte toda)**

Run: `cd app && npx vitest run src/pages/IndexPage.test.tsx && npx vitest run && npx tsc --noEmit`
Expected: o teste do Índice passa; a suíte inteira do app passa; `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/IndexPage.tsx app/src/pages/IndexPage.test.tsx
git commit -m "feat(app): Índice redesenhado (faixa editorial + seções + cards)"
```

---

## Verificação final

- [ ] `cd app && npm run build` conclui sem erro (Tailwind + fontes + PWA).
- [ ] `cd app && npx vitest run` — toda a suíte passa.
- [ ] `cd app && npx tsc --noEmit` — sem erros de tipo.
- [ ] Visual (você/humano): `npm run dev` → o Índice mostra a faixa editorial, seções por categoria (Arena/Gear/Guilda/Torres & Ilusões) e os cards cinematográficos com hover; a busca filtra; clicar num card leva ao Modo. Modo/Herói continuam renderizando (CSS legado preservado).

## Follow-ups (fora deste plano)

- Redesign da tela **Modo** (lista ranqueada) com identidade de facção.
- Redesign da tela **Herói**.
- Busca global + página **Heróis** (browse).
- Ao redesenhar Modo/Herói, remover as classes legadas correspondentes do `index.css`.
