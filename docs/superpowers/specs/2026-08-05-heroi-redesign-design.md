# WoR Guia — Redesign da tela de Herói — Design

- **Data:** 2026-08-05
- **Status:** Aprovado (aguardando plano)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

Redesenhar a tela de **Herói** (`/heroi/:heroId`) — a mais rica — no estilo "modern gaming
tracker", em **duas colunas no desktop** (empilha no mobile), reusando o design system e a
identidade de facção. Fatia final da série de redesign (Índice → Modo → Herói).

## Decisões

| Área | Escolha |
|---|---|
| Layout | Duas colunas no desktop; empilha no mobile |
| Topo | `AppShell` com título = nome do herói + botão "← Voltar" + brilho tingido pela facção |
| Coluna esquerda (sticky) | Retrato (`big_card`) com aura de facção, estrelas, chips de classe/facção, labels, e o radar + legenda |
| Coluna direita (rola) | Gear (System Recommended), artefatos, times, descrição, vídeos |
| Dados | Estender `getHeroDetail` para trazer classe + facção |

## Não-objetivos

- Página **Heróis** (browse) / busca global.
- Tier badges S/A/B; endpoint de vídeos (segue vazio).
- Remover CSS/legado de `HeroCard` (intacto).

## Mudanças de dados

1. **`getHeroDetail(sb, heroId)`**: estender o select de `heroes` para incluir classe e facção:
   ```
   .from('heroes')
   .select('*, hero_factions(factions(title_en, title_pt)), hero_classes(classes(title_en, title_pt))')
   .eq('id', heroId).single()
   ```
2. **`assembleHeroDetail`** (pura, já testada): mapear/achatar `factions` (de
   `hero.hero_factions[].factions`) e `classes` (de `hero.hero_classes[].classes`) para o
   `HeroDetail`. Continua achatando gear/artifacts/lineups/videos como hoje.
3. **`HeroDetail`** (em `types.ts`) ganha:
   `classes: { title_en: string; title_pt: string | null }[]` e
   `factions: { title_en: string; title_pt: string | null }[]`.

Verificável contra o Supabase real (Lu Bu: classe Fighter/Lutador; facções Chaotic/Northerner).

## Layout

**`AppShell`:** `title` = `name_pt ?? name_en`; um botão "← Voltar" (link para `/`) no topo do
conteúdo; opcionalmente `banner` com brilho tingido pela facção primária (via `factionColor`).

**Coluna esquerda — `HeroIdentity` + `RadarPanel`:**
- **`HeroIdentity`**: card com o `big_card` (aura/borda na cor da facção primária), `star_level`
  em ★, chips de **classe** (neutro) e **facção** (cor da facção via `factionColor`), e os
  **labels** (tags) como chips.
- **`RadarPanel`**: alinha `rates` à ordem das dungeons (por `index`), renderiza o `RadarChart`
  (reaproveitado) com rótulos numéricos, e uma **legenda** numerada (nº → `name_pt` do modo).

**Coluna direita:**
- **Gear (System Recommended)**: os 5 slots via `GearSlotView` (restyle Tailwind — cards limpos,
  set + main/sub attrs).
- **Artefatos**: lista/cards (nome + desc + ícone).
- **Times recomendados**: via `LineupRow` (restyle Tailwind).
- **Descrição**: `special_pt`.
- **Vídeos**: só quando `videos.length > 0`.

No desktop (≥ lg) a esquerda é `sticky top-…`; abaixo de lg tudo empilha (identidade → radar →
gear → artefatos → times → descrição).

## Estrutura de arquivos

- `app/src/lib/types.ts` — `HeroDetail` += `classes`, `factions`.
- `app/src/lib/queries.ts` — estender `getHeroDetail` + `assembleHeroDetail`.
- `app/src/components/HeroIdentity.tsx` — retrato + estrelas + chips + labels (novo).
- `app/src/components/RadarPanel.tsx` — radar + legenda (novo; usa `RadarChart`).
- `app/src/components/GearSlotView` (`GearSlot.tsx`) — restyle Tailwind.
- `app/src/components/LineupRow.tsx` — restyle Tailwind.
- `app/src/pages/HeroPage.tsx` — reescrita (duas colunas).
- Reaproveitados sem mudança de assinatura: `RadarChart`, `factionColor`, `AppShell`.
- Testes: `queries.test.ts` (assembleHeroDetail estendido), `HeroIdentity.test.tsx`,
  `RadarPanel.test.tsx`, `GearSlot.test.tsx`/`LineupRow.test.tsx` (continuam passando),
  `HeroPage.test.tsx` (reescrito).

## Testes

- `assembleHeroDetail`: com um payload contendo `hero_classes`/`hero_factions`, popula
  `classes` e `factions` (achatados); sem eles → `[]`.
- `HeroIdentity`: renderiza `big_card` (img), estrelas (contagem), chip de classe, chip de
  facção (texto PT) e um label.
- `RadarPanel`: renderiza um `<polygon>` e as entradas da legenda (nome do modo).
- `GearSlotView`/`LineupRow`: testes existentes continuam verdes após o restyle (comportamento
  inalterado, só classes).
- `HeroPage`: com `useHero`/`useDungeons` mockados, renderiza o nome no topo, a identidade
  (chip de facção), o radar, um set de gear, um artefato, um time e a descrição.

## A decidir na implementação

- Se o chip de **classe** ganha cor própria (por classe) ou fica neutro (provável: neutro agora).
- Estilo exato da aura de facção (borda vs. glow) no retrato.
- Offset do `sticky` (altura do topo) na coluna esquerda.

## Fases seguintes (fora deste spec)

- Página **Heróis** (browse) + busca global.
- Tier badges (S/A/B) a partir do rate.
- Endpoint de vídeos/guias; espelhar imagens no Storage.
