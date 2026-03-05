# Matriz de Controle de Acesso — DominaHub

> **Classificação:** Interno — Restrito (CISO + Tech Leads)
> **Versão:** 1.0 | **Data:** 2026-03-05 | **Revisão:** Trimestral
> **Dono:** CISO | **Aprovador:** CISO + CEO

---

## Legenda

| Símbolo | Nível | Descrição |
|---|---|---|
| `—` | Nenhum | Sem acesso; sequer sabe que o sistema existe |
| `R` | Leitura | Read-only; não pode modificar dados |
| `W` | Escrita | Leitura + escrita em escopo limitado |
| `A` | Admin | Controle total sobre o sistema/recurso |
| `T` | Temporário | Acesso por prazo determinado, com aprovação prévia |
| `E` | Emergência | Break-glass; uso registrado e auditado; dispara alerta |

---

## 1. Papéis Organizacionais

| ID | Papel | Exemplos de Função | Contagem Máxima |
|---|---|---|---|
| ENG | Engenheiro de Software | Frontend, Backend, Full-stack | Ilimitado |
| DEV-OPS | Engenheiro de DevOps/Plataforma | Infra, CI/CD, Cloud | ≤ 3 |
| SEC | CISO / Engenheiro de Segurança | Security lead | ≤ 2 |
| PROD | Product Manager | PM, Designer com acesso a dados | ≤ 4 |
| SUP | Customer Support | Atendimento ao cliente | ≤ 5 |
| FIN | Finance | Financeiro, contabilidade | ≤ 2 |
| EXEC | Executivo | CEO, CTO, CFO | ≤ 3 |
| EXT | Externo/Contratado | Consultores, agências, freelancers | Conforme projeto |

---

## 2. Sistemas e Recursos

### 2.1 AWS (Cloud Infrastructure)

| Sistema / Recurso | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **AWS Console — login** | — | A | A | — | — | — | R | T |
| **IAM — gerenciar usuários/roles** | — | — | A | — | — | — | — | — |
| **ECS — visualizar tasks** | R | A | A | — | — | — | — | — |
| **ECS — deploy/restart tasks** | — | A | R | — | — | — | — | — |
| **RDS (Produção) — queries** | — | T+E | T+E | — | — | — | — | — |
| **RDS (Staging) — queries** | T | A | A | — | — | — | — | — |
| **Secrets Manager** | — | W | A | — | — | — | — | — |
| **CloudWatch Logs — app logs** | R | A | A | — | — | — | — | — |
| **CloudWatch Logs — audit/auth** | — | R | A | — | — | — | — | — |
| **S3 — assets/backups** | — | A | A | — | — | — | — | — |
| **WAF — visualizar** | — | R | A | — | — | — | — | — |
| **WAF — editar regras** | — | — | A | — | — | — | — | — |
| **KMS — visualizar** | — | R | A | — | — | — | — | — |
| **Billing / Cost Explorer** | — | R | R | — | — | A | A | — |
| **CloudTrail** | — | R | A | — | — | — | — | — |

> **Regra:** Acesso `T` (temporário) ao RDS de produção requer aprovação dual (Tech Lead + CISO), sessão máxima de 1h via AWS Session Manager, log automático.

---

### 2.2 GitHub

| Recurso | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **Repositório — leitura** | R | R | R | R | — | — | R | T |
| **Repositório — commits (branches)** | W | W | W | — | — | — | — | T |
| **Merge em `main`** | — | A | A | — | — | — | — | — |
| **Merge em `develop`** | W | A | A | — | — | — | — | — |
| **Branch protection rules** | — | A | A | — | — | — | — | — |
| **Actions Secrets (CI)** | — | A | A | — | — | — | — | — |
| **Actions — visualizar logs** | R | A | A | R | — | — | — | — |
| **Gerenciar colaboradores** | — | — | A | — | — | — | — | — |
| **Dependabot alerts** | R | A | A | — | — | — | — | — |
| **Security advisories** | — | R | A | — | — | — | — | — |

> **Regra:** Commits em `main` diretos são bloqueados por branch protection. Merge via PR com ≥ 1 aprovação obrigatória para ENG; ≥ 2 para DEV-OPS e SEC.

---

### 2.3 Banco de Dados

| Recurso | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **DB Local (dev)** | A | A | A | — | — | — | — | — |
| **DB Staging — leitura** | R | A | A | R | — | — | — | — |
| **DB Staging — escrita** | W | A | A | — | — | — | — | — |
| **DB Produção — leitura** | — | T | T | — | — | — | — | — |
| **DB Produção — escrita** | — | E | E | — | — | — | — | — |
| **DB Produção — DDL (schema)** | — | — | A | — | — | — | — | — |
| **Prisma Studio (produção)** | — | — | — | — | — | — | — | — |

> **Regra:** DB Produção — escrita (`E`) é break-glass exclusivo. Qualquer uso dispara alerta no canal #incidentes-segurança. Somente via script aprovado em PR, nunca query ad-hoc. DB Produção nunca é acessível via Prisma Studio.

---

### 2.4 Stripe

| Recurso | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **Stripe Dashboard (test)** | R | R | R | R | — | — | — | — |
| **Stripe Dashboard (live) — leitura** | — | — | R | — | R | A | A | — |
| **Stripe Dashboard (live) — reembolso** | — | — | — | — | W | A | A | — |
| **Stripe Dashboard (live) — API keys** | — | — | A | — | — | — | — | — |
| **Stripe Webhook — gerenciar** | — | A | A | — | — | — | — | — |
| **Relatórios financeiros** | — | — | — | — | — | A | A | — |

---

### 2.5 Ferramentas Operacionais

| Ferramenta | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **Slack — geral** | A | A | A | A | A | A | A | — |
| **Slack — #incidentes-segurança** | R | A | A | — | — | — | A | — |
| **Slack — #infra-alerts** | R | A | A | — | — | — | — | — |
| **1Password (Teams)** | W | A | A | R | R | R | A | — |
| **1Password — Security vault** | — | R | A | — | — | — | — | — |
| **Google Workspace (email/Drive)** | A | A | A | A | A | A | A | T |
| **Notion / Documentação** | W | W | W | W | R | R | A | T |
| **Linear / Jira (tickets)** | A | A | A | A | R | — | A | T |
| **Datadog / Grafana (monitoring)** | R | A | A | R | — | — | R | — |
| **Ferramenta de suporte (ex.: Intercom)** | — | — | — | — | A | — | — | — |

---

### 2.6 Dados de Usuários (via API interna)

| Ação | ENG | DEV-OPS | SEC | PROD | SUP | FIN | EXEC | EXT |
|---|---|---|---|---|---|---|---|---|
| **Ver dados de usuário específico** | — | — | T | — | T | — | — | — |
| **Exportar dados de usuário** | — | — | T | — | — | — | — | — |
| **Deletar dados de usuário** | — | — | T | — | — | — | — | — |
| **Ver aggregate/anônimo** | R | R | A | R | — | — | R | — |
| **Analytics de uso** | R | R | A | A | — | — | A | — |

> **Regra:** Acesso `T` a dados de usuários individuais requer: (1) solicitação via ticket com justificativa, (2) aprovação do CISO, (3) log em `audit_logs` com `SENSITIVE_READ`, (4) acesso expira em 24h.

---

## 3. Requisitos de Autenticação por Nível

| Nível | MFA | Tipo de MFA Aceito | Revisão de Acesso |
|---|---|---|---|
| Nível 1 (Leitura) | Recomendado | TOTP, SMS | Anual |
| Nível 2 (Operacional) | **Obrigatório** | TOTP preferido; SMS aceito | Trimestral |
| Nível 3 (Elevado) | **Obrigatório** | TOTP apenas; SMS não aceito | Trimestral |
| Nível 4 (Admin) | **Obrigatório** | Hardware key (YubiKey) preferido | Mensal |
| Break-glass | **Obrigatório** | TOTP + aprovação dual | A cada uso |

---

## 4. Controle de Acesso Temporário

### Processo de Solicitação

```
1. Solicitante abre ticket em Linear/Jira:
   - Sistema e recurso específico
   - Justificativa de negócio
   - Duração necessária (max 8h para produção; max 24h para outros)

2. Aprovação:
   - Nível 2: Tech Lead do time
   - Nível 3: Tech Lead + CISO
   - Nível 4/Break-glass: CISO + CEO

3. Concessão:
   - DevOps concede via AWS IAM policy temporária ou equivalente
   - Acesso automaticamente revogado no prazo (CloudFormation StackSet ou script)

4. Log:
   - Toda ação durante o acesso temporário deve gerar entrada em audit_logs
   - Post-uso: breve resumo do que foi feito, anexado ao ticket
```

---

## 5. Contas de Serviço e Automação

| Conta de Serviço | Sistema | Permissões | Rotação da Key | Responsável |
|---|---|---|---|---|
| `ecs-task-prod` | AWS IAM | Secrets read, CloudWatch logs write | Via OIDC (sem key estática) | DevOps |
| `ecs-task-staging` | AWS IAM | Secrets read, CloudWatch logs write | Via OIDC | DevOps |
| `github-ci-deploy` | AWS IAM | ECR push, ECS deploy (via OIDC) | Sem key estática (OIDC) | DevOps |
| `prisma-migrate` | RDS | DDL + DML em migration schema | Rotação automática RDS | DevOps |
| `stripe-webhook-validator` | Stripe | Receive webhooks | A cada 6 meses | DevOps |
| `datadog-agent` | CloudWatch | CloudWatch read | Anual | DevOps |

> **Regra:** Nenhuma conta de serviço tem permissões de admin. Todas usam IAM Roles com políticas mínimas. Chaves estáticas são proibidas onde OIDC é disponível.

---

## 6. Registro de Exceções Ativas

Exceções são acessos que fogem da matriz padrão por necessidade temporária ou justificativa documentada. Toda exceção tem prazo de expiração.

| ID | Pessoa/Sistema | Acesso Extra | Justificativa | Aprovado por | Expira em | Status |
|---|---|---|---|---|---|---|
| EXC-001 | Exemplo: DevOps Lead | RDS Prod leitura contínua | Investigação de performance Q1 | CISO | 2026-04-01 | Ativo |

> Esta tabela é atualizada a cada access review trimestral. Exceções expiradas são removidas.

---

## 7. Histórico de Revisões

| Data | Tipo | Alterações | Responsável |
|---|---|---|---|
| 2026-03-05 | Criação | Versão inicial | CISO |

*Próxima revisão obrigatória: 2026-06-05 (trimestral)*
