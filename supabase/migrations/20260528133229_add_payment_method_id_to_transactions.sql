alter table public.transactions
add column payment_method_id uuid references public.payments_methods(id);

create index transactions_payment_method_id_idx
on public.transactions(payment_method_id);
