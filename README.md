# Sistema de Gestão de Associadas

Sistema completo (Full-stack) com Node.js (Express), React (Vite), Tailwind CSS e Prisma ORM para gestão avançada, consulta, dashboard e importação de associadas via Excel.

## 🚀 Requisitos e Configuração do Banco de Dados Hospedado

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
