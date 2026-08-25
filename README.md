# Observatório das Processualistas Brasileiras

Aplicação React (Vite) + Tailwind para consulta, dashboards e alimentação da base de
processualistas brasileiras e sua produção bibliográfica.

> ⚠️ **O backend é o Supabase.** O frontend fala direto com ele (`src/lib/supabase.ts`):
> tabelas via PostgREST, regras via RLS, e operações privilegiadas via Edge Functions.
>
> Os arquivos `server.ts`, `src/server/`, `prisma/`, `seed.ts` e `scripts/import-excel.mjs`
> são de uma arquitetura Express + Prisma que **não está mais em uso** e não roda em
> produção. O `prisma/schema.prisma` já divergiu do banco real (hoje o schema verdadeiro
> está em `supabase/migrations/`). As instruções da seção histórica no fim deste arquivo
> se referem a essa versão antiga.

## 🚀 Configuração

Crie um `.env` a partir do `.env.example` com as credenciais do projeto Supabase:

```
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon key>"
```

Depois:

```bash
npm install
npm run dev
```

## 📊 Estrutura da base

| Tabela | Papel |
|---|---|
| `associadas` | cadastro central das processualistas |
| `producoes_bibliograficas` | obras publicadas, ligadas à associada |
| `vinculos_docentes` | instituições em que leciona (+ ranking 40+) |
| `perfis` | espelha `auth.users`, com role `ADMIN` / `ANOTADOR` |
| `importacoes` | histórico das substituições de base, com snapshot para rollback |
| `paginas` | texto (markdown) da Home, Sobre, Metodologia e Quem Somos |
| `membros` | equipe do projeto, agrupada por `grupos_membros` |

## ✍️ Textos do site

Home, Sobre, Metodologia e Quem Somos **não têm texto no código**: leem de `paginas`,
e uma admin edita em **Administração → Textos do Site**, com prévia lado a lado. O que
for publicado aparece no site na hora, sem novo deploy.

O markdown aceito é o mínimo necessário (`## título`, `**negrito**`, `*itálico*`,
listas com `-`, `[link](url)`) e é renderizado por `src/lib/markdown.tsx`, que monta
elementos React em vez de injetar HTML — conteúdo do painel nunca vira marcação executável.

Fotos da equipe ficam no bucket `membros` do Supabase Storage (público para leitura,
upload só por ADMIN). Quem não tem foto aparece com as iniciais.

Os números da Home vêm de `get_numeros_home()`, ou seja, do que a base realmente tem.
Os números do levantamento original (481 processualistas mapeadas, 6.824 obras) são um
**relato histórico da pesquisa** e seguem preservados no texto da Metodologia — não
confundir com o tamanho da base consultável.

## 📥 Substituir a base por uma planilha

Admins têm, em **Administração → Substituir Base (Planilha)**, o fluxo completo:

1. envia o `.xlsx` (aba 1 = processualistas, aba 2 = bibliografia);
2. **Analisar** roda um dry-run e mostra quantas serão atualizadas, criadas e removidas,
   listando nominalmente quem sai — sem gravar nada;
3. confirmar exige digitar `SUBSTITUIR`;
4. antes de gravar, o banco guarda um snapshot completo do estado anterior, revertível
   com um clique no histórico da mesma tela.

O caminho é servido pela Edge Function `import-planilha`, que valida o JWT e exige role
`ADMIN`. As funções `substituir_base_completa` e `reverter_importacao` têm `EXECUTE`
revogado de `anon` e `authenticated` — o browser não as alcança diretamente.

Para publicar mudanças no schema ou na função:

```bash
supabase db push
supabase functions deploy import-planilha
```

---

## Seção histórica — arquitetura Express + Prisma (desativada)

O que segue vale apenas para a versão antiga, mantida no repositório por referência.

Este projeto utiliza PostgreSQL. Como regra de negócio, você deve fornecer as credenciais de um banco de dados **PostgreSQL na nuvem** (pode ser AWS RDS, Neon.tech, Render, Railway, DigitalOcean, etc, **exceto Supabase**).

### Passos de Configuração (Deploy e Local):

1. **Obtenha a connection string do banco** (Ex: `postgresql://usuario:senha@host:5432/nomedobanco?schema=public`).
2. Copie o arquivo de exemplo para gerar o definidor de variáveis (`.env`):
   ```bash
   cp .env.example .env
   ```
3. Edite o arquivo `.env` inserindo sua string de conexão no `DATABASE_URL` e alterando a `JWT_SECRET`.
4. Instale as dependências:
   ```bash
   npm install
   ```
5. Realize a criação das tabelas no banco de dados rodando:
   ```bash
   npx prisma db push
   ```
   *(Alternativamente pode usar `npx prisma migrate dev` para controle de migrações local).*
6. Gere o Client do Prisma:
   ```bash
   npx prisma generate
   ```

## 🛠 Usuário Administrador Inicial

Para criar o primeiro usuário Admin do sistema (já que a rota requer admin), você pode popular o banco recém criado através do script seed.

1. No terminal, execute o console interativo do banco (ou use uma ferramenta como DBeaver) ou script temporário, ou crie pelo Prisma Studio:
   ```bash
   npx prisma studio
   ```
2. Na interface que abrir no seu navegador, navegue até a tabela **Usuario**.
3. Crie um registro com seu Nome, seu Email,  `role` como `ADMIN` e preencha `senha_hash` com `$2a$10$Q0XlQZtSjYQq90Z.Q7yMeeV8S4.B71QdOq4z./wB5J.bRbGg2eOuq` (Isto equivale a senha: **admin123**).
4. Feche o Prisma Studio. Agora você pode fazer login como este usuário!

## ▶️ Rodando a Aplicação Completa

```bash
npm run dev
```

O Frontend + Backend vai subir na porta 3000 (`http://localhost:3000`).

## 📦 Deploy (Build)

Para colocar em produção (ex: Cloud Run, Render, Railway):

```bash
npm run build
npm start
```
