# WoR Guia — Redesign do Front (Design System + Índice) — Design

- **Data:** 2026-08-05
- **Status:** Aprovado (aguardando plano)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

Refatorar o front do app (Vite + React) para um visual **"modern gaming tracker"** —
elegante, moderno, valorizando a arte dos heróis e a identidade das facções. Este spec
cobre o **design system** (tokens + primitivos) e a **primeira tela redesenhada, o Índice**,
como fatia vertical. Modo e Herói vêm depois, reaproveitando o mesmo sistema.

Ponto de partida atual: `app/src/index.css` é um dark chapado, painéis planos, um só acento,
sem hierarquia tipográfica nem identidade de facção. O app já funciona e lê dados reais do
Supabase (Lu Bu populado).

## Decisões

| Área | Escolha |
|---|---|
| Estética | Modern gaming tracker (glassmorphism/gradientes sutis, tipografia forte, arte em destaque) |
| Tecnologia CSS | **Tailwind CSS** (utilitários + tokens no config), integrado ao Vite |
| Rollout | Design system + **Índice primeiro** (fatia vertical); depois Modo e Herói |
| Card de modo | Banner cinematográfico (imagem preenche, gradiente + nome, glow/lift no hover) |
| Arranjo do Índice | Agrupado por categoria (seções) |
| Topo/shell | Faixa "hero" editorial (marca + título grande + tagline + busca; brilho radial) |
| Fontes | Space Grotesk (títulos) + Inter (corpo), auto-hospedadas via `@fontsource` |

## Não-objetivos (agora)

- Redesenhar Modo e Herói (próximas fatias — mesmo sistema).
- Página "Heróis" (browse) — a busca do Índice, por ora, filtra só os cards de modo.
- Trocar dados/lógica: é redesign de UI; hooks/queries/tipos permanecem.
- Modo claro: o app é dark-only por enquanto.

## Design System (tokens)

Configurados no `tailwind.config` (theme.extend) e/ou como CSS variables consumidas pelo
Tailwind. Nomes são a fonte da verdade; hexes são ajustáveis na implementação.

**Cores base (camadas dark):**
- `bg` #0a0f1a · `surface` #0d1524 · `surface-2` #111c30
- `border` #1e2c45 · `border-strong` #223049
- `fg` #eaf1ff · `muted` #93a4c4 · `subtle` #6b7d9c

**Acento primário (gradiente):** `#4f8cff → #8a5cff` (marca, busca, foco, preenchimento de rate).

**Cores de facção (10)** — usadas como borda/aura/realce nas telas de Modo e Herói
(definidas já aqui para o sistema):
- Watcher/Vigia `#35c4c4` · Northerner/Nortista `#6bb8ff` · Nightmare/Pesadelo `#a06bff`
- Cultist/Cultista `#e05cc0` · Infernal `#ff6b4a` · Piercer/Perfurador `#52c46a`
- Esotericist/Esotérico `#7c6bff` · Chaotic/Caótico `#e0455f` · Arbiter/Árbitro `#e0b23c`
- Unnamed/Inominado `#8ea3c4`

**Escala de rate (barras/tier):** preenchimento com o gradiente primário; intensidade pode
crescer com o valor. Trilho em `border-strong`.

**Tipografia:** Space Grotesk (títulos/`display`) + Inter (corpo), via `@fontsource`
(sem CDN, PWA-safe). Escala: título de faixa 28–32/700; label de seção 12/uppercase/tracking
`.1em`; nome do card 14/700; corpo 14–16/Inter.

**Raio/sombra/movimento:** raios `sm 8` · `md 12` · `lg 14` · `pill 999`. Sombra de card
`0 6px 20px rgba(0,0,0,.35)`; glow no hover `0 10px 28px rgba(80,140,255,.28)`. Hover:
`translateY(-3px)` + glow, transição 150ms ease.

## Índice (primeira tela)

**Topo — faixa "hero" editorial (shell do app):**
- Marca: ícone (olho/escudo) em quadrado com gradiente primário + "WoR Guia" em texto
  gradiente. Fica no shell, presente em todas as telas.
- Título grande *"Melhores heróis por conteúdo"* + tagline *"Escolha um modo e veja o ranking"*.
- Campo de **busca**: por ora filtra os cards de modo por nome (case-insensitive). Busca de
  herói fica para quando existir a página Heróis (Fase 2).
- Fundo com brilho radial sutil (`radial-gradient` do acento no topo-direito) sobre `surface`.

**Corpo — seções por categoria:**
- Cada categoria é uma seção com um **label** pequeno (uppercase, tracking, com um "tick" de
  acento antes) e uma **grade responsiva** de cards.
- **Card de modo (banner cinematográfico):** o `icon_url` do modo preenche o card
  (`object-fit: cover`, leve opacidade), gradiente escuro de baixo pra cima, o nome em PT
  (`name_pt ?? name_en`) em negrito sobre a imagem; borda sutil que ganha **glow** e o card
  **sobe 3px** no hover. O card inteiro é um link para `/modo/:id`.

**Categorização (mapa nome→categoria, no app, sem mexer no schema):**

| Categoria | Modos |
|---|---|
| **Arena** | Arena Single-Target DPS · Arena AoE DPS · Arena Anti-Air DPS |
| **Gear** | Gear Raid I/II/III · Gear Dungeon I/II/III · Artifact Material Raid |
| **Guilda** | Guild War · Titanic Ruins Apocalypse I & II · Titanic Ruins Matrix I Bulwark · Titanic Ruins Matrix I Spellbane · Drake's Chasm Nightmare IV · Drake's Chasm Abyss I |
| **Torres & Ilusões** | Tower of Deception · Malrik's Halls The Black Sewer · Malrik's Halls Heart of the Volcano |

Total 3+7+6+3 = 19. A ordem das seções é a da tabela. Modo que não casar com nenhuma regra
cai numa seção final "Outros" (defensivo; não deve ocorrer com os 19 atuais).

## Estrutura de arquivos (Índice)

- `app/tailwind.config.js` + `app/postcss.config.js` — Tailwind + tokens.
- `app/src/index.css` — diretivas do Tailwind + camada base (fontes, `body`, brilho de fundo).
- `app/src/lib/categories.ts` — mapa `nome→categoria` + ordem das categorias (puro, testável).
- `app/src/components/AppShell.tsx` — faixa editorial (marca + título + tagline + busca) e slot de conteúdo.
- `app/src/components/ModeCard.tsx` — o card cinematográfico de modo.
- `app/src/components/SectionHeader.tsx` — label de categoria com tick.
- `app/src/pages/IndexPage.tsx` — reescrita: agrupa dungeons por categoria, filtra pela busca, renderiza seções + `ModeCard`.
- `@fontsource/inter` e `@fontsource/space-grotesk` — dependências.

Componentes existentes que só recebem classes/estilo depois (Modo/Herói) ficam intactos nesta fatia.

## Testes

- `categories.ts`: teste puro — cada um dos 19 nomes cai na categoria certa; ordem das
  categorias; fallback "Outros" para nome desconhecido.
- `ModeCard`: renderiza nome (PT com fallback EN), imagem com `src` do `icon_url`, e é um link para `/modo/:id`.
- `IndexPage`: com `useDungeons` mockado, agrupa nas seções certas e a busca filtra os cards.

## A decidir na implementação

- Ícone exato da marca (olho/escudo) — SVG inline simples.
- Ajuste fino dos hexes de facção quando entrarem nas telas de Modo/Herói.
- Breakpoints exatos da grade (ex.: 2 col mobile → 3–4 desktop).

## Fases seguintes (fora deste spec)

- Redesign da tela **Modo** (lista ranqueada) reusando tokens + identidade de facção.
- Redesign da tela **Herói** (a "pior") — cabeçalho com big_card, radar estilizado, gear/artefatos/times.
- Página **Heróis** (browse) + busca global.
