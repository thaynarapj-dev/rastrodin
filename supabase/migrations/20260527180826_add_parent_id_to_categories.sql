alter table public.categories
add column parent_id uuid references public.categories(id)
on delete cascade;

create index categories_parent_id_idx
on public.categories(parent_id);

alter table public.categories
add constraint category_cannot_be_own_parent
check (id <> parent_id);