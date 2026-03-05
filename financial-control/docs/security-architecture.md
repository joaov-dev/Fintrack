# DominaHub — Cloud Security Architecture

> **Versão:** 1.0 | **Data:** 2026-03-04 | **Classificação:** Interno

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Diagrama da Arquitetura](#2-diagrama-da-arquitetura)
3. [HTTPS Obrigatório — TLS Moderno](#3-https-obrigatório--tls-moderno)
4. [WAF com Regras OWASP](#4-waf-com-regras-owasp)
5. [Rate Limiting no Edge](#5-rate-limiting-no-edge)
6. [Segregação de Redes](#6-segregação-de-redes)
7. [Secrets Manager](#7-secrets-manager)
8. [IAM com Least Privilege](#8-iam-com-least-privilege)
9. [Proteção contra DDoS](#9-proteção-contra-ddos)
10. [Zero Trust Architecture](#10-zero-trust-architecture)
11. [Runbooks de Segurança](#11-runbooks-de-segurança)
12. [Matriz de Responsabilidades](#12-matriz-de-responsabilidades)

---

## 1. Visão Geral

### Plataforma

DominaHub é um SaaS de controle financeiro pessoal com dados altamente sensíveis (transações bancárias, dados de cartão de crédito, metas financeiras, informações pessoais). O modelo de ameaça exige proteção em múltiplas camadas.

### Stack de Segurança

| Camada | Tecnologia | Função |
|---|---|---|
| Edge (Global) | AWS CloudFront + Shield Advanced | DDoS, CDN, TLS termination |
| WAF | AWS WAF v2 (OWASP CRS) | Filtragem de requisições maliciosas |
| Load Balancer | AWS ALB (TLS 1.2/1.3) | HTTPS termination, health checks |
| Rede | VPC 3-tier + Security Groups | Segregação de rede |
| Aplicação | Helmet, HPP, CORS, Rate Limiter | OWASP headers, input sanitization |
| Secrets | AWS Secrets Manager + KMS CMK | Gestão de credenciais |
| Identidade | IAM Least Privilege + OIDC | Zero Trust identity |
| Auditoria | VPC Flow Logs, WAF Logs, CloudTrail | Visibilidade e forense |

---

## 2. Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                        │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ HTTPS (443) / HTTP (80→301→HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AWS CloudFront (Edge - DDoS Layer 3/4 Shield Standard)                 │
│  + Shield Advanced (opcional, Layer 7)                                  │
│  + AWS WAF Global (IP Reputation, Rate Limit 1000/5min)                 │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ HTTPS (origine)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AWS ALB — PUBLIC SUBNETS (10.0.1.0/24 | 10.0.2.0/24)                  │
│  TLS 1.2/1.3 only | ELBSecurityPolicy-TLS13-1-2-2021-06                │
│  + WAF Regional (OWASP CRS, SQLi, BadInputs, Rate Limit 20/5min auth)  │
│  HTTP→HTTPS redirect | ACM managed certificate                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ HTTP :3333 (internal only)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ECS Fargate — PRIVATE SUBNETS (10.0.11.0/24 | 10.0.12.0/24)           │
│  Node.js API (Express + Helmet + HPP + Rate Limiter)                   │
│  → outbound via NAT Gateway only                                        │
│  → reads secrets from Secrets Manager at startup                       │
└──────┬──────────────────────────────────────────┬───────────────────────┘
       │ PostgreSQL :5432                          │ HTTPS :443 (Stripe, HIBP)
       ▼                                           ▼
┌──────────────────────────┐             ┌─────────────────────────────┐
│  RDS PostgreSQL           │             │  External APIs              │
│  DB SUBNETS               │             │  (via NAT Gateway)          │
│  (10.0.21.0/24 | .22/24) │             │                             │
│  No internet route        │             │                             │
│  Encrypted at rest (CMK)  │             │                             │
└──────────────────────────┘             └─────────────────────────────┘
```

---

## 3. HTTPS Obrigatório — TLS Moderno

### Configuração TLS

| Parâmetro | Valor | Motivo |
|---|---|---|
| Protocolo mínimo | TLS 1.2 | Requisito PCI DSS 4.0 |
| Protocolo máximo | TLS 1.3 | Performance + forward secrecy |
| Cipher suites | ECDHE-*-GCM, ChaCha20-Poly1305 | AEAD only — sem CBC |
| Session tickets | Desabilitado | Preserva forward secrecy |
| OCSP Stapling | Habilitado | Latência reduzida + privacidade |
| DH params | 4096-bit | Segurança do handshake |
| Curvas EC | P-256, P-384 | NIST-approved |

### HTTP Strict Transport Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `max-age=31536000` — 1 ano de cache no browser
- `includeSubDomains` — força HTTPS em todos os subdomínios
- `preload` — inclui no HSTS preload list dos browsers (proteção mesmo sem visita prévia)

> **Ação:** Registrar o domínio em https://hstspreload.org após o deploy inicial.

### Onde é aplicado

| Caminho | Responsável |
|---|---|
| ALB | `ELBSecurityPolicy-TLS13-1-2-2021-06` (veja [alb.tf](../infra/terraform/alb.tf)) |
| Nginx (fallback VPS) | `ssl_protocols TLSv1.2 TLSv1.3` + cipher suite (veja [nginx.conf](../infra/nginx/nginx.conf)) |
| Headers HTTP | `helmet()` no Express (veja [app.ts](../backend/src/app.ts)) |

### Verificação

```bash
# Testar score SSL
curl https://ssllabs.com/ssltest/analyze.html?d=app.dominahub.com.br

# Verificar protocolo TLS
openssl s_client -connect app.dominahub.com.br:443 -tls1_1
# → deve retornar: ssl handshake failure (TLS 1.1 rejeitado)

openssl s_client -connect app.dominahub.com.br:443 -tls1_3
# → deve conectar com sucesso
```

**Meta:** Score A+ no SSL Labs.

---

## 4. WAF com Regras OWASP

### Arquitetura WAF (duas camadas)

```
CloudFront WAF (global)         ALB WAF (regional)
  ↓                               ↓
  IP Reputation List              IP Reputation List
  Rate limit: 1000/5min           OWASP CRS (Common Rule Set)
                                  Known Bad Inputs
                                  SQLi Rule Set
                                  Rate limit: 1000/5min global
                                  Rate limit: 20/5min auth
```

### Regras OWASP Habilitadas

| Prioridade | Regra | Protege contra |
|---|---|---|
| 100 | `AWSManagedRulesAmazonIpReputationList` | Bots, scrapers, IPs maliciosos |
| 200 | `AWSManagedRulesCommonRuleSet` (OWASP CRS) | XSS, LFI, RFI, SSRF, command injection |
| 300 | `AWSManagedRulesKnownBadInputsRuleSet` | Log4Shell, Spring4Shell, SSRF probes |
| 400 | `AWSManagedRulesSQLiRuleSet` | SQL injection em todos os parâmetros |
| 500 | Rate limit global (custom) | Abuso e scraping |
| 600 | Rate limit auth (custom) | Brute-force em login/register |

### Exceções Configuradas

- `SizeRestrictions_BODY`: modo `count` para o endpoint `/api/v1/import` (upload de CSV de até 10 MB)

### Logs

Todos os eventos WAF são enviados para S3 (criptografado com CMK) com retenção de 90 dias. Configure alertas no CloudWatch para:
- `BlockedRequests > 100/minute` → investigar ataque
- `RateLimitAuth > 10/minute` → possível brute-force em andamento

### Verificação

```bash
# Testar bloqueio de SQLi básico
curl -X POST https://app.dominahub.com.br/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin'\'' OR 1=1--", "password": "x"}'
# → deve retornar 403 (bloqueado pelo WAF antes de chegar à app)
```

---

## 5. Rate Limiting no Edge

### Camadas de Rate Limiting

| Camada | Onde | Limite | Alvo |
|---|---|---|---|
| Edge L1 | WAF / CloudFront | 1000 req/5min por IP | Proteção global |
| Edge L2 | WAF auth rule | 20 req/5min por IP | Login/Register (brute-force) |
| Nginx L3 | nginx.conf | 1r/min (burst=5) auth, 20r/min global | VPS fallback |
| App L4 | Express `apiLimiter` | 300 req/15min por IP | Proteção da app |
| App L5 | Express `authLimiter` | 10 req/15min por IP | Endpoints de auth |
| App L6 | Express `userLimiter` | 200 req/15min por user | Por usuário autenticado |
| App L7 | Express `heavyLimiter` | 10 req/min por user | Analytics/Import |

### Resposta ao Rate Limit

```json
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{ "error": "Muitas tentativas. Tente novamente em 15 minutos." }
```

- Headers `RateLimit-*` (RFC 6585) habilitados para clientes respeitarem o limite
- Header `Retry-After` indica quando pode tentar novamente

---

## 6. Segregação de Redes

### Topologia VPC (3-tier)

```
VPC: 10.0.0.0/16
│
├── PUBLIC SUBNETS (10.0.1.0/24, 10.0.2.0/24) — us-east-1a, 1b
│   ├── ALB (Security Group: accept 443/80 from 0.0.0.0/0)
│   └── NAT Gateway (EIP — saída para internet dos private subnets)
│
├── PRIVATE SUBNETS (10.0.11.0/24, 10.0.12.0/24)
│   └── ECS Fargate (Security Group: accept :3333 from ALB SG only)
│       └── Outbound via NAT (443 only — Stripe, HIBP, etc.)
│
└── DB SUBNETS (10.0.21.0/24, 10.0.22.0/24)
    └── RDS PostgreSQL (Security Group: accept :5432 from App SG only)
        └── SEM rota para internet (route table vazia)
```

### Regras de Security Group (Princípio do Menor Privilégio)

**ALB Security Group:**
- Ingress: TCP 443 (0.0.0.0/0), TCP 80 (0.0.0.0/0)
- Egress: TCP 3333 → App Security Group ONLY

**App Security Group:**
- Ingress: TCP 3333 ← ALB Security Group ONLY
- Egress: TCP 443 (0.0.0.0/0), TCP 5432 → DB Security Group ONLY

**DB Security Group:**
- Ingress: TCP 5432 ← App Security Group ONLY
- Egress: nenhuma regra (DB não inicia conexões)

> **Princípio:** O banco de dados NÃO consegue conectar à internet, mesmo que comprometido.

### VPC Flow Logs

- **Tipo:** ALL (captura ACCEPT e REJECT)
- **Destino:** CloudWatch Logs (criptografado com CMK)
- **Retenção:** 90 dias
- **Uso:** Investigação de incidentes, detecção de movimentação lateral

---

## 7. Secrets Manager

### Arquitetura

```
Desenvolvimento local        Produção (AWS)
─────────────────────        ───────────────
.env (não commitado)         Secrets Manager
process.env                  + KMS CMK
     │                            │
     └─── lib/secrets.ts ─────────┘
              │
           getSecret('JWT_ACCESS_SECRET')
              │
           [cache 5min]
              │
         process.env.JWT_ACCESS_SECRET
```

### Secrets Armazenados

| Secret | Tipo | Rotação |
|---|---|---|
| `DATABASE_URL` | String | Manual (quando RDS password rotaciona) |
| `JWT_ACCESS_SECRET` | String (64 bytes hex) | Manual (coordenar com deploy) |
| `JWT_REFRESH_SECRET` | String (64 bytes hex) | Manual (coordenar com deploy) |
| `ENCRYPTION_KEY` | String (32 bytes hex) | Manual (requer migração de dados) |
| `stripe` | JSON (`{secretKey, webhookSecret}`) | Manual |

### Uso no Código

```typescript
import { getSecret } from './lib/secrets'

// Em controllers/services:
const jwtSecret = await getSecret('JWT_ACCESS_SECRET')

// Em app.ts (startup validation):
await loadAllSecrets()  // falha fast se algum secret está faltando
```

### KMS Customer Managed Key

- **Rotação automática:** anual (AWS gerencia o material de chave)
- **Quem pode descriptografar:** ECS Task Execution Role + ECS App Role ONLY
- **CI/CD:** explicitamente BLOQUEADO de acessar KMS/Secrets

### Regras de Segredo

1. **NUNCA** commitar `.env` com credenciais reais no Git
2. `.env` está no `.gitignore` — verificar antes de todo commit
3. `.env.example` contém apenas placeholders sem valores reais
4. Em produção, NENHUMA variável de ambiente contém secrets — tudo vem do Secrets Manager
5. Logs da aplicação NUNCA devem imprimir o valor de secrets (sanitize antes de logar)

---

## 8. IAM com Least Privilege

### Roles e Permissões

#### `dominahub-production-ecs-task-execution` (ECS Agent)
```
✅ ecr:GetAuthorizationToken, BatchCheckLayerAvailability (pull imagens)
✅ logs:CreateLogStream, PutLogEvents (push logs)
✅ secretsmanager:GetSecretValue (ARNs específicos — não *)
✅ kms:Decrypt (CMK específico)
❌ ec2:*, iam:*, s3:*, rds:* — NÃO PERMITIDO
```

#### `dominahub-production-ecs-task-app` (Runtime da Aplicação)
```
✅ logs:CreateLogStream, PutLogEvents (logs da aplicação)
✅ secretsmanager:GetSecretValue (rotação em runtime)
✅ kms:Decrypt, GenerateDataKey (descriptografar dados)
❌ iam:*, ec2:*, ecr:* — NÃO PERMITIDO
```

#### `dominahub-production-deployment-ci` (GitHub Actions)
```
✅ ecr:PutImage, BatchCheckLayerAvailability (push imagem)
✅ ecs:RegisterTaskDefinition, UpdateService (deploy)
✅ iam:PassRole (para as duas roles acima)
❌ secretsmanager:* — DENY explícito
❌ kms:Decrypt — DENY explícito
```

> **Princípio crítico:** A pipeline de CI/CD **não tem acesso** a secrets de produção.
> Comprometer o CI não equivale a comprometer o banco de dados.

### Autenticação CI/CD sem senhas

O GitHub Actions usa **OIDC** (OpenID Connect) para assumir a role de deploy:

```yaml
# .github/workflows/deploy.yml
permissions:
  id-token: write   # OIDC token
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::ACCOUNT_ID:role/dominahub-production-deployment-ci
      aws-region: us-east-1
```

Nenhuma `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` armazenada em GitHub Secrets.

### Verificação

```bash
# Verificar permissões efetivas da role de deploy
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT_ID:role/dominahub-production-deployment-ci \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:dominahub-production/jwt-access-secret*"
# → esperado: DENY
```

---

## 9. Proteção contra DDoS

### Camadas de Proteção

| Nível | Tecnologia | Cobertura |
|---|---|---|
| L3/L4 | AWS Shield Standard (gratuito, incluso) | Volumétrico, SYN flood, UDP reflection |
| L7 | AWS WAF Rate Limiting | HTTP flood, slowloris |
| L7 | Express rate limiters | Por IP + por usuário autenticado |
| L7 | ALB connection limits | Conexões simultâneas |

### AWS Shield Advanced (Opcional — recomendado para produção)

Se o volume de usuários justificar (~$3.000/mês):
- Proteção proativa gerenciada pela equipe AWS Shield Response Team
- SLA de mitigação para ataques L7
- Credits para custo de auto-scaling durante ataque

### Configurações Anti-DDoS no Express

```typescript
// app.ts — já implementado
app.use(express.json({ limit: '100kb' }))  // payload limit
app.use('/api', apiLimiter)                 // rate limit
app.use(hpp())                              // HPP prevention
```

### Cloudflare (Alternativa ao AWS CloudFront + Shield)

Se optar por Cloudflare:
- Habilite: DDoS Managed Ruleset (L3/L4/L7)
- Habilite: Bot Fight Mode
- Configure: WAF com regras OWASP
- Habilite: Rate Limiting (equivalente ao WAF custom rules acima)
- **Custo:** Plano Pro ($20/mês) cobre a maioria dos casos para o estágio V0

### Runbook — Resposta a DDoS

1. **Detectar:** CloudWatch Alarm → `AWS/WAFV2 BlockedRequests > 500/min`
2. **Escalar:** AWS Auto Scaling responde automaticamente ao CPU/req
3. **Bloquear IPs:** Adicionar regra WAF custom para bloquear CIDR do atacante
4. **Comunicar:** Status page (statuspage.io ou similar) → informar usuários

---

## 10. Zero Trust Architecture

### Princípios Aplicados

> "Never trust, always verify" — nenhuma identidade tem acesso implícito por estar "dentro da rede".

#### 1. Identity-First Access

Cada componente (usuário, service, CI/CD) tem identidade verificável:

| Entidade | Identidade | Verificação |
|---|---|---|
| Usuário | JWT access token (15min) + refresh token | Signed HS256, verificado em cada request |
| ECS Task | IAM Role (assumida automaticamente) | AWS STS credentials rotacionadas |
| CI/CD | OIDC token do GitHub | Token temporário, scope por repositório |
| Admin humano | IAM User + MFA obrigatório | Console AWS só com MFA |

#### 2. Micro-segmentação

```
ALB → App: Security Group (port 3333 only)
App → DB:  Security Group (port 5432 only)
App → Internet: NAT Gateway (port 443 only)
DB → *: nenhuma conexão sainte
```

#### 3. Least Privilege em Tudo

- IAM roles com permissões mínimas (descrito na seção 8)
- RDS user `fintrack` — só tem CRUD nas tabelas da aplicação (não é superuser)
- ECS task não pode modificar sua própria infrastructure

#### 4. Assume Breach (Nunca confiar no "dentro")

- VPC Flow Logs capturam TODA comunicação (incluindo intra-VPC)
- CloudTrail registra TODA chamada à API AWS
- Logs da aplicação incluem `userId`, `IP`, `userAgent` em cada request
- Secrets não são passados como variáveis de ambiente plain-text — sempre via Secrets Manager

#### 5. Continuous Verification

- Tokens de acesso JWT com TTL de 15 minutos (refresh obrigatório)
- Refresh tokens com TTL de 30 dias, mas revogáveis individualmente
- Sessões listadas e revogáveis pelo usuário (`GET /api/v1/auth/sessions`)
- MFA disponível para todos os usuários

#### 6. Criptografia em Todo Lugar (Encryption Everywhere)

| Dado | Onde | Como |
|---|---|---|
| Dados em trânsito | ALB → Internet | TLS 1.2/1.3 |
| Dados em trânsito | App → RDS | TLS (PostgreSQL `sslmode=require`) |
| Dados em repouso (RDS) | AWS RDS | AES-256 (CMK) |
| Dados em repouso (S3) | WAF logs, ALB logs | AES-256 (CMK) |
| Secrets | Secrets Manager | AES-256 (CMK) |
| Anexos de transações | DB `dataUrl` field | `lib/encryption.ts` (AES-256-GCM) |
| Backups RDS | AWS automated backups | AES-256 (CMK) |

---

## 11. Runbooks de Segurança

### Rotação de JWT Secret

```bash
# 1. Gerar novo secret
NEW_SECRET=$(openssl rand -hex 64)

# 2. Atualizar no Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id dominahub-production/jwt-access-secret \
  --secret-string "$NEW_SECRET"

# 3. Fazer deploy da nova task definition (para limpar cache de 5min)
# Após deploy, todos os tokens antigos ainda são válidos até expirarem (15min)
# Não é necessário invalidar sessões — rotação gradual

# 4. Verificar no CloudWatch que novos logins funcionam corretamente
```

### Resposta a Incidente de Credencial Vazada

```bash
# 1. Revogar todas as sessões do usuário afetado
# Via API: DELETE /api/v1/auth/sessions (requer accessToken do usuário OU admin)

# 2. Forçar reset de senha
# Via admin: atualizar campo passwordHash no DB + enviar email

# 3. Se for credencial de infra (IAM key): desativar imediatamente
aws iam update-access-key --access-key-id AKIA... --status Inactive

# 4. Verificar CloudTrail para ações feitas com a credencial comprometida
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA...
```

### Verificação de Segurança Semanal

```bash
# Verificar se há segredos hardcoded no código
git log --all --full-history -- "*.env" "*.env.*"
grep -r "sk_live\|whsec_\|postgresql://" backend/src/ --include="*.ts"

# Verificar certificado TLS
echo | openssl s_client -connect app.dominahub.com.br:443 2>/dev/null | \
  openssl x509 -noout -dates
# notAfter deve ser > 30 dias

# Verificar headers de segurança
curl -I https://app.dominahub.com.br/api/health | grep -E "Strict-Transport|Content-Security|X-Frame|X-Content-Type"
```

---

## 12. Matriz de Responsabilidades

| Controle | Responsável | Frequência de Revisão |
|---|---|---|
| Certificado TLS (renovação) | AWS ACM (automático) | — |
| WAF regras OWASP | AWS Managed (automático) | Mensal |
| Rate limit (thresholds) | Dev Team | Semestral |
| Rotação JWT secrets | Dev Team | Anual ou após suspeita |
| Rotação encryption key | Dev Team | Anual (com migração) |
| Rotação DB password | Dev Team | Trimestral |
| Revisão IAM roles | Dev Team | Semestral |
| Revisão VPC Security Groups | Dev Team | Semestral |
| Análise VPC Flow Logs | Dev Team | Após incidente |
| Pen test externo | Terceiros | Anual |
| OWASP Top 10 review | Dev Team | A cada major release |

---

## Referências

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
- [PCI DSS v4.0 Requirements](https://www.pcisecuritystandards.org/)
- [NIST Zero Trust Architecture (SP 800-207)](https://csrc.nist.gov/publications/detail/sp/800/207/final)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- Código fonte:
  - [`infra/terraform/`](../infra/terraform/) — Infrastructure as Code
  - [`infra/nginx/nginx.conf`](../infra/nginx/nginx.conf) — TLS + reverse proxy
  - [`backend/src/lib/secrets.ts`](../backend/src/lib/secrets.ts) — Secrets Manager client
  - [`backend/src/app.ts`](../backend/src/app.ts) — Security middleware
  - [`backend/src/middlewares/rateLimiter.ts`](../backend/src/middlewares/rateLimiter.ts) — Rate limiting
