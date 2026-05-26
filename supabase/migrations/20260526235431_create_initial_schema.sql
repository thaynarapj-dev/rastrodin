create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income', 'expense')),
  color text,
  icon text,
  created_at timestamp with time zone default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense')),
  title text not null,
  amount numeric(12,2) not null,
  category_id uuid references public.categories(id),
  payment_method text,
  occurred_at date not null default current_date,
  notes text,
  created_at timestamp with time zone default now()
);