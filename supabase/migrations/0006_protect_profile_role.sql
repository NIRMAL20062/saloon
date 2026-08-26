-- Hardens `profiles` table so users cannot self-escalate their `role` column
-- (e.g. changing 'customer' to 'admin' or 'partner') via client UPDATE queries.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.role := old.role;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();
