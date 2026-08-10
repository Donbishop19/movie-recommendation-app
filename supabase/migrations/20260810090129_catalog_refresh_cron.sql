-- Scheduled staleness refresh: hourly pg_cron job calling the refresh-catalog Route Handler
-- over pg_net, authorized by a shared secret. The target URL and secret are read from
-- Supabase Vault at call time, never a literal here, so staging and production each carry
-- their own value (see spec 0003's Configuration required).
-- Spec: docs/specs/0003-movie-catalog-integration/index.md

create extension if not exists pg_net;
create extension if not exists pg_cron;

select
  cron.schedule(
    'refresh-movie-catalog',
    '0 * * * *', -- hourly, on the hour
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_refresh_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-catalog-refresh-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'catalog_refresh_secret')
        ),
        timeout_milliseconds := 30000
      ) as request_id;
    $$
  );
