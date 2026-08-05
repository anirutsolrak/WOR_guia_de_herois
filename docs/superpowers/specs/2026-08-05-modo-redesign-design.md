# WoR Guia — Redesign da tela de Modo — Design

- **Data:** 2026-08-05
- **Status:** Aprovado (aguardando plano)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

Redesenhar a tela de **Modo** (`/modo/:dungeonId`) no estilo "modern gaming tracker",
reusando o design system já estabelecido (tokens Tailwind, fontes, cores de facção). A tela
lista os heróis ordenados pelo `rate` naquele conteúdo — um **ranking em linhas (leaderboard)**
com identidade de facção. Fatia seguinte ao redesign do Índice.

## Decisões

| Área | Escolha |
|---|---|
| Layout | Ranking em linhas (leaderboard vertical) |
| Cabeçalho | `AppShell` com identidade do modo (nome + brilho/banner) + link "← Modos" |
| Identidade | Cor da facção no anel do retrato + chip(s) de facção por linha |
| Rate | Barra (gradiente de acento) + valor numérico; top-3 com destaque de rank |
| Dados | Estender `getHeroesByDungeon` para trazer as facções (join) |

## Não-objetivos

- Redesenhar a tela de Herói (próxima fatia).
- Remover o `HeroCard`/CSS legado (fica intacto; só deixa de ser usado no Modo).
- Filtros/ordenação alternativa (só ranking por rate, como hoje).
- Tier badges S/A/B (pode vir depois; agora é barra + valor).

## Mudanças de dados

1. **`getHeroesByDungeon(sb, dungeonId)`** passa a trazer as facções de cada herói via nested
   select do Supabase:
   ```
   .select('rate, heroes(id, name_pt, name_en, card_url, hero_factions(factions(title_en, title_pt)))')
   ```
   e mapeia para `{ id, name_pt, name_en, card_url, rate, factions: {title_en, title_pt}[] }`
   (achatando `heroes.hero_factions[].factions`). Ordena por `rate desc` (como hoje).
   Verificável contra o Supabase real (Lu Bu já populado: facções Caótico + Nortista).

2. **`factionColors.ts`** — mapa puro `factionColor(titleEn: string): string` que retorna a
   CSS var da cor da facção (ex.: `'Chaotic' → 'var(--color-faction-chaotic)'`). Desconhecido
   → `var(--color-faction-unnamed)`. As vars já existem no `@theme` (Task do Índice).

## Layout

**Cabeçalho (`AppShell`):** título = nome do modo (`name_pt ?? name_en`), subtítulo
"Ranking de heróis", link "← Modos" para `/`. O `AppShell` ganha uma prop opcional
`banner?: string` (URL) que, quando presente, entra como imagem/brilho de fundo da faixa
(o `icon_url` do modo). O nome/banner do modo vêm de `useDungeons()` filtrando pelo
`dungeonId` da rota.

**`HeroRankRow` (uma linha do ranking):**
- **Rank** (#1, #2…) à esquerda; top-3 com cor de destaque (ouro/prata/bronze sutil), demais em `muted`.
- **Anel de facção**: o retrato (`card_url`) numa moldura arredondada com anel na cor da
  facção primária (`factions[0]`), via `factionColor`.
- **Nome PT** (`name_pt ?? name_en`) + **chip(s) de facção** (`title_pt`, borda/texto na cor da facção).
- **Barra de rate** (gradiente de acento) + **valor** (1 casa) à direita. Normaliza por
  `max(50, maiorRateDaLista)`.
- A linha inteira é um `<Link>` para `/heroi/:id`, com hover sutil (leve realce de fundo/borda).

**Estados:** loading e erro dentro do `AppShell`; lista vazia → mensagem "Nenhum herói
ranqueado ainda neste modo." (esperado enquanto só o Lu Bu está populado).

## Estrutura de arquivos

- `app/src/lib/queries.ts` — estender `getHeroesByDungeon` (+ facções) e o tipo de retorno;
  extrair o achatamento do payload nested numa função pura `mapHeroRankItems(rows)` (testável sem rede).
- `app/src/lib/types.ts` — tipo `HeroRankItem` (id, name_pt, name_en, card_url, rate, factions).
- `app/src/lib/factionColors.ts` — `factionColor()` (puro).
- `app/src/components/HeroRankRow.tsx` — a linha do ranking.
- `app/src/components/AppShell.tsx` — adicionar a prop opcional `banner?`.
- `app/src/pages/ModePage.tsx` — reescrita (usa `useDungeons` p/ o header + `useHeroesByDungeon` p/ a lista).
- Testes: `factionColors.test.ts`, `HeroRankRow.test.tsx`, `ModePage.test.tsx` (novo/reescrito), `AppShell.test.tsx` (caso do banner).

## Testes

- `factionColors`: cada uma das 10 facções (EN) → a CSS var certa; desconhecido → unnamed.
- `getHeroesByDungeon` (extensão): a suíte automatizada NÃO faz rede. A extensão da query é
  verificada por uma **checagem manual** (node/curl com a anon key) contra o Supabase real
  durante a implementação — o Lu Bu no modo Titanic Spellbane deve retornar as facções
  (Caótico, Nortista) junto do rate. Um teste puro cobre o **mapeamento/achatamento** de um
  payload nested de exemplo (sem rede).
- `HeroRankRow`: renderiza rank, nome, chip de facção, valor do rate, e é link para `/heroi/:id`.
- `ModePage`: com `useDungeons`/`useHeroesByDungeon` mockados, mostra o nome do modo no header
  e as linhas ordenadas; estado vazio.
- `AppShell`: quando `banner` é passado, a faixa recebe a imagem de fundo.

## A decidir na implementação

- Estilo exato do destaque top-3 (medalha vs. cor do número).
- Se o chip de classe entra junto do de facção (só se o join de classe vier trivial; senão fica pra depois).
- Ajuste fino dos hexes de facção ao ver em tela.

## Fases seguintes (fora deste spec)

- Redesign da tela **Herói** (a mais rica).
- Tier badges (S/A/B) derivados do rate.
- Página **Heróis** (browse) + busca global.
