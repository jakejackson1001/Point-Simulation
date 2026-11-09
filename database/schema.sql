-- Run once in a dedicated Supabase project's SQL Editor.
-- One atomic, versioned document per user: exercises, workouts/sets, graphs and preferences.
-- No service-role key is used by the application.
begin;
create table if not exists public.lifting_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null,
 version bigint not null default 0 check (version >= 0),
 last_request_id uuid,
 updated_at timestamptz not null default now(),
 constraint workspace_shape check (
  jsonb_typeof(payload) = 'object' and
  payload @> '{"schemaVersion":1}' and
  jsonb_typeof(payload->'exercises') = 'array' and
  jsonb_typeof(payload->'workouts') = 'array' and
  jsonb_typeof(payload->'graphs') = 'array' and
  jsonb_typeof(payload->'prefs') = 'object'
 )
);
alter table public.lifting_workspaces enable row level security;
drop policy if exists "Owners read their own workspace" on public.lifting_workspaces;
create policy "Owners read their own workspace" on public.lifting_workspaces for select to authenticated using ((select auth.uid()) = user_id);
-- Writes only through the version-checked RPC below. Direct updates would bypass concurrency checks.
revoke all on public.lifting_workspaces from anon, authenticated;
grant select on public.lifting_workspaces to authenticated;
create or replace function public.save_lifting_workspace(p_payload jsonb, p_expected_version bigint, p_request_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_version bigint;
 v_request uuid;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_request_id is null or p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid save request'; end if;
 if p_payload is null or pg_catalog.octet_length(p_payload::text) > 31457280 then raise exception 'Workspace is missing or exceeds 30 MB'; end if;
 if pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
  or not (p_payload @> '{"schemaVersion":1}')
  or pg_catalog.jsonb_typeof(p_payload->'exercises') is distinct from 'array'
  or pg_catalog.jsonb_typeof(p_payload->'workouts') is distinct from 'array'
  or pg_catalog.jsonb_typeof(p_payload->'graphs') is distinct from 'array'
  or pg_catalog.jsonb_typeof(p_payload->'prefs') is distinct from 'object'
 then raise exception 'Invalid workspace shape'; end if;
 insert into public.lifting_workspaces(user_id,payload,version)
 values(v_user,p_payload,0) on conflict (user_id) do nothing;
 select version,last_request_id into v_version,v_request
 from public.lifting_workspaces where user_id=v_user for update;
 -- Retry after a lost response is safe and does not create duplicate data.
 if v_request = p_request_id then return v_version; end if;
 if v_version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
 update public.lifting_workspaces set payload=p_payload,version=v_version+1,
 last_request_id=p_request_id,updated_at=now() where user_id=v_user;
 return v_version+1;
end;
$$;
revoke all on function public.save_lifting_workspace(jsonb,bigint,uuid) from public, anon;
grant execute on function public.save_lifting_workspace(jsonb,bigint,uuid) to authenticated;
commit;
