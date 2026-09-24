-- Sincronização automática de heróis.
--
-- PRÉ-REQUISITO MANUAL, uma única vez, antes de aplicar esta migration:
-- guardar a service role key no Vault. Ela NÃO pode entrar neste arquivo,
-- porque este repositório é público.
--
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'scraper_service_key');
--
-- A chave está em Dashboard > Project Settings > API > service_role.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Falha cedo e com mensagem clara. Sem isso, o job seria agendado e passaria a
-- receber 401 em silêncio, com o sintoma aparecendo só como "nada é importado".
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'scraper_service_key') then
    raise exception
      'Segredo scraper_service_key ausente no Vault. Rode: select vault.create_secret(''<SERVICE_ROLE_KEY>'', ''scraper_service_key'');';
  end if;
end $$;

-- Idempotente: remove a versão anterior do job antes de reagendar.
do $$
begin
  perform cron.unschedule('sync-herois-15min');
exception
  when others then null;
end $$;

select cron.schedule(
  'sync-herois-15min',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://uehpltviliyzsdargjpi.supabase.co/functions/v1/scraper?mode=sync&limit=5',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'scraper_service_key'
      )
    ),
    timeout_milliseconds := 120000
  );
  $job$
);

-- Para investigar depois:
--   select * from cron.job;                                  -- o job está agendado?
--   select * from cron.job_run_details order by start_time desc limit 10;  -- rodou? deu erro?
--   select * from net._http_response order by created desc limit 10;      -- o que a função respondeu?
