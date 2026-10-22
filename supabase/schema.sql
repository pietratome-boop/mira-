-- ============================================================
-- Mira — banco de dados no Supabase
-- Cole este arquivo inteiro em: Supabase → SQL Editor → New query → Run
-- Pode rodar de novo sem problema (é idempotente).
-- ============================================================

-- Perfil de cada pessoa (aluno ou professora)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text not null default '',
  exams       jsonb not null default '[]'::jsonb,   -- [{name, date}]
  is_teacher  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Dados de estudo de cada aluno (simulados, erros, revisões)
create table if not exists public.student_data (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  sims        jsonb not null default '[]'::jsonb,
  state       jsonb not null default '{}'::jsonb,   -- {cls, incid, hist}
  updated_at  timestamptz not null default now()
);

alter table public.profiles     enable row level security;
alter table public.student_data enable row level security;

-- Quem está logado é professora?
create or replace function public.is_teacher()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select is_teacher from public.profiles where id = auth.uid()), false);
$$;

-- Ao criar conta: cria o perfil e a linha de dados automaticamente
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  insert into public.student_data (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza a data de "última atividade" a cada gravação
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists student_data_touch on public.student_data;
create trigger student_data_touch
  before insert or update on public.student_data
  for each row execute function public.touch_updated_at();

-- ---------- Regras de acesso: profiles ----------
drop policy if exists "perfil: ler o proprio ou professora" on public.profiles;
create policy "perfil: ler o proprio ou professora" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_teacher());

drop policy if exists "perfil: criar o proprio" on public.profiles;
create policy "perfil: criar o proprio" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and is_teacher = false);

drop policy if exists "perfil: editar o proprio" on public.profiles;
create policy "perfil: editar o proprio" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- O aluno só pode mudar nome e provas — nunca se promover a professora
revoke update on public.profiles from anon, authenticated;
grant update (name, exams) on public.profiles to authenticated;

-- ---------- Regras de acesso: student_data ----------
drop policy if exists "dados: ler os proprios ou professora" on public.student_data;
create policy "dados: ler os proprios ou professora" on public.student_data
  for select to authenticated
  using (user_id = auth.uid() or public.is_teacher());

drop policy if exists "dados: criar os proprios" on public.student_data;
create policy "dados: criar os proprios" on public.student_data
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "dados: editar os proprios" on public.student_data;
create policy "dados: editar os proprios" on public.student_data
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Para virar professora (rode DEPOIS de criar sua conta no site),
-- trocando pelo seu e-mail:
--
--   update public.profiles set is_teacher = true
--   where email = 'seu-email@exemplo.com';
-- ============================================================
