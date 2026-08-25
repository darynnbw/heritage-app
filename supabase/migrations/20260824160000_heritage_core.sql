-- Heritage core: one curator, their people, and typed stories.
-- Auth lives in auth.users. Public tables are private to the signed-in owner.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (
    char_length(trim(display_name)) between 1 and 80
  )
);

create table public.relatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  relationship text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relatives_name_len check (char_length(trim(name)) between 1 and 120),
  constraint relatives_relationship_len check (char_length(trim(relationship)) between 1 and 80)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  relative_id uuid not null references public.relatives (id) on delete cascade,
  title text not null default '',
  prompt text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stories_title_len check (char_length(title) <= 200),
  constraint stories_prompt_len check (char_length(prompt) <= 500),
  constraint stories_body_len check (char_length(trim(body)) between 1 and 100000)
);

create index relatives_user_id_idx on public.relatives (user_id);
create index relatives_user_id_name_idx on public.relatives (user_id, name);
create index stories_user_id_created_at_idx on public.stories (user_id, created_at desc);
create index stories_relative_id_idx on public.stories (relative_id);

create function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.stamp_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
  else
    new.user_id := old.user_id;
  end if;

  if new.user_id is null then
    raise exception 'Not authenticated';
  end if;

  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Friend'
  );

  if char_length(chosen_name) > 80 then
    chosen_name := left(chosen_name, 80);
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, chosen_name);

  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger relatives_set_updated_at
  before update on public.relatives
  for each row execute function private.set_updated_at();

create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function private.set_updated_at();

create trigger relatives_stamp_owner
  before insert or update on public.relatives
  for each row execute function private.stamp_owner();

create trigger stories_stamp_owner
  before insert or update on public.stories
  for each row execute function private.stamp_owner();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

revoke all on table public.profiles from public, anon;
revoke all on table public.relatives from public, anon;
revoke all on table public.stories from public, anon;

grant select, insert, update (display_name, updated_at) on table public.profiles to authenticated;
grant select, insert, update, delete on table public.relatives to authenticated;
grant select, insert, update, delete on table public.stories to authenticated;

alter table public.profiles enable row level security;
alter table public.relatives enable row level security;
alter table public.stories enable row level security;
alter table public.profiles force row level security;
alter table public.relatives force row level security;
alter table public.stories force row level security;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy relatives_select_own
  on public.relatives
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy relatives_insert_own
  on public.relatives
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy relatives_update_own
  on public.relatives
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy relatives_delete_own
  on public.relatives
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy stories_select_own
  on public.stories
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy stories_insert_own
  on public.stories
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.relatives as relative
      where relative.id = relative_id
        and relative.user_id = (select auth.uid())
    )
  );

create policy stories_update_own
  on public.stories
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.relatives as relative
      where relative.id = relative_id
        and relative.user_id = (select auth.uid())
    )
  );

create policy stories_delete_own
  on public.stories
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
