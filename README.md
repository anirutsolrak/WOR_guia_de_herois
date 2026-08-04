# WoR Guia de Heróis

PoC de fatia vertical: um pipeline em Supabase (Edge Function em Deno) busca dados
de heróis do jogo Watcher of Realms, traduz e grava no Postgres; um app Vite + React
(PWA) lê o Supabase e exibe o guia de heróis em português.

## Estrutura

- `supabase/` — projeto Supabase (config, migrations, Edge Functions em Deno).
- `app/` — app Vite + React + TypeScript (PWA), consumido via `@supabase/supabase-js`.

## Desenvolvimento

### App (`app/`)

```bash
cd app
npm install
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm test         # testes (Vitest)
```

### Supabase (`supabase/`)

```bash
supabase init     # já executado neste repositório
supabase db push  # aplica migrations (projeto na nuvem)
```

Veja `docs/superpowers/` para o plano e specs do projeto.
