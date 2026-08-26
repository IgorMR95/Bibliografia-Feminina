# Observatório das Processualistas Brasileiras

Aplicação React (Vite) + Tailwind para consulta, dashboards e alimentação da base de
processualistas brasileiras e sua produção bibliográfica.

> ⚠️ **O site público lê arquivos estáticos, não o Supabase.** Veja "De onde vêm os
> dados", no fim deste arquivo. O Supabase atende apenas o login e a área da equipe.
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
for publicado entra no site na próxima vez que os dados forem regerados (`npm run
gerar-dados`) e enviados.

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

## 🗂 De onde vêm os dados

O lado **público** do site (consulta de pessoas, busca de obras, gráficos e
páginas institucionais) **não consulta o Supabase**. Ele lê arquivos estáticos,
servidos pela CDN da Vercel:

```
dados/base-processualistas.xlsx     ← fonte da verdade, versionada aqui
        │  npm run gerar-dados
        ▼
public/dados/associadas.json        383 processualistas  ·  66 KB comprimido
public/dados/obras.json             6.823 obras          ·  441 KB (sob demanda)
public/dados/estatisticas.json      agregados prontos    ·  1 KB
public/dados/conteudo.json          textos e equipe      ·  6 KB
```

Para atualizar a base: substitua o `.xlsx`, rode `npm run gerar-dados`, confira o
resumo impresso e faça commit. A Vercel publica em cerca de um minuto.

**Por que não ler o `.xlsx` direto no navegador:** medido nesta base, o Excel
custa 780 KB e ~150 ms de processamento (descompactar o zip e varrer 44 mil
células de XML) contra 475 KB e ~30 ms do JSON. O `.xlsx` já é um zip, então
ainda por cima não comprime de novo na rede.

Os três arquivos são carregados sob demanda: quem abre a consulta de pessoas
baixa 66 KB — a bibliografia só desce ao abrir a aba **Obras**.

### O que continua no Supabase

Só o que precisa de servidor: **login** e a **área da equipe** (editor de textos
das páginas, gestão da equipe, importação de planilha). A estrutura do banco
segue intacta e alimentada — nada foi apagado —, apenas deixou de ser consultada
pelo site público.

O editor de textos grava no Supabase; o que ele publica aparece no site quando os
dados forem regerados e enviados, no mesmo ciclo da planilha.

### Dissertações e teses na busca

A aba 1 da planilha já descreve os trabalhos de titulação (título, ano, faculdade,
área e link). Eles **não são digitados de novo** na aba de bibliografia: o gerador os
deriva de lá e cria as entradas correspondentes — *Dissertação de Mestrado*, *Tese de
Doutorado* e *Tese de Livre-Docência* —, somando 581 obras às 6.823 da aba 2.

Repetir o dado nas duas abas criaria duas versões do mesmo trabalho, que divergem na
primeira correção feita só de um lado.

As contagens das **estatísticas continuam somando apenas a aba 2** (6.823): a
metodologia do grupo trata a produção bibliográfica em separado dos trabalhos de
titulação, e misturar as duas mudaria um número já publicado.
