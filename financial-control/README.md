# Fintrack — Controle Financeiro

App de controle financeiro pessoal com dashboard, gestão de transações e categorias.

## Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **ORM**: Prisma
- **Banco**: PostgreSQL
- **Auth**: JWT

## Pré-requisitos
- Node.js 18+
- PostgreSQL rodando localmente

## Setup

### 1. Banco de dados
Crie o banco no PostgreSQL:
```sql
CREATE DATABASE financial_control;
```

### 2. Variáveis de ambiente
Edite `backend/.env`:
```env
DATABASE_URL="postgresql://SEU_USER:SUA_SENHA@localhost:5432/financial_control"
JWT_SECRET="troque-por-uma-chave-secreta"
PORT=3333
```

### 3. Instalar dependências e rodar migrations
```bash
# Instalar dependências
npm install         # raiz (concurrently)
npm --prefix backend install
npm --prefix frontend install

# Rodar migrations do banco
npm run db:migrate
```

### 4. Rodar em desenvolvimento
```bash
npm run dev
```
- Backend: http://localhost:3333
- Frontend: http://localhost:5173

## Scripts úteis
```bash
npm run db:studio   # Abrir Prisma Studio
npm run dev:backend # Só backend
npm run dev:frontend # Só frontend
```
