-- ============================================================
-- Mira — acesso de tutor por código
-- Rode DEPOIS do schema.sql: Supabase → SQL Editor → New query → Run.
-- Pode rodar de novo sem problema.
--
-- Quem cria a conta marcando "Sou tutor(a)" e digitando o código
-- certo já nasce tutor. Quem já tem conta de aluno pode digitar o
-- código na tela "Antes de começar" e virar tutor.
-- ============================================================

-- Configurações que o site NÃO consegue ler (sem nenhuma policy)
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

-- O código confere? (só usado por dentro do banco)
create or replace function public.tutor_code_ok(code text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    length(trim(code)) > 0
    and exists (select 1 from public.app_config
                where key = 'tutor_code' and value = trim(code)
                  and value <> 'TROQUE-ESTE-CODIGO'),
    false);
$$;
revoke execute on function public.tutor_code_ok(text) from public, anon, authenticated;

-- Ao criar conta: perfil (já como tutor se o código conferir) + linha de dados
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, is_teacher)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'name', ''),
          public.tutor_code_ok(new.raw_user_meta_data->>'tutor_code'))
  on conflict (id) do nothing;
  insert into public.student_data (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Quem já tem conta digita o código para virar tutor
create or replace function public.claim_tutor(code text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.tutor_code_ok(code) then
    return false;
  end if;
  update public.profiles set is_teacher = true where id = auth.uid();
  return true;
end;
$$;
revoke execute on function public.claim_tutor(text) from public, anon;
grant execute on function public.claim_tutor(text) to authenticated;

-- ============================================================
-- O CÓDIGO DE TUTOR — troque TROQUE-ESTE-CODIGO pelo código que quiser
-- (não escreva o código de verdade neste arquivo do GitHub).
-- Para mudar depois, rode só esta parte de novo com o código novo.
-- ============================================================
insert into public.app_config (key, value) values ('tutor_code', 'TROQUE-ESTE-CODIGO')
on conflict (key) do update set value = excluded.value;
