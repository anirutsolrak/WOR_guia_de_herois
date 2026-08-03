# WoR Guia de Heróis — Design

- **Data:** 2026-08-02
- **Status:** Aprovado (aguardando plano de implementação)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

App (web + mobile via PWA), em português, que serve como **guia/tier-list por conteúdo**
para o jogo *Watcher of Realms*. Os dados vêm da API da comunidade oficial
(`app-web.mproject.skystone.games/actgateway/zgamecommunity/`).

A sacada central: o gráfico radar "Suitable Raids" de cada herói é montado a partir do
array `dungeon_usage`, onde cada um dos ~19 modos/raids tem um `rate`. Quanto maior o
`rate`, melhor o herói é naquele conteúdo. O app **inverte** esses dados para, dado um
modo (ex.: GVG), listar todos os heróis ranqueados por quão bons são ali.

## Objetivos

- Índice dos ~19 modos como pontos de entrada.
- Por modo: lista de heróis ordenada por `rate` (tier-list por conteúdo), com foto + valor.
- Detalhe do herói: radar, gear *System Recommended*, artefatos, times, descrição/labels, vídeos.
- Todo o conteúdo traduzido EN → PT (guardando ambos).

## Não-objetivos (YAGNI no MVP)

- Espelhar imagens (hotlink do CDN por enquanto; URL guardada pra espelhar depois).
- Contas de usuário / favoritos / times montados pelo usuário.
- As abas "Server Stats" e "Top Player Stats" de gear (foco em *System Recommended*).
- Toggle de idioma na UI (dados já ficam EN+PT; toggle pode vir depois).

## Decisões

| Área | Escolha |
|---|---|
| Dados | Supabase híbrido: Edge Functions (Deno) + cron/trigger + tabelas Postgres |
| Tradução | Glossário curado + tradução automática pros textos longos; guarda EN e PT |
| Frontend | Vite + React + PWA (`vite-plugin-pwa`), consumindo Supabase pelo client |
| Detalhe do herói | Completo: radar + gear System Recommended + artefatos + times + descrição/labels + vídeos |
| Imagens | Hotlink do CDN do jogo no MVP; URL original guardada no banco |
| Modelagem | Híbrido: tabelas de referência (com PT) + JSONB por herói pras estruturas montadas |
| Estratégia | **PoC-first**: um herói de ponta a ponta antes de escalar pra todos |

## Arquitetura

```
API do jogo (skystone)      cron/trigger      Supabase Edge Function "scraper" (Deno)
 /heroes  /heroes/{id}  ◄───────────────────  + glossário + tradução automática
 /classes /factions     ──────── json ──────►         │ grava
                                                       ▼
                                        Postgres (Supabase): refs + heroes
                                        + JSONB por herói + hero_dungeon_rates
                                                       │ client SDK
                                                       ▼
                                        App PWA (Vite + React)
                                        Índice / Modo / Detalhe do herói
```

## Estratégia PoC-first (critério de sucesso da Fase 1)

Antes de buscar todos os heróis, provar a fatia vertical de ponta a ponta:

1. Popular as tabelas de referência (dungeons, classes, factions, glossário).
2. Rodar o scraper para **1 herói** — Lu Bu (`id 2843769`), que tem `rate` variado e
   todos os tipos de gear/artefato/lineup preenchidos.
3. O app mostra: o **índice** dos 19 modos → uma **página de modo** onde o Lu Bu aparece
   ranqueado com seu `rate` → o **detalhe completo** dele, tudo em PT.
4. Só depois disso funcionar, trocamos "1 herói" por "todos" (`mode=all`) + cron.

## Modelo de dados (Supabase / Postgres)

**Tabelas de referência (com tradução PT):**

- `dungeons` (id, index, name_en, name_pt, icon_url) — os ~19 modos
- `classes` (id, title_en, title_pt, icon_url)
- `factions` (id, title_en, title_pt, icon_url, lord_icon_url)
- `attributes` (attr_id, name_en, name_pt, icon_url) — ATK, HP Bonus, Crit. DMG…
- `equipment_sets` (id, name_en, name_pt, desc_en, desc_pt, icon_url)
- `equipment_slots` (id, name_en, name_pt, icon_url) — Weapon, Breastplate, Bangle, Amulet, Ring
- `artifacts` (id, name_en, name_pt, desc_en, desc_pt, icon_url, quality)
- `glossary` (term_en, term_pt, category) — dicionário curado que alimenta refs + labels

**Tabelas do herói:**

- `heroes` (id, name_en, name_pt, card_url, big_card_url, star_level, index, is_lord,
  channel, special_en, special_pt, updated_at, source_raw JSONB)
- `hero_classes` (hero_id, class_id) — m2m
- `hero_factions` (hero_id, faction_id) — m2m
- `hero_labels` (hero_id, label_en, label_pt)
- **`hero_dungeon_rates` (hero_id, dungeon_id, rate)** — tabela invertida; índice em
  `(dungeon_id, rate desc)`. Motor do ranking por modo.
- `hero_gear` (hero_id, gear JSONB) — estrutura montada (slots × opções de set × main/sub
  attrs), só *System Recommended* no MVP; texto PT + ids das refs
- `hero_artifacts` (hero_id, artifacts JSONB)
- `hero_lineups` (hero_id, lineups JSONB)
- `hero_videos` (hero_id, videos JSONB)

**Nota:** `source_raw` (JSON cru por herói) é guardado — barato e permite reprocessar
tradução/estrutura sem re-bater na API.

## Pipeline / Scraper (Edge Function em Deno)

Uma função, três modos por parâmetro:

- `mode=refs` → busca `/classes` e `/factions`; deriva dungeons/attributes/sets/slots/
  artifacts a partir do primeiro detalhe processado. Popula refs + aplica glossário.
- `mode=hero&id=XXXX` → busca `/heroes/{id}`, traduz, monta estruturas, grava tabelas do
  herói (incluindo a inversão pra `hero_dungeon_rates`).
- `mode=all` (pós-PoC) → busca `/heroes`, itera chamando o fluxo `hero` por id, com
  *rate limiting* gentil (delay entre chamadas).

**Processamento de um herói:**

1. Fetch do detalhe com headers necessários (`x-lang: en`, `x-location`, `user-agent`…).
2. Upsert das entidades de referência que aparecerem (idempotente).
3. Traduzir: termos via `glossary`; textos longos via API de tradução, com cache
   (não retraduz o que já existe).
4. Montar os JSONBs (gear/artefatos/lineups/videos) com texto PT + ids de referência.
5. Inverter `dungeon_usage` → linhas em `hero_dungeon_rates`.
6. Upsert em `heroes` + tabelas filhas (transação).

**Cron:** agendamento Supabase (pg_cron / Scheduled Edge Function) chama `mode=all` na
periodicidade escolhida (ex.: diária). No PoC, disparamos manualmente `mode=refs` e
depois `mode=hero&id=2843769`.

**Idempotência:** tudo é upsert por id → rodar de novo atualiza, nunca duplica.

## Estrutura do app (Vite + React + PWA)

**Rotas:**

- `/` — **Índice**: grid dos 19 modos (ícone + nome PT), de `dungeons`.
- `/modo/:dungeonId` — **Lista por modo**: heróis ordenados por `rate desc`
  (`hero_dungeon_rates` join `heroes`). Card: foto + nome PT + badge/barra do `rate`.
- `/heroi/:heroId` — **Detalhe**: cabeçalho (big_card, nome, estrelas, classe, facção,
  labels) → radar → gear System Recommended → artefatos → times → descrição (`special_pt`)
  → vídeos.

**Componentes-chave:** `RadarChart` (SVG próprio, 19 eixos), `HeroCard`, `RateBar`,
`GearSlot`, `LineupRow`.

**PWA:** `vite-plugin-pwa` (manifest instalável + service worker). Cache das respostas do
Supabase (stale-while-revalidate). Imagens por hotlink do CDN.

**i18n:** dados já EN+PT no banco; MVP exibe PT, toggle opcional depois.

## Fluxo de tradução

- `glossary` é a fonte da verdade dos termos fixos (classes, facções, stats, sets, labels,
  nomes de raid). Curado; o pipeline consulta antes de cair no automático.
- Textos livres (`special`, descrições): API de tradução (DeepL ou Google — decidir na
  implementação), com resultado **cacheado** por hash do texto (controla custo).
- Nomes próprios de heróis: mantidos como estão (configurável no glossário).
- Sempre EN + PT guardados → revisar/corrigir sem re-scrapear.

## A decidir na implementação

- Provedor de tradução automática (DeepL vs Google Translate) e onde guardar a chave.
- Periodicidade exata do cron.
- Biblioteca de data-fetching no app (React Query vs client puro do Supabase).

## Fases

- **Fase 1 — PoC (pipeline + banco + fatia do app):** schema, Edge Function (`refs` +
  `hero`), tradução, e o app renderizando índice/modo/detalhe com **um** herói.
- **Fase 2 — Escala:** `mode=all` + cron; revisão do glossário; ajustes de performance.
