create table if not exists public.card_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  persona text not null,
  topic text not null,
  card_count integer not null default 0,
  canvas_size text not null default 'portrait',
  cards jsonb not null default '[]'::jsonb,
  character_sheet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.card_projects enable row level security;

-- The app writes with the server-only service role key. No browser policies are needed.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists card_projects_updated_at on public.card_projects;
create trigger card_projects_updated_at before update on public.card_projects
for each row execute function public.set_updated_at();
