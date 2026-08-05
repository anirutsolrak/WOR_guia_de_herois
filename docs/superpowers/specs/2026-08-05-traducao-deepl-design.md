# WoR Guia — Tradução automática (DeepL) — Design

- **Data:** 2026-08-05
- **Status:** Aprovado (aguardando plano)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

Ligar tradução automática (DeepL) pros **textos corridos** do pipeline, que hoje ficam em
inglês (o scraper usa `passthrough`). Sub-projeto A da Fase 2 (o cron de re-sync é o B).

## Decisões

| Área | Escolha |
|---|---|
| Provedor | DeepL API **Free** (`https://api-free.deepl.com/v2/translate`), `target_lang=PT-BR` |
| Chave | Segredo da Edge Function `DEEPL_API_KEY` (nunca comitada) |
| Escopo | Traduz DESCRIÇÕES (`special` do herói, `desc` de sets e artefatos). NOMES próprios (set/artefato/herói) ficam em inglês. Termos fixos seguem pelo glossário. |
| Cache | Tabela `translations` (evita retradução; re-syncs baratos) |
| Fallback | Sem `DEEPL_API_KEY` setado → volta a `passthrough` (pipeline nunca quebra) |

## Não-objetivos

- Traduzir nomes próprios (sets/artefatos/heróis) — ficam em inglês por decisão.
- Mudar a UI/app (é mudança de pipeline; os campos `*_pt` já são exibidos).
- Cron de re-sync (sub-projeto B).

## Arquitetura — dois tradutores

Hoje o scraper aplica um único `t` (glossário + `passthrough`) a tudo. Passa a ter **dois**:

- **`tTerm`** = `makeTranslator(passthrough)` — para termos fixos (classe/facção/stats/slots/
  labels/dungeon names) **e** NOMES próprios (set/artefato/herói/lineup).
- **`tDesc`** = `makeTranslator(auto)` onde `auto` = DeepL com cache — para as DESCRIÇÕES
  (`special`, set `desc`, artifact `desc`).

Os builders e `localizeRefs` passam a receber os dois e chamam o certo por campo:

- `buildGear(d, term, desc)`: slot.name→term; set.name→term; set.desc→**desc**; attrs→term.
- `buildArtifacts(d, term, desc)`: name→term; desc→**desc**.
- `buildLineups(d, term)`: hero names→term.
- `localizeRefs(refs, term, desc)`: names (dungeons/classes/factions/slots/attrs/sets/artifacts)→term; sets.desc/artifacts.desc→**desc**.
- `processHero` (`index.ts`): hero name→term; labels→term; `special`→**desc**.

## Cache de tradução

Tabela (migration `0005_translations.sql`):
```sql
create table if not exists translations (
  source_hash text primary key,
  source_en text not null,
  target_pt text not null,
  provider text not null default 'deepl',
  created_at timestamptz default now()
);
```
`source_hash` = SHA-256 hex do texto EN. O `auto` do `tDesc`:
1. hash do texto → `select target_pt from translations where source_hash = ...`
2. hit → retorna; miss → chama DeepL, faz `upsert` no cache, retorna.

Como set/artifact `desc` se repetem entre heróis, o cache derruba muito a chamada à API;
re-syncs (sub-projeto B) quase não gastam cota.

## Componentes (translate.ts)

Funções puras/injetáveis (testáveis sem rede):
- `sha256Hex(text: string): Promise<string>` — chave de cache.
- `makeCachedAuto({ getCached, setCached, translate }): AutoFn` — orquestra cache→translate→cache.
  `getCached(en)`/`setCached(en, pt)`/`translate(en)` são injetados (fakes no teste).

Funções com rede (verificadas manualmente/integração, não na suíte):
- `deeplTranslate(apiKey, text): Promise<string>` — POST no DeepL Free (`DeepL-Auth-Key`, `target_lang=PT-BR`, `source_lang=EN`).
- `cacheGet(sb, en)` / `cacheSet(sb, en, pt)` — usam a tabela `translations` (via hash).

`index.ts` monta: `deeplKey = Deno.env.get('DEEPL_API_KEY')`; se presente,
`auto = makeCachedAuto({ getCached: en=>cacheGet(sb,en), setCached:(en,pt)=>cacheSet(sb,en,pt), translate: en=>deeplTranslate(deeplKey,en) })`; senão `auto = passthrough`.
`tTerm = makeTranslator(passthrough)`, `tDesc = makeTranslator(auto)`.

## Estrutura de arquivos

- `supabase/migrations/0005_translations.sql` — tabela de cache (+ RLS: sem policy de select público; só a service_role da função escreve/lê).
- `supabase/functions/scraper/translate.ts` — `sha256Hex`, `makeCachedAuto`, `deeplTranslate`, `cacheGet/cacheSet`.
- `supabase/functions/scraper/transform.ts` — `buildGear`/`buildArtifacts`/`buildLineups` recebem `term`/`desc`.
- `supabase/functions/scraper/db.ts` — `localizeRefs(refs, term, desc)`.
- `supabase/functions/scraper/index.ts` — monta `tTerm`/`tDesc` e roteia `special`/labels/name.
- Testes Deno: `sha256Hex` determinístico; `makeCachedAuto` (hit não chama translate; miss chama+grava); builders roteando name×desc (fakes distintos `TERM:`/`DESC:`).

## Ativação (ops, no plano)

1. `supabase secrets set DEEPL_API_KEY=<chave>` (chave Free, sufixo `:fx`).
2. Aplicar `0005` (Management API) + `functions deploy scraper`.
3. Teste manual: invocar `?mode=hero&id=2843769` e conferir `special_pt` em PT (e a tabela `translations` populando).
4. Re-rodar o loop dos 161 (idempotente) pra traduzir todos; cache barateia as próximas.

## A decidir na implementação

- `target_lang`: PT-BR (assumido). Confirmar se prefere PT-PT.
- Tamanho do lote/limite de chamadas ao re-popular (o cache já ajuda; DeepL Free suporta o volume).

## Fase seguinte

- Sub-projeto B: **cron** de re-sync periódico (estratégia de lote pra não estourar timeout).
