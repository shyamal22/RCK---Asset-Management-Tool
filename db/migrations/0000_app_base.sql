-- Base: private schema for helper functions used by RLS policies and triggers.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create or replace function app.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
