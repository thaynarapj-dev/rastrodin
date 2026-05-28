create table public.payments_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('credit', 'debit')),
  description text,
  active boolean not null default true
);
