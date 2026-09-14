# Observatório das Processualistas Brasileiras

Aplicação React (Vite) + Tailwind para consulta, dashboards e alimentação da base de
processualistas brasileiras e sua produção bibliográfica.

> ⚠️ **O site público lê o Supabase.** Veja "De onde vêm os dados", no fim deste
> arquivo. Existe também um modo estático, montado e mantido de pé — a troca entre
> os dois é um arquivo só.
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

O site inteiro — consulta de pessoas, busca de obras, gráficos e páginas
institucionais — lê o **Supabase**. Uma única camada fala com o banco,
`src/lib/base.ts`, e todas as telas passam por ela.

```
Supabase (PostgreSQL)
        │  associadas · vinculos_docentes · producoes_bibliograficas
        │  paginas · membros · grupos_membros · get_dashboard_stats()
        ▼
src/lib/base.ts        →  Consulta · Obras · Dashboards · Ficha · páginas
```

Para atualizar a base, use **Importar planilha** na área da equipe: a Edge Function
valida o `.xlsx` e reescreve as tabelas. O site reflete na hora, sem novo deploy.

Medido nesta base, com gzip: as 383 pessoas descem em ~1 s e as 7.404 obras (1,2 MB
comprimidos) em ~2 s. Os gráficos não baixam nada — quem soma é o banco.

**Duas coisas que o banco exige e o arquivo estático não exigia:**

- O PostgREST corta toda resposta em **1.000 linhas**. A bibliografia passa de sete
  mil, então `todasAsPaginas()` conta primeiro (requisição `HEAD`) e pede todas as
  faixas **em paralelo**. Em fila, as mesmas oito páginas levavam ~8 s.
- Os **filtros dos gráficos vão para o banco** (`getEstatisticasFiltradas` chama
  `get_dashboard_stats` com os filtros). Recontar no navegador exigiria baixar as
  7.404 obras a cada toque num filtro.

### O modo estático, se precisar voltar

O site já foi servido por JSON na CDN, e essa via continua inteira:
`scripts/gerar-dados.mjs` (gerador), `public/dados/*.json` (saída),
`src/lib/estatisticas.ts` (agregados no navegador) e o workflow
`.github/workflows/gerar-dados.yml`.

Trocar de modo é reescrever **só `src/lib/base.ts`**: a interface pública
(`getAssociadas`, `getObras`, `getEstatisticas`, `getConteudo`, `getAssociada`,
`getObrasDe`) é idêntica nos dois, e nenhuma tela sabe de onde vem o dado.

No modo estático a URL da ficha era legível (`/consulta/ada-pellegrini-grinover`);
no banco o id é o UUID. Os links antigos continuam abrindo: `getAssociada` indexa
também pelo apelido gerado a partir do nome, com a mesma regra do gerador.

### Dissertações e teses na busca

A aba 1 da planilha descreve os trabalhos de titulação (título, ano, faculdade, área
e link), e eles **não são digitados de novo** na aba de bibliografia. As 581 entradas
correspondentes — *Dissertação de Mestrado*, *Tese de Doutorado* e *Tese de
Livre-Docência* — vivem na mesma tabela das demais obras, com `tipo_obra` próprio
(migração `20260914120000_teses_como_obras.sql`, idempotente).

Repetir o dado nas duas abas criaria duas versões do mesmo trabalho, que divergem na
primeira correção feita só de um lado.

Por isso o total de obras é **7.404** = 6.823 da bibliografia + 581 de titulação. Os
cartões de mestrado, doutorado e livre-docência são recortes desse total, não uma
soma à parte.
