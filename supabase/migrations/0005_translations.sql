create table if not exists translations (
  source_hash text primary key,
  source_en text not null,
  target_pt text not null,
  provider text not null default 'deepl',
  created_at timestamptz default now()
);
alter table translations enable row level security;
-- Sem policy de select público: só a service_role (usada pela Edge Function) acessa.
