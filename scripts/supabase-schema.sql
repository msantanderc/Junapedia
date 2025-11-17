-- SQL schema for Supabase table 'pluxee_stores'

create table if not exists public.pluxee_stores (
  id text primary key,
  canonical_name text,
  source_names text[],
  addresses text[],
  category text,
  menu_items jsonb,
  merged boolean default false,
  seeded_at timestamptz
);

-- Optional: create index for searching canonical_name lower
create index if not exists idx_pluxee_canonical_name on public.pluxee_stores (lower(canonical_name));
create index if not exists idx_pluxee_addresses on public.pluxee_stores using gin (addresses);
