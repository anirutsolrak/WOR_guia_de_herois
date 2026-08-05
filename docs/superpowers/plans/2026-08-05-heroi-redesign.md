# Redesign da tela de Herói (duas colunas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `/heroi/:heroId` em duas colunas (identidade + radar à esquerda; gear/artefatos/times/descrição à direita) com identidade de facção, estendendo os dados para trazer classe + facção.

**Architecture:** `getHeroDetail` passa a trazer classe/facção via nested select; `assembleHeroDetail` (pura) achata os campos. Componentes de apresentação novos (`HeroIdentity`, `RadarPanel`) e restyle Tailwind de `GearSlotView`/`LineupRow`. `HeroPage` reescrita monta as duas colunas reusando `AppShell`, `RadarChart` e `factionColor`.

**Tech Stack:** Vite + React 18 + TS, Tailwind v4, Vitest + Testing Library, react-router-dom, `@supabase/supabase-js`.

## Global Constraints

- Reusa o design system (tokens Tailwind, `factionColor`, `AppShell`, `RadarChart`). Duas colunas no desktop (`lg:`), empilha no mobile. Dark-only.
- Extensão de dados SÓ nisto: `getHeroDetail` + `assembleHeroDetail` + `HeroDetail` ganham `classes`/`factions`. Nada mais no pipeline/queries.
- Suíte automatizada **offline**; o caminho de rede da query é verificado manualmente (anon key do `app/.env.local`) na Task 1.
- `factionColor(titleEn)` (já existe) pinta facção; classe fica neutra (sem cor própria).
- Nome usa `name_pt ?? name_en`; seção de vídeos só quando `videos.length > 0`.
- `GearSlotView`/`LineupRow` são **restilizados** (Tailwind) mantendo props/comportamento — seus testes existentes devem continuar verdes. `HeroCard` e CSS legado ficam intactos.

---

## Mapa de arquivos

- `app/src/lib/types.ts` — `HeroDetail` += `classes`, `factions`.
- `app/src/lib/queries.ts` — estender `getHeroDetail` + `assembleHeroDetail`.
- `app/src/components/HeroIdentity.tsx` — retrato + estrelas + chips + labels (novo) + teste.
- `app/src/components/RadarPanel.tsx` — radar + legenda (novo) + teste.
- `app/src/components/GearSlot.tsx` (`GearSlotView`) — restyle Tailwind.
- `app/src/components/LineupRow.tsx` — restyle Tailwind.
- `app/src/pages/HeroPage.tsx` — reescrita (duas colunas) + teste reescrito.
- Reaproveitados: `RadarChart`, `factionColor`, `AppShell`.

---

### Task 1: Estender getHeroDetail com classe + facção

**Files:**
- Modify: `app/src/lib/types.ts` (`HeroDetail` += `classes`, `factions`)
- Modify: `app/src/lib/queries.ts` (`assembleHeroDetail` + `getHeroDetail`)
- Test: `app/src/lib/queries.test.ts` (estender o teste de `assembleHeroDetail`)

**Interfaces:**
- Produces: `HeroDetail` com `classes: { title_en: string; title_pt: string | null }[]` e
  `factions: { title_en: string; title_pt: string | null }[]`; `assembleHeroDetail` popula ambos.

- [ ] **Step 1: Estender o teste de assembleHeroDetail (falha)**

No `app/src/lib/queries.test.ts`, no teste existente de `assembleHeroDetail`, adicionar ao
objeto `hero` do fixture os campos nested e asserts. Adicionar também um novo teste:
```ts
describe('assembleHeroDetail (classe/facção)', () => {
  it('achata classes e factions do payload de heroes', () => {
    const detail = assembleHeroDetail({
      hero: {
        id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina',
        hero_classes: [{ classes: { title_en: 'Fighter', title_pt: 'Lutador' } }],
        hero_factions: [
          { factions: { title_en: 'Chaotic', title_pt: 'Caótico' } },
          { factions: { title_en: 'Northerner', title_pt: 'Nortista' } },
        ],
      },
      labels: [], rates: [], gear: { gear: [] }, artifacts: { artifacts: [] },
      lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.classes).toEqual([{ title_en: 'Fighter', title_pt: 'Lutador' }]);
    expect(detail.factions.map((f) => f.title_en)).toEqual(['Chaotic', 'Northerner']);
  });
  it('sem classes/factions viram []', () => {
    const detail = assembleHeroDetail({
      hero: { id: 2, name_pt: null, name_en: 'X', big_card_url: null, star_level: null, special_pt: null },
      labels: [], rates: [], gear: { gear: [] }, artifacts: { artifacts: [] },
      lineups: { lineups: [] }, videos: { videos: [] },
    });
    expect(detail.classes).toEqual([]);
    expect(detail.factions).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/lib/queries.test.ts`
Expected: FAIL (`detail.classes`/`detail.factions` indefinidos).

- [ ] **Step 3: Implementar**

Em `app/src/lib/types.ts`, adicionar ao `interface HeroDetail` (junto dos demais campos):
```ts
  classes: { title_en: string; title_pt: string | null }[];
  factions: { title_en: string; title_pt: string | null }[];
```
Em `app/src/lib/queries.ts`, no `assembleHeroDetail`, adicionar ao objeto retornado:
```ts
    classes: (p.hero.hero_classes ?? []).map((hc: any) => hc.classes).filter(Boolean),
    factions: (p.hero.hero_factions ?? []).map((hf: any) => hf.factions).filter(Boolean),
```
E no `getHeroDetail`, trocar o select de `heroes` de `'*'` para:
```ts
    sb.from('heroes')
      .select('*, hero_factions(factions(title_en, title_pt)), hero_classes(classes(title_en, title_pt))')
      .eq('id', heroId).single(),
```

- [ ] **Step 4: Rodar e ver passar + tsc**

Run: `cd app && npx vitest run src/lib/queries.test.ts && npx tsc --noEmit`
Expected: testes passam; `tsc` limpo (o `HeroPage` antigo ainda compila — só ganhou campos novos opcionais de uso).

- [ ] **Step 5: Verificação manual contra o Supabase real**

```bash
URL=$(grep VITE_SUPABASE_URL app/.env.local | cut -d= -f2)
ANON=$(grep VITE_SUPABASE_ANON_KEY app/.env.local | cut -d= -f2)
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "$URL/rest/v1/heroes?id=eq.2843769&select=name_pt,hero_classes(classes(title_en,title_pt)),hero_factions(factions(title_en,title_pt))"
```
Expected: Lu Bu com classe `Fighter`/`Lutador` e facções `Chaotic`/`Caótico` + `Northerner`/`Nortista`. Cole o resultado no report.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/types.ts app/src/lib/queries.ts app/src/lib/queries.test.ts
git commit -m "feat(app): getHeroDetail traz classe + facção"
```

---

### Task 2: Componente HeroIdentity

**Files:**
- Create: `app/src/components/HeroIdentity.tsx`
- Test: `app/src/components/HeroIdentity.test.tsx`

**Interfaces:**
- Consumes: `HeroDetail` (Task 1), `factionColor` (existente).
- Produces: `HeroIdentity({ hero }: { hero: HeroDetail })` — retrato com aura de facção, estrelas, chips de classe/facção, labels.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/HeroIdentity.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroIdentity } from './HeroIdentity';
import type { HeroDetail } from '../lib/types';

const hero: HeroDetail = {
  id: 1, name_pt: 'Lu Bu', name_en: 'Lu Bu', big_card_url: 'b.png', star_level: 5, special_pt: 'domina',
  labels: [{ label_pt: 'DPS em Área', label_en: 'AoE DPS' }],
  rates: [], gear: [], artifacts: [], lineups: [], videos: [],
  classes: [{ title_en: 'Fighter', title_pt: 'Lutador' }],
  factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
};

describe('HeroIdentity', () => {
  it('renderiza retrato, estrelas, chips de classe/facção e label', () => {
    render(<HeroIdentity hero={hero} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'b.png');
    expect(screen.getByLabelText('5 estrelas')).toBeInTheDocument();
    expect(screen.getByText('Lutador')).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
    expect(screen.getByText('DPS em Área')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/HeroIdentity.test.tsx`
Expected: FAIL ("Cannot find module './HeroIdentity'").

- [ ] **Step 3: Implementar**

Create `app/src/components/HeroIdentity.tsx`:
```tsx
import type { HeroDetail } from '../lib/types';
import { factionColor } from '../lib/factionColors';

export function HeroIdentity({ hero }: { hero: HeroDetail }) {
  const name = hero.name_pt ?? hero.name_en;
  const aura = factionColor(hero.factions[0]?.title_en ?? 'Unnamed');
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="overflow-hidden rounded-xl border-2" style={{ borderColor: aura }}>
        {hero.big_card_url && <img src={hero.big_card_url} alt={name} className="w-full object-cover" />}
      </div>

      <div className="mt-3 flex items-center gap-0.5 text-lg text-[#f5c542]"
           aria-label={`${hero.star_level ?? 0} estrelas`}>
        {'★'.repeat(hero.star_level ?? 0)}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {hero.classes.map((c) => (
          <span key={c.title_en}
                className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {c.title_pt ?? c.title_en}
          </span>
        ))}
        {hero.factions.map((f) => (
          <span key={f.title_en} className="rounded-full border px-2 py-0.5 text-xs"
                style={{ color: factionColor(f.title_en), borderColor: factionColor(f.title_en) }}>
            {f.title_pt ?? f.title_en}
          </span>
        ))}
      </div>

      {hero.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {hero.labels.map((l, i) => (
            <span key={i} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-subtle">
              {l.label_pt ?? l.label_en}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/HeroIdentity.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HeroIdentity.tsx app/src/components/HeroIdentity.test.tsx
git commit -m "feat(app): componente HeroIdentity"
```

---

### Task 3: Componente RadarPanel (radar + legenda)

**Files:**
- Create: `app/src/components/RadarPanel.tsx`
- Test: `app/src/components/RadarPanel.test.tsx`

**Interfaces:**
- Consumes: `DungeonRate`/`Dungeon` (existentes), `RadarChart` (existente).
- Produces: `RadarPanel({ rates, dungeons }: { rates: DungeonRate[]; dungeons: Dungeon[] })` — alinha rates à ordem das dungeons, renderiza o radar + legenda numerada.

- [ ] **Step 1: Teste que falha**

Create `app/src/components/RadarPanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RadarPanel } from './RadarPanel';

const dungeons = [
  { id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: null },
  { id: 31, index: 2, name_pt: 'Guerra de Guilda', name_en: 'Guild War', icon_url: null },
];
const rates = [{ dungeon_id: 30, rate: 50 }, { dungeon_id: 31, rate: 10 }];

describe('RadarPanel', () => {
  it('renderiza o radar e a legenda com os nomes dos modos', () => {
    render(<RadarPanel rates={rates} dungeons={dungeons} />);
    expect(document.querySelector('polygon')).toBeTruthy();
    expect(screen.getByText('Raide de Equipamento I')).toBeInTheDocument();
    expect(screen.getByText('Guerra de Guilda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && npx vitest run src/components/RadarPanel.test.tsx`
Expected: FAIL ("Cannot find module './RadarPanel'").

- [ ] **Step 3: Implementar**

Create `app/src/components/RadarPanel.tsx`:
```tsx
import type { DungeonRate, Dungeon } from '../lib/types';
import { RadarChart } from './RadarChart';

export function RadarPanel({ rates, dungeons }: { rates: DungeonRate[]; dungeons: Dungeon[] }) {
  const ordered = dungeons.slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (ordered.length === 0) return null;

  const rateMap = new Map(rates.map((r) => [r.dungeon_id, r.rate]));
  const values = ordered.map((d) => rateMap.get(d.id) ?? 0);
  const labels = ordered.map((d) => String(d.index ?? ''));
  const maxRate = Math.max(50, ...values);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted">
        Conteúdos Ideais
      </h2>
      <div className="flex justify-center">
        <RadarChart values={values} labels={labels} max={maxRate} size={280} />
      </div>
      <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-subtle">
        {ordered.map((d) => (
          <li key={d.id} className="flex gap-1.5">
            <span className="w-4 shrink-0 text-right text-muted">{d.index}</span>
            <span className="truncate">{d.name_pt ?? d.name_en}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && npx vitest run src/components/RadarPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/RadarPanel.tsx app/src/components/RadarPanel.test.tsx
git commit -m "feat(app): componente RadarPanel (radar + legenda)"
```

---

### Task 4: Restyle Tailwind de GearSlotView e LineupRow

**Files:**
- Modify (reescrever o JSX): `app/src/components/GearSlot.tsx`, `app/src/components/LineupRow.tsx`

**Interfaces:**
- Consumes/Produces: mesmas assinaturas (`GearSlotView({ slot })`, `LineupRow({ lineup })`) e o MESMO texto/estrutura de nós visíveis — só troca as classes por Tailwind. Os testes existentes (`GearSlot.test.tsx`, `LineupRow.test.tsx`) devem continuar verdes SEM alteração.

Nota de teste: os testes usam `getByText('ATQ')` etc.; o Testing Library casa pelo **texto direto** do elemento (ignora filhos-elemento). Mantenha o padrão `<div><span>Principal:</span> {attrs.join(', ')}</div>` (o nó de texto direto do `div` = os atributos), e os nomes de set/slot/herói em seus próprios elementos de texto.

- [ ] **Step 1: Confirmar os testes atuais (baseline verde)**

Run: `cd app && npx vitest run src/components/GearSlot.test.tsx src/components/LineupRow.test.tsx`
Expected: PASS (baseline antes do restyle).

- [ ] **Step 2: Reescrever `GearSlot.tsx`**

Overwrite `app/src/components/GearSlot.tsx`:
```tsx
import type { GearSlot } from '../lib/types';

export function GearSlotView({ slot }: { slot: GearSlot }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center gap-2">
        {slot.slot.icon_url && <img src={slot.slot.icon_url} alt="" className="h-6 w-6" />}
        <strong className="font-display text-sm text-fg">{slot.slot.name}</strong>
      </div>
      <ul className="space-y-1.5">
        {slot.sets.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            {s.icon_url && <img src={s.icon_url} alt="" className="h-5 w-5" />}
            <span className="text-sm text-fg">{s.name}</span>
            <span className="text-xs text-muted">{s.desc}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-0.5 text-xs text-muted">
        <div><span className="text-subtle">Principal:</span> {slot.main_attrs.map((a) => a.name).join(', ')}</div>
        <div><span className="text-subtle">Secundários:</span> {slot.sub_attrs.map((a) => a.name).join(', ')}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reescrever `LineupRow.tsx`**

Overwrite `app/src/components/LineupRow.tsx`:
```tsx
import type { Lineup } from '../lib/types';

export function LineupRow({ lineup }: { lineup: Lineup }) {
  return (
    <div className="flex flex-wrap gap-2">
      {lineup.heroes.map((h) => (
        <div key={h.id} className="flex w-16 flex-col items-center gap-1 text-center">
          {h.card_url && (
            <img src={h.card_url} alt={h.name} loading="lazy"
                 className="h-14 w-full rounded-lg object-cover" />
          )}
          <span className="w-full truncate text-[11px] text-muted">{h.name}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rodar os testes existentes (devem seguir verdes) + tsc**

Run: `cd app && npx vitest run src/components/GearSlot.test.tsx src/components/LineupRow.test.tsx && npx tsc --noEmit`
Expected: PASS sem alterar os testes; `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GearSlot.tsx app/src/components/LineupRow.tsx
git commit -m "style(app): restyle Tailwind de GearSlotView e LineupRow"
```

---

### Task 5: Reescrever HeroPage (duas colunas)

**Files:**
- Modify (reescrever): `app/src/pages/HeroPage.tsx`
- Modify (reescrever): `app/src/pages/HeroPage.test.tsx`

**Interfaces:**
- Consumes: `useHero`, `useDungeons`, `AppShell`, `HeroIdentity`, `RadarPanel`, `GearSlotView`, `LineupRow`.
- Produces: `HeroPage()` — duas colunas (identidade + radar à esquerda sticky; gear/artefatos/times/descrição/vídeos à direita).

- [ ] **Step 1: Reescrever o teste (falha com a HeroPage antiga)**

Overwrite `app/src/pages/HeroPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ heroId: '1' }),
}));
vi.mock('../hooks/useDungeons', () => ({
  useDungeons: () => ({
    data: [{ id: 30, index: 1, name_pt: 'Raide de Equipamento I', name_en: 'Gear Raid I', icon_url: null }],
    loading: false, error: null,
  }),
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
      classes: [{ title_en: 'Fighter', title_pt: 'Lutador' }],
      factions: [{ title_en: 'Chaotic', title_pt: 'Caótico' }],
    },
    loading: false, error: null,
  }),
}));

import { HeroPage } from './HeroPage';

describe('HeroPage', () => {
  it('renderiza cabeçalho, identidade, radar, gear, artefato, time e descrição', () => {
    render(<MemoryRouter><HeroPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Lu Bu' })).toBeInTheDocument();
    expect(screen.getByText('Caótico')).toBeInTheDocument();
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
Expected: FAIL (a HeroPage antiga usa `label_pt` etc. no formato antigo e não tem chip de facção 'Caótico').

- [ ] **Step 3: Reescrever a HeroPage**

Overwrite `app/src/pages/HeroPage.tsx`:
```tsx
import { Link, useParams } from 'react-router-dom';
import { useHero } from '../hooks/useHero';
import { useDungeons } from '../hooks/useDungeons';
import { AppShell } from '../components/AppShell';
import { HeroIdentity } from '../components/HeroIdentity';
import { RadarPanel } from '../components/RadarPanel';
import { GearSlotView } from '../components/GearSlot';
import { LineupRow } from '../components/LineupRow';

export function HeroPage() {
  const { heroId } = useParams();
  const { data: hero, loading, error } = useHero(Number(heroId));
  const { data: dungeons } = useDungeons();

  if (loading) return <AppShell title="Herói"><p className="text-muted">Carregando…</p></AppShell>;
  if (error || !hero) return <AppShell title="Herói"><p className="text-muted">Erro ao carregar herói.</p></AppShell>;

  const name = hero.name_pt ?? hero.name_en;

  return (
    <AppShell title={name} subtitle="Detalhe do herói">
      <Link to="/" className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface
                              px-3 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-fg">
        <span aria-hidden className="text-base leading-none">←</span> Voltar
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <HeroIdentity hero={hero} />
          <RadarPanel rates={hero.rates} dungeons={dungeons ?? []} />
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Equipamento (Recomendado)</h2>
            <div className="space-y-3">
              {hero.gear.map((g) => <GearSlotView key={g.slot.id} slot={g} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Artefatos</h2>
            <ul className="space-y-2">
              {hero.artifacts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                  {a.icon_url && <img src={a.icon_url} alt="" className="h-8 w-8" />}
                  <div>
                    <div className="text-sm text-fg">{a.name}</div>
                    <div className="text-xs text-muted">{a.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Times Recomendados</h2>
            <div className="space-y-3">
              {hero.lineups.map((l, i) => <LineupRow key={i} lineup={l} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Descrição</h2>
            <p className="leading-relaxed text-muted">{hero.special_pt}</p>
          </section>

          {hero.videos.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Vídeos</h2>
              <p className="text-muted">{hero.videos.length} guia(s) disponível(is)</p>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Rodar e ver passar (e a suíte + tsc)**

Run: `cd app && npx vitest run src/pages/HeroPage.test.tsx && npx vitest run && npx tsc --noEmit`
Expected: o teste do Herói passa; a suíte inteira passa; `tsc` limpo.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/HeroPage.tsx app/src/pages/HeroPage.test.tsx
git commit -m "feat(app): tela de Herói redesenhada (duas colunas)"
```

---

## Verificação final

- [ ] `cd app && npx vitest run` — suíte inteira passa.
- [ ] `cd app && npx tsc --noEmit` — sem erros.
- [ ] `cd app && npm run build` — build conclui.
- [ ] Manual (Task 1 Step 5): a query estendida retorna classe/facção do Lu Bu no Supabase real.
- [ ] Visual (você/humano): `npm run dev` → abrir o Lu Bu (via um modo) → duas colunas: à esquerda o retrato com aura de facção, estrelas, chips (Lutador/Caótico/Nortista), labels e o radar + legenda; à direita gear/artefatos/times/descrição. No mobile empilha.

## Follow-ups (fora deste plano)

- Página **Heróis** (browse) + busca global.
- Tier badges (S/A/B) a partir do rate.
- Endpoint de vídeos/guias; espelhar imagens.
- Remover `HeroCard` legado (não usado) e limpar o CSS legado agora que Modo/Herói são Tailwind.
