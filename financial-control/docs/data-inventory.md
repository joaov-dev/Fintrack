# DominaHub — Inventário de Dados Pessoais

> **LGPD Art. 37 — Registro das Operações de Tratamento**
> **Versão:** 1.0 | **Data:** 2026-03-05 | **Responsável:** DPO

---

## 1. Identificação do Controlador

| Campo | Valor |
|---|---|
| Razão Social | DominaHub Tecnologia Ltda |
| CNPJ | XX.XXX.XXX/XXXX-XX |
| DPO | [Nome do DPO] |
| E-mail DPO | dpo@dominahub.com.br |
| Encarregado ANPD | dpo@dominahub.com.br |

---

## 2. Mapa de Dados Pessoais

### 2.1 Dados Cadastrais

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `name` | String | Identificação, interface personalizada | Art. 7 V — execução de contrato | Até exclusão da conta | DB: `users.name` |
| `email` | String | Autenticação, comunicações transacionais | Art. 7 V — execução de contrato | Até exclusão + 30 dias (supressão) | DB: `users.email`, `deleted_accounts.email` |
| `passwordHash` | Hash bcrypt | Autenticação | Art. 7 V | Até exclusão da conta | DB: `users.passwordHash` |
| `avatar` | URL/base64 | Interface personalizada | Art. 7 V | Até exclusão da conta | DB: `users.avatar` |
| `createdAt` | DateTime | Registro de criação de conta | Art. 7 V | Até exclusão da conta | DB: `users.createdAt` |

### 2.2 Dados de Preferências e Configuração

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `currency`, `locale`, `timezone` | String | Formatação de interface | Art. 7 V | Até exclusão da conta | DB: `users.*` |
| `notif*`, `email*` | Boolean | Controle de comunicações | Art. 7 IX — legítimo interesse | Até exclusão da conta | DB: `users.*` |
| `closingDay` | Int | Cálculo de fatura de cartão | Art. 7 V | Até exclusão da conta | DB: `users.closingDay` |

### 2.3 Dados Financeiros (Dados Pessoais Comuns — alta sensibilidade contextual)

| Tabela | Dados | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `transactions` | Valor, descrição, data, categoria | Controle financeiro pessoal | Art. 7 V | Até exclusão da conta | DB: `transactions` |
| `accounts` | Nome, tipo, saldo inicial | Gestão de contas | Art. 7 V | Até exclusão da conta | DB: `accounts` |
| `categories` | Nome, tipo | Categorização de gastos | Art. 7 V | Até exclusão da conta | DB: `categories` |
| `budgets` | Valor por categoria/mês | Planejamento financeiro | Art. 7 V | Até exclusão da conta | DB: `budgets` |
| `goals` | Nome, valor alvo, prazo | Metas financeiras | Art. 7 V | Até exclusão da conta | DB: `goals` |
| `micro_goals` | Nome, valor, período | Micro-metas de controle | Art. 7 V | Até exclusão da conta | DB: `micro_goals` |
| `liabilities` | Nome, saldo, tipo de dívida | Controle de passivos | Art. 7 V | Até exclusão da conta | DB: `liabilities` |
| `credit_cards` | Nome, limite, datas de fatura | Controle de cartões | Art. 7 V | Até exclusão da conta | DB: `credit_cards` |
| `investment_positions` | Nome, ticker, valor | Controle de investimentos | Art. 7 V | Até exclusão da conta | DB: `investment_positions` |

### 2.4 Dados de Segurança e Acesso

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `sessions.ipAddress` | String (IP) | Segurança da conta, detecção de sessão anômala | Art. 7 IX — legítimo interesse | Até expiração da sessão | DB: `sessions` |
| `sessions.userAgent` | String | Identificação de dispositivo para segurança | Art. 7 IX | Até expiração da sessão | DB: `sessions` |
| `login_attempts.ip` | String (IP) | Prevenção de brute-force | Art. 7 IX | 30 dias | DB: `login_attempts` |
| `login_attempts.email` | String | Correlação de tentativas de invasão | Art. 7 IX | 30 dias | DB: `login_attempts` |
| `auth_events.ip` | String (IP) | Trilha de auditoria de segurança | Art. 7 IX | 365 dias | DB: `auth_events` |
| `auth_events.userAgent` | String | Trilha de auditoria | Art. 7 IX | 365 dias | DB: `auth_events` |
| `mfaSecret` (criptografado) | AES-256-GCM | Autenticação de dois fatores | Art. 7 V | Até exclusão da conta | DB: `users.mfaSecret` |

### 2.5 Dados de Consentimento (Art. 7 I)

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `consent_records.consentType` | Enum | Registro de consentimento | Art. 7 IX — obrigação legal | 5 anos (prazo prescricional civil) | DB: `consent_records` |
| `consent_records.granted` | Boolean | Estado do consentimento | Art. 7 IX | 5 anos | DB: `consent_records` |
| `consent_records.ip` | String (IP) | Evidência do consentimento | Art. 7 IX | 5 anos | DB: `consent_records` |
| `consent_records.createdAt` | DateTime | Timestamp do consentimento | Art. 7 IX | 5 anos | DB: `consent_records` |

### 2.6 Dados de Auditoria

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `audit_logs.userId` | String | Trilha de auditoria de mutações | Art. 7 IX | 365 dias | DB: `audit_logs` |
| `audit_logs.ip` | String (IP) | Contexto de segurança | Art. 7 IX | 365 dias | DB: `audit_logs` |
| `audit_logs.action` | String | Registro de operações | Art. 7 IX | 365 dias | DB: `audit_logs` |

### 2.7 Dados de Faturamento

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `billing_customers.stripeCustomerId` | String | Gestão de assinatura | Art. 7 V | Até cancelamento + 5 anos (fiscal) | DB: `billing_customers` |
| Email (Stripe) | String | Cobrança, recibos | Art. 7 V | Controlado pelo Stripe (suboperador) | Stripe (EUA — cláusulas padrão LGPD) |

### 2.8 Dados de Anexos de Transações

| Campo | Tipo | Finalidade | Base Legal | Retenção | Local |
|---|---|---|---|---|---|
| `dataUrl` | Base64 criptografado | Comprovantes de transação | Art. 7 V | Até exclusão da transação | DB: `transaction_attachments.dataUrl` (AES-256-GCM) |
| `filename`, `mimeType`, `size` | String, Int | Metadados do arquivo | Art. 7 V | Até exclusão da transação | DB: `transaction_attachments` |

---

## 3. Fluxo de Dados e Suboperadores

| Suboperador | País | Dados Compartilhados | Finalidade | Base Legal Transferência |
|---|---|---|---|---|
| **AWS** (Amazon) | EUA | IP, logs, dados da aplicação | Hospedagem e infraestrutura | SCCs (LGPD Art. 33 II — garantias adequadas) |
| **Stripe** | EUA | Email, ID de cliente, valor de assinatura | Processamento de pagamentos | SCCs |
| **Have I Been Pwned** | EUA | Hash SHA-1 parcial da senha | Verificação de vazamentos (k-anonymity) | Art. 7 IX — legítimo interesse (nenhum dado identificável transmitido) |

> **HIBP:** Apenas os 5 primeiros caracteres do hash SHA-1 são enviados. O HIBP não recebe a senha nem pode identificar o usuário. Isso é considerado dado anonimizado.

---

## 4. Dados NÃO Coletados (Princípio da Minimização)

Por design, o DominaHub **não coleta**:

- CPF, CNPJ, RG ou qualquer documento de identificação nacional
- Dados biométricos
- Dados de saúde
- Origem racial ou étnica
- Opiniões políticas, religiosas ou filosóficas
- Localização GPS em tempo real
- Conteúdo de comunicações privadas
- Dados de crianças (menores de 18 anos) — uso proibido pelos Termos de Serviço

---

## 5. Direitos dos Titulares (LGPD Art. 18)

| Direito | Artigo | Endpoint | SLA de Resposta |
|---|---|---|---|
| Confirmação de tratamento | Art. 18 I | `GET /api/v1/privacy/me` | Imediato |
| Acesso aos dados | Art. 18 II | `GET /api/v1/privacy/me` | Imediato |
| Correção de dados incompletos/inexatos | Art. 18 III | `PUT /api/v1/auth/profile` | Imediato |
| Anonimização/bloqueio/eliminação | Art. 18 IV | `DELETE /api/v1/auth/data` | Imediato (financeiro) |
| Portabilidade | Art. 18 V | `GET /api/v1/privacy/export` | Imediato |
| Eliminação total | Art. 18 VI | `DELETE /api/v1/privacy/account` | 30 dias (período de resfriamento) |
| Informação sobre suboperadores | Art. 18 VII | Este documento (seção 3) | — |
| Revogação de consentimento | Art. 18 IX | `PUT /api/v1/privacy/consent` | Imediato |

---

## 6. Medidas de Segurança Técnicas

| Dado | Proteção em trânsito | Proteção em repouso |
|---|---|---|
| Todos os dados API | TLS 1.3 (ALB + Nginx) | — |
| Senha | bcrypt (12 rounds) | Não reversível |
| MFA secret | — | AES-256-GCM (campo `mfaSecret`) |
| Anexos de transações | TLS | AES-256-GCM (campo `dataUrl`) |
| Dados RDS | TLS (sslmode=require) | AES-256 CMK (AWS KMS) |
| Logs CloudWatch | HTTPS | KMS CMK |
| Backup RDS | — | AES-256 CMK |
| Secrets (JWT, enc keys) | — | AWS Secrets Manager + KMS CMK |

---

## 7. Política de Retenção Resumida

| Dado | Retenção | Mecanismo de Exclusão |
|---|---|---|
| Dados financeiros do usuário | Até exclusão da conta | `DELETE /api/v1/auth/data` ou erasure |
| Conta do usuário | Até solicitação de erasure + 30 dias | `retentionService.executeScheduledErasures()` |
| Email (supressão) | Até 30 dias após erasure completo | Limpeza manual ou automática |
| `login_attempts` | 30 dias | `retentionService` (cron diário) |
| `used_totp_codes` | 7 dias | `retentionService` (cron diário) |
| `used_mfa_tokens` | 2 dias | `retentionService` (cron diário) |
| Sessões expiradas | Após expiração | `retentionService` (cron diário) |
| `auth_events` | 365 dias | Arquivamento (nunca deletado) |
| `audit_logs` | 365 dias | Arquivamento (nunca deletado) |
| `consent_records` | 5 anos | Manual (obrigação legal) |
| CloudTrail / AWS logs | 7 anos | S3 Lifecycle → Glacier → Expiração |
| Dados de faturamento (Stripe) | Contrato Stripe + 5 anos (fiscal) | Via Stripe dashboard |

---

## 8. Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 2026-03-05 | Criação inicial |
