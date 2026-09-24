# WoR Guia — Sincronização automática de heróis — Design

- **Data:** 2026-09-24
- **Status:** Aprovado (aguardando implementação)
- **Autor:** carloseduardoturina@gmail.com + Claude

## O problema

O banco tinha 161 heróis enquanto a API de origem já expunha 169. Oito heróis nunca
entraram: Oakenvar, Veyrathia, Ezio della Notte, Evie Frye, Bayek, Eivor, Kassandra e
Ezio Auditore. Nenhum deles tem `dungeon_usage` na origem — nem os mais antigos, da
colaboração com Assassin's Creed.

A investigação encontrou duas causas, ambas estruturais:

1. **Não existe descoberta de heróis.** O `Deno.serve` de `index.ts` aceita apenas
   `?mode=refs` e `?mode=hero&id=XXXX`. O segundo processa **um** herói, por ID explícito.
   Os 161 registros são exatamente os que alguém chamou à mão.
2. **Não existe agendamento.** Não há `pg_cron`, GitHub Actions nem cron em `config.toml`.

O sintoma é permanente e silencioso: sem intervenção manual, o catálogo nunca cresce e as
notas dos heróis existentes congelam na data em que cada um foi processado.

Detalhe revelador: `api.ts` já define `fetchHeroes()` para o endpoint de listagem, e essa
função **nunca é chamada em lugar nenhum**. A peça existe; nada a usa.

## Decisões

| Área | Escolha |
|---|---|
| Descoberta | Modo novo `?mode=sync`, que lista a API e compara com o banco |
| Escopo por execução | Faltantes primeiro; depois os obsoletos há mais de 7 dias |
| Lote | `limit` por chamada, padrão 5 |
| Agendamento | `pg_cron` + `pg_net` dentro do Supabase, a cada 15 minutos |
| Segredo | Service role key no **Vault**, referenciada por nome na migration |
| Obsolescência | `heroes.updated_at`, que `upsert_hero` já atualiza a cada gravação |

## Por que lotes, e não uma varredura única

Medição real contra a função publicada: **3,1 s para um herói** com as traduções em cache.
Os 169 do catálogo levariam cerca de 8,5 minutos numa só invocação — muito além do limite
de parede de uma Edge Function. O trabalho precisa ser drenado ao longo de várias execuções.

O dimensionamento fecha com folga: 5 heróis por execução a cada 15 minutos são 480
processamentos por dia, contra os ~24/dia que a janela de 7 dias exige (169 ÷ 7). A maioria
das execuções não encontrará trabalho e retornará de imediato. Os 8 faltantes drenam nas
duas primeiras rodadas, ou seja, em cerca de meia hora.

## Mudanças

### `transform.ts` — a fila de trabalho (função pura)

```ts
export interface SyncItem { id: number; motivo: 'faltante' | 'obsoleto' }

export function buildSyncQueue(
  apiIds: number[],
  existentes: { id: number; updated_at: string | null }[],
  agora: Date,
  limit: number,
  diasObsoleto = 7,
): SyncItem[]
```

Regras, nesta ordem:

1. IDs presentes em `apiIds` e ausentes de `existentes` → `faltante`, na ordem em que a API
   os devolve (a API já entrega os mais recentes primeiro).
2. IDs presentes nos dois, cujo `updated_at` seja anterior a `agora - diasObsoleto` →
   `obsoleto`, do mais antigo para o mais novo.
3. Corta em `limit`.
4. IDs que existem no banco mas não na API são ignorados — nunca apagamos nada.
5. `updated_at` nulo conta como obsoleto.

É pura e sem I/O, então é testável como o resto de `transform.ts`.

### `index.ts` — o modo `sync`

```
GET /scraper?mode=sync&limit=5
```

1. `fetchHeroes()` → IDs da API.
2. `select id, updated_at from heroes` → estado atual.
3. `buildSyncQueue(...)` → o lote.
4. Para cada item, `processHero(id)`, capturando erro por herói: uma falha não aborta o lote.
5. Responde JSON:

```json
{ "processados": 5, "erros": [], "faltantes_restantes": 3, "obsoletos_restantes": 0 }
```

O `limit` é limitado a um teto de 20 no servidor, para que um parâmetro errado não derrube a
invocação por timeout.

### Migration `0007_cron_sync_herois.sql`

- `create extension if not exists pg_cron;` e `pg_net`.
- Job `sync-herois-15min`: `select cron.schedule(...)` chamando
  `net.http_post` contra `.../functions/v1/scraper?mode=sync&limit=5`.
- A service role key vem de `vault.decrypted_secrets`, nunca literal no arquivo.
- A migration é idempotente: `cron.unschedule` do job homônimo antes de agendar.

## Não-objetivos

- Apagar do banco heróis que sumirem da API.
- Interface para acompanhar o progresso da sincronização.
- Alterar como as notas são interpretadas ou exibidas no app.
- Reprocessar `refs` (classes e facções) no mesmo job.

## Riscos

- **Cota da DeepL.** A varredura semanal passa 169 heróis pela tradução. O cache cobre texto
  repetido, mas herói novo traz texto novo. Se a cota estourar, `deeplTranslate` lança e o
  herói falha — registrado em `erros`, sem travar o lote.
- **Segredo no Vault.** Se a key for rotacionada, o job passa a receber 401 silenciosamente.
  O retorno do `net.http_post` fica em `net._http_response`, que é onde investigar.
- **API de origem fora do ar.** A fila não avança; nada é corrompido.

## Verificação

- `deno test` em `supabase/functions/scraper` — baseline atual: 22 testes.
- Após aplicar: chamar `?mode=sync&limit=8` uma vez e conferir que os 8 faltantes entraram,
  comparando a contagem de `heroes` com os 169 da API.
