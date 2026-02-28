<div align="center">

# DominaHub

**Controle total das suas finanças, em um só lugar.**

Plataforma SaaS de gestão financeira pessoal com dashboard completo, metas, previsão mensal, score de saúde financeira, investimentos e assinaturas via Stripe.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.10-2D3748?style=flat-square&logo=prisma&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Integration-635BFF?style=flat-square&logo=stripe&logoColor=white)

</div>

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack Técnica](#stack-técnica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Configuração e Execução](#configuração-e-execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [API Reference](#api-reference)
- [Planos e Assinaturas](#planos-e-assinaturas)
- [Integração com Stripe](#integração-com-stripe)
- [Autenticação](#autenticação)
- [Banco de Dados](#banco-de-dados)

---

## Visão Geral

O **DominaHub** é uma aplicação web fullstack de controle financeiro pessoal. Diferente de apps genéricos que só registram o passado, o DominaHub **projeta o futuro**: previsão de fechamento mensal, score de saúde financeira calculado automaticamente, alertas inteligentes e metas vinculadas ao saldo real das contas.

A plataforma é estruturada como um SaaS com três planos de assinatura (Free, Pro e Business), integração nativa com Stripe e controle granular de features por plano.

---

## Funcionalidades

### Disponíveis em todos os planos

| Módulo | Descrição |
|---|---|
| **Dashboard** | Resumo mensal: saldo, receitas, despesas, patrimônio líquido e orçamentos |
| **Transações** | Registro, categorização, filtros avançados, tags e anexos (recibos) |
| **Contas** | Múltiplas contas bancárias (corrente, poupança, investimento, etc.) |
| **Categorias** | Categorias de renda e despesa personalizáveis com ícone e cor |
| **Orçamentos** | Limites mensais por categoria com acompanhamento de consumo |
| **Transferências** | Transferência entre contas com rastreamento automático |
| **MFA (2FA)** | Autenticação de dois fatores via TOTP (Google Authenticator, Authy, etc.) |

### Plano Pro

| Módulo | Descrição |
|---|---|
| **Recorrências** | Despesas e receitas fixas com projeção automática mensal |
| **Metas Financeiras** | Objetivos vinculados a contas, com progresso calculado automaticamente |
| **Passivos e Dívidas** | Controle de empréstimos com parcelas, juros e datas de vencimento |
| **Cartões de Crédito** | Gestão de cartões, faturas mensais e parcelamentos |
| **Importação CSV** | Upload e importação em massa de transações com deduplicação |
| **Regras de Autocategorização** | Regras por palavra-chave ou valor para categorização automática |
| **Score de Saúde Financeira** | Indicador de 0 a 100 baseado em poupança, dívidas e reserva de emergência |
| **Previsão Mensal** | Projeção do fechamento do mês com calendário financeiro detalhado |
| **Insights Automáticos** | Alertas quando orçamento estoura, meta atrasa ou passivo vence |

### Plano Business

| Módulo | Descrição |
|---|---|
| **Relatórios Avançados** | Análises comparativas entre períodos, top categorias e tendências |
| **Investimentos Avançados** | Portfólio de ativos com movimentações (compra, venda, dividendos, etc.) |
| **Alocação de Portfólio** | Metas de alocação por classe de ativo e análise de rebalanceamento |
| **Exportação de Dados** | Exportação completa de transações e relatórios |

---

## Stack Técnica

### Backend

| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | 20 | Runtime |
| TypeScript | 5.3 | Linguagem |
| Express | 4.18 | Framework HTTP |
| Prisma ORM | 5.10 | ORM e migrations |
| PostgreSQL | 16 | Banco de dados |
| JWT (jsonwebtoken) | 9.0 | Autenticação stateless |
| bcryptjs | 2.4 | Hash de senhas |
| Stripe SDK | 16.12 | Pagamentos e assinaturas |
| Zod | 3.22 | Validação de schemas |
| otplib | 13.3 | TOTP para MFA |
| express-rate-limit | 8.2 | Rate limiting por IP |

### Frontend

| Tecnologia | Versão | Papel |
|---|---|---|
| React | 18.2 | UI Framework |
| TypeScript | 5.3 | Linguagem |
| Vite | 5.1 | Build tool |
| React Router DOM | 6.22 | Roteamento SPA |
| Zustand | 4.5 | Gerenciamento de estado global |
| TailwindCSS | 3.4 | Estilização utility-first |
| Radix UI | — | Componentes acessíveis (Dialog, Select, Toast, etc.) |
| Recharts | 2.12 | Gráficos interativos |
| Axios | 1.6 | HTTP Client |
| Lucide React | 0.344 | Ícones |
| date-fns | 3.3 | Manipulação de datas |

### Infraestrutura

| Tecnologia | Papel |
|---|---|
| Docker + Docker Compose | Banco de dados PostgreSQL em container |
| Stripe | Checkout, assinaturas e portal de cobrança |
| Stripe CLI | Webhook local em desenvolvimento |

---

## Estrutura do Projeto

```
financial-control/
├── package.json              # Scripts raiz (monorepo)
├── docker-compose.yml        # PostgreSQL containerizado
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Definição de todos os modelos
│   │   ├── seed.ts           # Seed: planos, preços e feature gates
│   │   └── migrations/       # Histórico de migrations
│   ├── scripts/
│   │   └── stripe-sync.ts    # Sincroniza produtos/preços com a API do Stripe
│   ├── src/
│   │   ├── app.ts            # Entry point, middleware e registro de rotas
│   │   ├── controllers/      # Lógica de cada endpoint
│   │   ├── routes/           # Definição de rotas por módulo
│   │   ├── services/         # Serviços (billing, stripe, goals, etc.)
│   │   ├── middlewares/      # Auth, planGate, rate limit
│   │   └── lib/              # Prisma client e utilitários
│   ├── .env.example          # Template de variáveis de ambiente
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.tsx           # Definição de rotas e proteção de páginas
    │   ├── pages/            # Páginas da aplicação
    │   ├── components/
    │   │   ├── ui/           # Design system (Button, Card, Badge, etc.)
    │   │   ├── layout/       # Sidebar, AppLayout
    │   │   └── billing/      # FeatureRoute (paywall por feature)
    │   ├── hooks/            # useBilling, useEntitlements, etc.
    │   ├── store/            # Zustand stores (auth)
    │   └── types/            # Tipos globais (FeatureKey, Entitlements, etc.)
    └── package.json
```

---

## Pré-requisitos

Antes de começar, garanta que você tem instalado:

- **Node.js** `>= 20.x` — [nodejs.org](https://nodejs.org)
- **npm** `>= 10.x` (incluso com Node.js)
- **Docker** e **Docker Compose** — [docker.com](https://www.docker.com/get-started)
- **Stripe CLI** *(opcional, necessário para webhooks em desenvolvimento)* — [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

---

## Configuração e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/financial-control.git
cd financial-control
```

### 2. Instale as dependências

```bash
npm run install:all
```

Isso instala as dependências do backend e do frontend sequencialmente.

### 3. Suba o banco de dados

```bash
docker compose up -d
```

O PostgreSQL ficará disponível em `localhost:5432`:

| Parâmetro | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Banco | `financial_control` |
| Usuário | `fintrack` |
| Senha | `fintrack123` |

### 4. Configure as variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` e defina ao menos o `JWT_SECRET`:

```bash
# Gere um JWT_SECRET seguro
openssl rand -hex 64
```

Veja a [referência completa de variáveis](#variáveis-de-ambiente) abaixo.

### 5. Execute as migrations e o seed

```bash
# Cria as tabelas no banco de dados
npm run db:migrate

# Popula planos, preços e feature gates
npm --prefix backend run db:seed
```

### 6. Inicie a aplicação

```bash
npm run dev
```

Backend e frontend sobem em paralelo:

| Serviço | URL |
|---|---|
| Frontend (Vite) | [http://localhost:5173](http://localhost:5173) |
| Backend (Express) | [http://localhost:3333](http://localhost:3333) |
| Health check | [http://localhost:3333/api/health](http://localhost:3333/api/health) |

---

## Variáveis de Ambiente

Crie o arquivo `backend/.env` a partir de `backend/.env.example`.

| Variável | Obrigatório | Descrição | Exemplo |
|---|---|---|---|
| `DATABASE_URL` | Sim | Connection string do PostgreSQL | `postgresql://fintrack:fintrack123@localhost:5432/financial_control` |
| `JWT_SECRET` | Sim | Chave para assinar tokens JWT. Use `openssl rand -hex 64` | `a1b2c3d4...` |
| `PORT` | Não | Porta do servidor backend | `3333` |
| `CORS_ORIGIN` | Não | Origem permitida pelo CORS | `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Stripe | Chave secreta da API do Stripe (`sk_test_...` ou `sk_live_...`) | `sk_test_abc123` |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Signing secret do webhook (`whsec_...`) | `whsec_abc123` |

> **Atenção:** Nunca utilize a chave pública (`pk_test_...`) como `STRIPE_SECRET_KEY`. A chave secreta começa sempre com `sk_`.

---

## Scripts Disponíveis

### Raiz do monorepo

| Script | Descrição |
|---|---|
| `npm run dev` | Inicia backend e frontend em paralelo |
| `npm run build` | Build de produção (backend + frontend) |
| `npm run install:all` | Instala dependências do backend e do frontend |
| `npm run db:migrate` | Executa migrations pendentes via Prisma |
| `npm run db:studio` | Abre o Prisma Studio (interface visual do banco) |
| `npm run lint` | Roda o ESLint no frontend |

### Backend (`npm --prefix backend run <script>`)

| Script | Descrição |
|---|---|
| `dev` | Inicia o servidor com `tsx watch` (hot reload) |
| `build` | Compila TypeScript para `dist/` |
| `start` | Inicia a build compilada |
| `start:prod` | Deploy: roda `prisma migrate deploy` e inicia a build |
| `db:migrate` | Cria e executa uma nova migration |
| `db:generate` | Regenera o Prisma Client após alterações no schema |
| `db:seed` | Popula planos, preços e feature gates |
| `db:studio` | Interface visual do banco (Prisma Studio) |
| `stripe:sync` | Cria produtos e preços no Stripe e salva os IDs no banco |
| `stripe:listen` | Encaminha webhooks do Stripe para o servidor local |
| `test` | Executa os testes com Jest |

### Frontend (`npm --prefix frontend run <script>`)

| Script | Descrição |
|---|---|
| `dev` | Inicia o servidor de desenvolvimento Vite |
| `build` | Build de produção (TypeScript + Vite) |
| `preview` | Pré-visualiza a build de produção localmente |
| `lint` | Roda o ESLint |

---

## API Reference

**Base URL:** `http://localhost:3333/api`

Todas as rotas autenticadas exigem o header:
```
Authorization: Bearer <access_token>
```

### Autenticação — `/api/auth`

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/register` | — | Cria uma nova conta |
| `POST` | `/login` | — | Login com e-mail e senha |
| `POST` | `/refresh` | — | Renova o access token via refresh token (cookie) |
| `POST` | `/logout` | — | Invalida a sessão e limpa o cookie |
| `GET` | `/me` | Sim | Retorna o perfil do usuário autenticado |
| `PUT` | `/profile` | Sim | Atualiza nome e avatar |
| `PUT` | `/preferences` | Sim | Atualiza moeda, locale e fuso horário |
| `PUT` | `/change-password` | Sim | Altera a senha |
| `DELETE` | `/data` | Sim | Remove todos os dados financeiros da conta |
| `GET` | `/sessions` | Sim | Lista sessões ativas |
| `DELETE` | `/sessions/:id` | Sim | Revoga uma sessão específica |
| `POST` | `/mfa/setup` | Sim | Inicia configuração do MFA (retorna QR code e secret) |
| `POST` | `/mfa/enable` | Sim | Ativa o MFA após validar o código TOTP |
| `DELETE` | `/mfa/disable` | Sim | Desativa o MFA |
| `POST` | `/mfa/verify` | — | Valida código TOTP no fluxo de login |

### Dashboard e Analytics — `/api/dashboard`, `/api/analytics`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/dashboard/summary` | — | Resumo financeiro do mês atual |
| `GET` | `/analytics/net-worth` | — | Patrimônio líquido atual |
| `GET` | `/analytics/net-worth/history` | — | Histórico de patrimônio |
| `GET` | `/analytics/financial-health` | `FINANCIAL_HEALTH` | Score de saúde financeira |
| `GET` | `/analytics/monthly-projection` | `FORECAST` | Projeção de fechamento do mês |
| `GET` | `/analytics/insights` | `INSIGHTS` | Lista de insights ativos |
| `POST` | `/analytics/insights/:id/dismiss` | `INSIGHTS` | Descarta um insight |
| `POST` | `/analytics/insights/:id/snooze` | `INSIGHTS` | Suspende um insight |
| `POST` | `/analytics/insights/:id/reactivate` | `INSIGHTS` | Reativa um insight suspenso |

### Transações — `/api/transactions`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/` | — | Lista transações com filtros (período, conta, categoria, tag) |
| `POST` | `/` | — | Cria uma transação |
| `PUT` | `/:id` | — | Edita uma transação |
| `DELETE` | `/:id` | — | Remove uma transação |
| `POST` | `/split` | — | Divide uma transação em múltiplas categorias |
| `GET` | `/tags` | — | Lista todas as tags |
| `GET` | `/suggest` | — | Sugestões de categorias por descrição |
| `PATCH` | `/:id/skip` | `RECURRING_TRANSACTIONS` | Pula uma ocorrência recorrente |
| `PATCH` | `/:id/pause` | `RECURRING_TRANSACTIONS` | Pausa uma recorrência |
| `POST` | `/:id/attachments` | — | Anexa um recibo a uma transação |
| `DELETE` | `/:id/attachments/:aid` | — | Remove um anexo |

### Contas e Transferências — `/api/accounts`, `/api/transfers`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/accounts` | — | Lista contas do usuário |
| `POST` | `/accounts` | `ACCOUNTS_LIMIT` | Cria uma conta (respeita o limite do plano) |
| `PUT` | `/accounts/:id` | — | Edita uma conta |
| `DELETE` | `/accounts/:id` | — | Remove uma conta |
| `POST` | `/transfers` | — | Cria uma transferência entre contas |
| `DELETE` | `/transfers/:id` | — | Desfaz uma transferência |

### Planejamento — `/api/goals`, `/api/liabilities`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/goals` | `GOALS` | Lista metas financeiras |
| `POST` | `/goals` | `GOALS` | Cria uma meta |
| `PUT` | `/goals/:id` | `GOALS` | Edita uma meta |
| `DELETE` | `/goals/:id` | `GOALS` | Remove uma meta |
| `GET` | `/liabilities` | `LIABILITIES` | Lista passivos e dívidas |
| `POST` | `/liabilities` | `LIABILITIES` | Cria um passivo |
| `PUT` | `/liabilities/:id` | `LIABILITIES` | Edita um passivo |
| `DELETE` | `/liabilities/:id` | `LIABILITIES` | Remove um passivo |
| `POST` | `/liabilities/:id/pay` | `LIABILITIES` | Registra pagamento de parcela |
| `GET` | `/liabilities/:id/payments` | `LIABILITIES` | Histórico de pagamentos |

### Investimentos — `/api/investment-positions`, `/api/investment-allocation-targets`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/investment-positions` | `INVESTMENTS_ADVANCED` | Lista posições do portfólio |
| `POST` | `/investment-positions` | `INVESTMENTS_ADVANCED` | Adiciona uma posição |
| `PUT` | `/investment-positions/:id` | `INVESTMENTS_ADVANCED` | Edita uma posição |
| `DELETE` | `/investment-positions/:id` | `INVESTMENTS_ADVANCED` | Remove uma posição |
| `POST` | `/investment-positions/:id/yield` | `INVESTMENTS_ADVANCED` | Registra rendimento |
| `GET` | `/investment-positions/:id/movements` | `INVESTMENTS_ADVANCED` | Movimentações de uma posição |
| `POST` | `/investment-positions/:id/movements` | `INVESTMENTS_ADVANCED` | Registra movimentação |
| `GET` | `/investment-allocation-targets` | `INVESTMENT_ALLOCATION` | Metas de alocação por classe |
| `POST` | `/investment-allocation-targets` | `INVESTMENT_ALLOCATION` | Salva metas de alocação |

### Cartões de Crédito — `/api/credit-cards`

| Método | Endpoint | Gate | Descrição |
|---|---|---|---|
| `GET` | `/` | — | Lista cartões |
| `POST` | `/` | `CREDIT_CARDS_LIMIT` | Cria cartão (respeita o limite do plano) |
| `PATCH` | `/:id` | — | Edita um cartão |
| `POST` | `/:id/archive` | — | Arquiva um cartão |
| `GET` | `/:id/statements` | — | Lista faturas do cartão |
| `GET` | `/:id/statements/:sid` | — | Detalhes de uma fatura |
| `POST` | `/:id/statements/:sid/pay` | — | Paga uma fatura |

### Outros módulos

| Módulo | Endpoints | Gate |
|---|---|---|
| Categorias | `GET/POST/PUT/DELETE /categories` | — |
| Orçamentos | `GET/POST/DELETE /budgets` | — |
| Importação CSV | `POST /import/check-duplicates`, `POST /import/transactions` | `CSV_IMPORT` |
| Regras de categorização | `GET/POST/PUT/DELETE /categorization-rules` | `RULES_AUTOCATEGORIZATION` |
| Micro-metas | `GET/POST/PATCH/DELETE /micro-goals` | `INSIGHTS` |
| Health check | `GET /health`, `GET /health/ready` | — |

### Billing — `/api/billing`

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `GET` | `/plans` | — | Lista planos disponíveis com preços |
| `GET` | `/entitlements` | Sim | Plano atual e features habilitadas do usuário |
| `GET` | `/current-subscription` | Sim | Detalhes da assinatura ativa |
| `POST` | `/checkout-session` | Sim | Cria sessão de checkout no Stripe |
| `POST` | `/portal-session` | Sim | Redireciona para o portal de cobrança do Stripe |
| `POST` | `/cancel` | Sim | Cancela a assinatura ao fim do período atual |
| `POST` | `/resume` | Sim | Reativa uma assinatura cancelada |
| `POST` | `/webhook/stripe` | — | Recebe eventos do Stripe (uso interno) |

---

## Planos e Assinaturas

| Feature | Free | Pro | Business |
|---|:---:|:---:|:---:|
| Dashboard básico | ✅ | ✅ | ✅ |
| Contas bancárias | Até 2 | Até 10 | Ilimitadas |
| Cartões de crédito | Até 2 | Até 10 | Ilimitados |
| Transações por mês | 200 | 5.000 | Ilimitadas |
| Transações recorrentes | — | ✅ | ✅ |
| Metas financeiras | — | ✅ | ✅ |
| Passivos e dívidas | — | ✅ | ✅ |
| Importação via CSV | — | ✅ | ✅ |
| Regras de autocategorização | — | ✅ | ✅ |
| Score de saúde financeira | — | ✅ | ✅ |
| Previsão mensal | — | ✅ | ✅ |
| Insights automáticos | — | ✅ | ✅ |
| Relatórios avançados | — | — | ✅ |
| Investimentos avançados | — | — | ✅ |
| Alocação de portfólio | — | — | ✅ |
| Exportação de dados | — | — | ✅ |
| **Preço mensal** | Grátis | R$ 19/mês | R$ 49/mês |
| **Preço anual** | Grátis | R$ 159,60/ano | R$ 411,60/ano |
| **Trial** | — | 7 dias grátis | — |

### Feature gating — como funciona

O controle de acesso opera em duas camadas independentes:

**Backend** — O middleware `planGate` verifica o plano do usuário antes de executar cada controller. Respostas possíveis para usuários sem acesso:
- `402 Payment Required` — feature não inclusa no plano atual
- `429 Too Many Requests` — limite mensal da feature atingido

**Frontend** — O componente `FeatureRoute` envolve as páginas protegidas. Se a feature não estiver habilitada, exibe uma página de bloqueio contextual com: descrição da feature, plano necessário, destaques e CTAs de upgrade. A sidebar exibe itens bloqueados com visual apagado e ícone de cadeado — o usuário vê o que está disponível antes de decidir fazer upgrade.

---

## Integração com Stripe

### Setup completo (apenas uma vez)

**1. Obtenha as credenciais**

Acesse o [Stripe Dashboard](https://dashboard.stripe.com) → **Developers → API keys** e copie a **Secret key** (`sk_test_...`).

**2. Configure o `.env`**

```env
STRIPE_SECRET_KEY="sk_test_..."
```

> Reinicie o servidor após alterar o `.env`.

**3. Popule o banco e sincronize o Stripe**

```bash
# Cria planos e preços no banco de dados
npm --prefix backend run db:seed

# Cria produtos/preços no Stripe e salva os IDs no banco
npm --prefix backend run stripe:sync
```

**4. Configure os webhooks (desenvolvimento)**

```bash
# Requer o Stripe CLI instalado
npm --prefix backend run stripe:listen
```

Copie o `whsec_...` exibido no terminal e adicione ao `.env`:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Reinicie o servidor.

**5. Ative o Customer Portal**

No Stripe Dashboard: **Billing → Customer portal → Activate portal**.

Isso habilita a página de gerenciamento de assinatura do usuário (troca de plano, histórico de faturas, cancelamento).

### Configuração para produção

No Stripe Dashboard:

**Developers → Webhooks → Add endpoint**

```
URL: https://SEU_DOMINIO/api/billing/webhook/stripe

Eventos:
  customer.subscription.created
  customer.subscription.updated
  customer.subscription.deleted
  checkout.session.completed
  invoice.payment_failed
```

### Eventos de webhook monitorados

| Evento | Efeito no sistema |
|---|---|
| `checkout.session.completed` | Ativa a assinatura e atualiza o plano do usuário |
| `customer.subscription.created` | Registra a nova assinatura no banco |
| `customer.subscription.updated` | Atualiza status, período atual e plano |
| `customer.subscription.deleted` | Marca a assinatura como cancelada |
| `invoice.payment_failed` | Marca a assinatura como `PAST_DUE` |

---

## Autenticação

O sistema usa **JWT stateless** com access token de curta duração e refresh token armazenado em cookie `httpOnly`.

### Fluxo de autenticação

```
1. POST /auth/register  ou  POST /auth/login
   → Retorna: { access_token } no body + refresh_token em cookie httpOnly

2. Requisições autenticadas:
   Authorization: Bearer <access_token>

3. Token expirado:
   POST /auth/refresh
   → Lê o refresh_token do cookie e emite um novo access_token

4. Logout:
   POST /auth/logout → revoga a sessão e limpa o cookie
```

### Multi-Factor Authentication (MFA)

Suporte completo a TOTP, compatível com **Google Authenticator**, **Authy** e qualquer app TOTP padrão.

```
Ativação:
  1. POST /auth/mfa/setup   → retorna QR code e secret para configurar o app
  2. POST /auth/mfa/enable  → confirma com o código TOTP para ativar

Login com MFA ativo:
  1. POST /auth/login       → { requiresMfa: true, tempToken }
  2. POST /auth/mfa/verify  → valida o código TOTP e retorna os tokens finais
```

---

## Banco de Dados

Gerenciado pelo **Prisma ORM** com **PostgreSQL 16**. As migrations ficam versionadas em `backend/prisma/migrations/`.

### Mapa de entidades

```
User
├── Session            → sessões ativas por dispositivo
├── Account            → contas bancárias do usuário
├── Category           → categorias de renda e despesa
├── Transaction        → todas as movimentações financeiras
│   ├── Transaction    → instâncias de recorrência (parentId)
│   ├── Tag
│   └── TransactionAttachment
├── Budget             → orçamentos mensais por categoria
├── CreditCard
│   ├── CardStatement  → faturas mensais
│   └── InstallmentPlan
├── Goal               → metas financeiras vinculadas a contas
├── Liability          → passivos/dívidas com parcelas
│   └── LiabilityPayment
├── InvestmentPosition → ativos do portfólio
│   └── InvestmentMovement
├── InvestmentAllocationTarget
├── Insight            → alertas financeiros automáticos
├── MicroGoal          → micro-metas de gastos por categoria
├── CategorizationRule → regras de categorização automática
│
├── Subscription       → assinatura Stripe ativa
│   └── SubscriptionEvent
└── UsageCounter       → uso mensal por feature (para limites)

Plan
├── Price              → preços por ciclo (MONTHLY / YEARLY)
└── FeatureGate        → features habilitadas por plano
```

### Comandos úteis

```bash
# Interface visual para explorar e editar dados
npm run db:studio

# Criar nova migration após alterar o schema
npm --prefix backend run db:migrate

# Regenerar o Prisma Client após alterar o schema
npm --prefix backend run db:generate

# Resetar o banco completamente (DESTRÓI OS DADOS)
npx --prefix backend prisma migrate reset
```

---

<div align="center">

Feito com foco em resultado financeiro real.

</div>
