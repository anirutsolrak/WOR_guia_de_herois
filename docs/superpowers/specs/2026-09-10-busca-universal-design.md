# WoR Guia — Busca universal de heróis + posição por conteúdo — Design

- **Data:** 2026-09-10
- **Status:** Aprovado (aguardando plano)
- **Autor:** carloseduardoturina@gmail.com + Claude

## Visão geral

Hoje o app só se navega **por modo**: da home escolhe-se uma dungeon, vê-se o ranking, e só
então chega-se ao herói. Quem já sabe o nome do herói não tem caminho direto.

Esta fatia adiciona **dois** recursos complementares:

1. Uma **barra de busca de heróis** no header, presente em todas as páginas: digita-se uma
   palavra e um dropdown sugere heróis cujo nome a contém; clicar abre `/heroi/:id`.
2. Na página do herói, uma seção **"Conteúdos"**: lista da **posição** (rank) daquele herói em
   cada um dos 19 modos, ordenada da melhor colocação para a pior — respondendo "pra que esse
   herói serve?" sem precisar abrir modo por modo.

As seções atuais da página do herói (equipamento, artefatos, times recomendados) permanecem
intactas.

## Decisões

| Área | Escolha |
|---|---|
| Escopo da busca | Apenas **heróis** (modos, facções e classes ficam de fora) |
| Local da barra | Global, no `AppShell` — visível no índice, no modo e no herói |
| Filtro de modos | Sai do `AppShell` e vira input próprio no corpo do `IndexPage` |
| Origem dos dados da busca | Os 161 heróis carregados **uma vez** e filtrados em memória |
| Matching | Substring, sem acento e sem caixa, em `name_pt` **e** `name_en`; prefixo primeiro |
| Limite de sugestões | 8 |
| Origem do rank | **View** no Postgres (`hero_dungeon_ranks`) com `rank()` e `total` |
| Ordem da lista de conteúdos | Melhor posição primeiro (`rank` crescente) |
| Modos sem rank | Listados **no fim**, esmaecidos, com `—` no lugar da posição |
| Posição do bloco na página | Primeira seção da coluna direita, acima de "Equipamento" |

### Por que cache em memória e não query por tecla

São 161 heróis (~20 KB com `id`, nomes e `card_url`). Um `ilike` por tecla no Supabase
adicionaria latência, estado de loading no dropdown, debounce e cancelamento de requests —
complexidade real sem ganho nessa escala. O fetch único também sobrevive offline, o que
importa num PWA. Se o catálogo crescer uma ordem de grandeza, troca-se `getHeroSearchIndex`
por uma query sem mexer no componente.

### Por que uma view e não rank no cliente

`hero_dungeon_rates` guarda `rate`, não posição. Calcular no cliente exigiria baixar as ~3.000
linhas da tabela inteira (161 × 19) só para descobrir 19 números, e duplicaria no front uma
regra que o Postgres resolve com uma window function. A view também deixa o rank disponível
para o `ModePage` numa fatia futura.

## Não-objetivos

- Buscar modos, facções ou classes na barra universal.
- Página de listagem/browse de heróis, ou página de "todos os resultados" da busca (`/herois?q=`).
- Plugar o `RadarPanel` (existe em `components/`, não é usado por nenhuma página; segue assim).
- Mostrar rank no `ModePage` (ele já numera as linhas localmente).
- Histórico de buscas, buscas recentes, favoritos.
- Tier badges (S/A/B) a partir do rank.

## Mudanças de dados

### Migration `0006_hero_dungeon_ranks.sql`

```sql
create or replace view hero_dungeon_ranks as
select
  hero_id,
  dungeon_id,
  rate,
  rank()  over (partition by dungeon_id order by rate desc) as rank,
  count(*) over (partition by dungeon_id)                   as total
from hero_dungeon_rates;
```

Mais o `grant select` para os papéis `anon`/`authenticated`, no mesmo padrão de
`0003_read_policies.sql`. A view herda o RLS de `hero_dungeon_rates`; não há dado privado
envolvido — todas as tabelas do guia já são de leitura pública.

`rank()` (não `dense_rank()`) é o correto aqui: em empate de `rate`, dois heróis dividem a
mesma posição e a seguinte é pulada, que é como um ranking de jogo se comporta.

### `types.ts`

```ts
export interface DungeonRate {
  dungeon_id: number;
  rate: number;
  rank: number;
  total: number;
}

export interface HeroSearchItem {
  id: number;
  name_pt: string | null;
  name_en: string;
  card_url: string | null;
}
```

### `queries.ts`

- `getHeroDetail`: o select de `hero_dungeon_rates` passa a ler
  `hero_dungeon_ranks` com `select('dungeon_id, rate, rank, total')`. Continua sendo uma das
  sete queries em paralelo — sem round-trip novo.
- `assembleHeroDetail`: mapeia `rates` normalizando `rank` e `total` com `Number()` (ver
  Riscos). A forma do `HeroDetail` não muda no restante.
- **Novo** `getHeroSearchIndex(sb)`: `select('id, name_pt, name_en, card_url')` de `heroes`,
  ordenado por `name_en`.

## Componentes

### `lib/heroSearch.ts` (puro, sem React)

```ts
normalize(s: string): string
// lowercase + NFD + remove diacríticos — "Zéfiro" e "zefiro" batem

searchHeroes(items: HeroSearchItem[], q: string, limit = 8): HeroSearchItem[]
// q vazio/só espaços → []
// casa substring normalizada em name_pt E name_en
// ordena: quem começa com q primeiro, depois alfabética pelo nome exibido
// corta em `limit`
```

### `hooks/useHeroSearchIndex.ts`

Cache no escopo do módulo (`let cache: Promise<HeroSearchItem[]> | null`), então navegar
entre páginas não refaz a rede. Reusa `useAsync`, como `useDungeons`, e expõe
o mesmo `{ data, loading, error }`. Quem trata a falha é o `HeroSearchBar`: com `error`, usa
lista vazia — a busca fica sem sugestões, mas nenhuma página quebra.

### `components/HeroSearchBar.tsx`

Combobox acessível, montado no `AppShell` no lugar do input de busca de modo atual.

- Estrutura: `input role="combobox"` + `ul role="listbox"` com `li role="option"`;
  `aria-expanded`, `aria-controls`, `aria-activedescendant` no input.
- Cada opção: miniatura (`card_url`), nome exibido (`name_pt ?? name_en`) e o `name_en` em
  texto secundário quando difere do PT — ajuda quem conhece o herói pelo nome original.
- Teclado: `↑`/`↓` movem a seleção, `Enter` navega para a opção ativa (ou a primeira, se
  nenhuma estiver ativa), `Esc` fecha o dropdown e limpa a seleção ativa.
- Mouse: clique na opção navega; blur fecha.
- Navegar limpa o campo e fecha o dropdown.
- `placeholder="Buscar herói…"`, `aria-label="Buscar herói"`.

### `components/AppShell.tsx`

Perde as props `search` / `onSearch`. A barra de busca de herói passa a ser renderizada
sempre, sem prop de controle. `title`, `subtitle`, `banner` e `children` seguem iguais.

### `components/HeroContentRanks.tsx`

Recebe `rates: DungeonRate[]` e `dungeons: Dungeon[]`.

- Faz o join por `dungeon_id` para obter `name_pt ?? name_en` e `icon_url`.
- Ranqueados: ordenados por `rank` crescente; cada linha é
  `ícone · nome do modo · #{rank} de {total} · barra de rate`.
- Não ranqueados (dungeon sem linha correspondente em `rates`): no fim, em `text-subtle`,
  com `—` no lugar da posição e sem barra.
- Cada linha é um `<Link to={"/modo/" + id}>`, fechando o ciclo herói → modo → herói.
- A barra de rate normaliza por `Math.max(50, ...rates)`, como `ModePage` e `RateBar` já fazem.

### `pages/HeroPage.tsx`

Chama `useDungeons()` além de `useHero()` e renderiza `<HeroContentRanks>` como primeira
seção da coluna direita, sob o título "Conteúdos".

### `pages/IndexPage.tsx`

O estado `q` continua existindo, mas agora alimenta um input renderizado no corpo da página
(acima das seções de categoria) em vez da prop `search` do `AppShell`. Comportamento de
filtro inalterado.

## Estrutura de arquivos

- `supabase/migrations/0006_hero_dungeon_ranks.sql` — view + grant (novo).
- `app/src/lib/types.ts` — `DungeonRate` += `rank`, `total`; `HeroSearchItem` (novo).
- `app/src/lib/queries.ts` — `getHeroDetail` lê a view; `getHeroSearchIndex` (novo).
- `app/src/lib/heroSearch.ts` — `normalize`, `searchHeroes` (novo).
- `app/src/hooks/useHeroSearchIndex.ts` — hook com cache de módulo (novo).
- `app/src/components/HeroSearchBar.tsx` — combobox (novo).
- `app/src/components/HeroContentRanks.tsx` — lista de posições (novo).
- `app/src/components/AppShell.tsx` — remove `search`/`onSearch`, monta a barra.
- `app/src/pages/HeroPage.tsx` — usa `useDungeons` + nova seção.
- `app/src/pages/IndexPage.tsx` — filtro de modo migra para o corpo.
- Reaproveitados sem mudança: `factionColor`, `useAsync`, `useDungeons`, `SectionHeader`.

## Testes

Vitest + Testing Library, no padrão dos arquivos vizinhos.

- **`heroSearch.test.ts`**: acento ignorado nos dois sentidos; casa por `name_en` quando o PT
  difere; prefixo vem antes de substring; respeita o limite de 8; `q` vazio → `[]`.
- **`HeroSearchBar.test.tsx`**: digitar filtra e abre o listbox; `↓` + `Enter` navega para o
  herói ativo; `Enter` sem seleção navega para o primeiro; `Esc` fecha; clique navega.
  Navegação verificada com `MemoryRouter` + mock do hook.
- **`HeroContentRanks.test.tsx`**: ordena por `rank`; renderiza `#4 de 57`; modo sem rate
  aparece por último com `—`; linha linka para `/modo/:id`.
- **`queries.test.ts`**: `assembleHeroDetail` converte `rank`/`total` para `number`, inclusive
  quando chegam como string.
- **`AppShell.test.tsx` / `IndexPage.test.tsx`**: ajustados à remoção de `search`/`onSearch` —
  o filtro de modo passa a ser procurado no corpo do índice.

## Riscos e pontos de atenção

- **A view precisa existir antes do front.** Sem a migration aplicada (`supabase db push`), o
  select de `hero_dungeon_ranks` falha e a página do herói inteira quebra, já que as sete
  queries de `getHeroDetail` compartilham o mesmo `Promise.all`. Aplicar a migration é o
  primeiro passo da implementação.
- **`rank`/`total` chegam como `bigint`.** Tanto `rank()` quanto `count(*)` retornam `bigint`,
  que o cliente Supabase pode entregar como string. Converter com `Number()` no assemble e
  cobrir isso no teste.
- **Empates de `rate`.** Com `rank()`, dois heróis podem exibir `#3 de 57` e nenhum exibir
  `#4`. É o comportamento desejado; vale conferir num herói real.

## Fases seguintes (fora deste spec)

- Reusar `hero_dungeon_ranks` no `ModePage` no lugar da numeração local.
- Página de browse de heróis com filtros por facção/classe.
- Estender a busca a modos, com resultados agrupados por tipo.
