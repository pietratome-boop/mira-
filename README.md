# Mira

Painel de estudos para vestibular: cada aluno lança os simulados, classifica os erros e recebe uma **fila de revisão** priorizada. A professora tem um **painel da turma** com o progresso de todos.

- Site: um único arquivo, `index.html`
- Login e banco de dados: [Supabase](https://supabase.com) (plano gratuito)
- Hospedagem: Netlify (ou qualquer hospedagem de site estático)

---

## Como colocar no ar (uma vez só)

### 1. Criar o projeto no Supabase
1. Crie uma conta em https://supabase.com e clique em **New project**.
2. Dê um nome (ex.: `mira`), crie uma senha do banco (guarde-a) e escolha a região **South America (São Paulo)**.
3. Espere uns 2 minutos até o projeto ficar pronto.

### 2. Criar as tabelas
1. No menu da esquerda, abra **SQL Editor** → **New query**.
2. Copie todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.
3. Deve aparecer "Success. No rows returned".

### 3. Ajustar o login
Em **Authentication → Sign In / Providers → Email**:
- Deixe **Enable Email provider** ligado.
- **Desligue "Confirm email"**. Assim o aluno entra na hora, sem precisar abrir e-mail. O envio de e-mails do plano gratuito é bem limitado (poucos por hora).

Em **Authentication → URL Configuration**:
- Em **Site URL**, coloque o endereço do site (ex.: `https://miraestudos.netlify.app`). É para lá que o link de "esqueci minha senha" leva.

### 4. Conectar o site ao Supabase
1. Em **Project Settings → API** (ou **Data API**), copie:
   - **Project URL** (algo como `https://abcdxyz.supabase.co`)
   - a chave **anon public**
2. Abra o `index.html`, procure por `SUPABASE_URL` (perto do começo do `<script>`) e cole os dois valores:
   ```js
   const SUPABASE_URL='https://abcdxyz.supabase.co';
   const SUPABASE_ANON_KEY='eyJhbGciOi...';
   ```
   A chave **anon** pode ficar no site: quem protege os dados são as regras do banco (passo 2).
   **Nunca** cole a chave `service_role`.

### 5. Publicar no Netlify
- **Jeito rápido:** no Netlify, abra o site **miraestudos → Deploys** e arraste para lá uma pasta que contenha só o `index.html`. O arquivo precisa se chamar exatamente `index.html`.
- **Jeito automático (recomendado):** em **Site configuration → Build & deploy → Link repository**, conecte este repositório do GitHub (branch `main`, sem comando de build, pasta de publicação `/`). A cada mudança no GitHub o site se atualiza sozinho.

### 6. Virar professora
1. Abra o site e crie a sua conta normalmente.
2. No Supabase, em **SQL Editor**, rode (trocando pelo seu e-mail):
   ```sql
   update public.profiles set is_teacher = true
   where email = 'seu-email@exemplo.com';
   ```
3. Recarregue o site: você cai direto no **painel da turma**.

Para dar acesso a outra professora ou monitora, rode o mesmo comando com o e-mail dela.

---

## Como funciona

| Quem | O que vê |
|---|---|
| Aluno | Só o próprio painel: placar, fila de revisão, temas revisados |
| Professora | Painel da turma com todos os alunos (% de acerto, simulados, fila, última atividade) e o painel de cada aluno em modo somente leitura |

- A segurança fica no banco (Row Level Security): um aluno não consegue ler os dados de outro nem se promover a professora.
- **Aluno esqueceu a senha:** ele toca em "esqueci minha senha" e recebe um link por e-mail. Se o limite de e-mails estourar, você pode redefinir a senha dele em **Supabase → Authentication → Users**.
- **Apagar um aluno:** em **Authentication → Users**, apague o usuário. Os dados dele somem junto.
- **Quem usou a versão antiga** (dados salvos só no navegador) vê, no rodapé do painel, o botão "Trazer dados da versão antiga deste navegador".

---

## Supabase gratuito sem pausar

O plano gratuito do Supabase pausa o projeto depois de 7 dias sem uso. O arquivo
[`.github/workflows/manter-supabase-acordado.yml`](.github/workflows/manter-supabase-acordado.yml)
faz o GitHub dar uma "cutucada" no banco a cada 3 dias, então ele não pausa mesmo que ninguém use o site.

- Só começa a rodar quando estiver na branch `main` e com a URL/chave preenchidas no `index.html`.
- Para testar na hora: GitHub → aba **Actions** → **Manter Supabase acordado** → **Run workflow**.
- Se algum dia pausar mesmo assim, nenhum dado se perde: abra o projeto no Supabase e clique em **Restore**.
