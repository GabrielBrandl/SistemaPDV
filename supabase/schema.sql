-- Cadastro de clientes no Supabase
-- Rode no SQL Editor do projeto Supabase

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  nome text not null,
  cpf varchar(11) not null,
  telefone varchar(20) not null,
  local_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cpf)
);

create index if not exists customers_cpf_idx on public.customers (cpf);
create index if not exists customers_tenant_idx on public.customers (tenant_id);

-- Opcional: atualiza updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

-- RLS: use service role no backend; se usar anon key, ajuste políticas.
alter table public.customers enable row level security;

create policy "service role full access"
  on public.customers
  for all
  using (true)
  with check (true);
