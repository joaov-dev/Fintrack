# Supply Chain Security — DominaHub

> **Versão:** 1.0 | **Data:** 2026-03-05

---

## Sumário

1. [Ameaças à Cadeia de Suprimentos](#1-ameaças-à-cadeia-de-suprimentos)
2. [Inventário de Dependências](#2-inventário-de-dependências)
3. [Scan de Vulnerabilidades](#3-scan-de-vulnerabilidades)
4. [Integridade de Pacotes](#4-integridade-de-pacotes)
5. [Lockfiles Obrigatórios](#5-lockfiles-obrigatórios)
6. [Atualizações Controladas (Dependabot)](#6-atualizações-controladas-dependabot)
7. [Pipeline CI/CD Protegido](#7-pipeline-cicd-protegido)
8. [Segredos no CI](#8-segredos-no-ci)
9. [Varredura de Segredos (Gitleaks)](#9-varredura-de-segredos-gitleaks)
10. [SBOM — Software Bill of Materials](#10-sbom--software-bill-of-materials)
11. [Licenças de Software](#11-licenças-de-software)
12. [Runbooks de Resposta](#12-runbooks-de-resposta)

---

## 1. Ameaças à Cadeia de Suprimentos

| Ameaça | Exemplo Real | Contramedida |
|---|---|---|
| **Typosquatting** | `expresss` em vez de `express` | `npm ci` com lockfile + audit |
| **Dependency confusion** | Pacote privado sobrescrito por público | `registry=https://registry.npmjs.org/` no `.npmrc` |
| **Hijacked package** | `event-stream` (2018) | `npm audit signatures` |
| **Malicious lifecycle script** | `postinstall` executa código remoto | `npm ci --ignore-scripts` no CI |
| **Compromised GitHub Action** | Action com tag movida para código malicioso | Pinagem a commit SHA |
| **Secret leakage** | Token commitado acidentalmente | Gitleaks + GitHub Secret Scanning |
| **Vulnerable transitive dep** | `log4j` em deps transitivas | `npm audit` em toda a árvore |
| **Copyleft contamination** | GPL em produção = risco de open-source forçado | License checker automático |

---

## 2. Inventário de Dependências

### 2.1 Workspaces

```
financial-control/
├── package.json             ← root (concurrently)
├── backend/package.json     ← Node.js / Express / Prisma
└── frontend/package.json    ← React / Vite / Radix UI
```

### 2.2 Pacotes Críticos (alto risco — monitorados individualmente)

| Pacote | Workspace | Razão | Responsável por atualizar |
|---|---|---|---|
| `jsonwebtoken` | backend | Autenticação JWT | Manual — revisar changelog |
| `bcryptjs` | backend | Hash de senhas | Manual — revisar changelog |
| `otplib` | backend | TOTP / MFA | Manual — revisar changelog |
| `@prisma/client` / `prisma` | backend | ORM — acesso direto ao DB | Manual — migrations necessárias |
| `stripe` | backend | Pagamentos — PCI DSS | Manual — breaking changes frequentes |
| `@aws-sdk/client-secrets-manager` | backend | Segredos de produção | Dependabot — grouped |
| `helmet` | backend | Headers HTTP de segurança | Manual — revisar defaults |
| `express-rate-limit` | backend | Rate limiting | Manual |
| `zod` | backend | Validação de entrada | Dependabot — grouped |
| `react` / `react-dom` | frontend | Core UI | Manual — major versions |
| `vite` | frontend | Build + dev server | Manual — major versions |

---

## 3. Scan de Vulnerabilidades

### 3.1 Execução local

```bash
# Scan básico (todos os workspaces)
npm run audit

# Scan com threshold e relatório
npm run audit:check

# Verificar assinaturas do registry
npm run audit:signatures

# Tudo junto
npm run security:full
```

### 3.2 Script `scripts/audit-check.mjs`

O script parseia o JSON de `npm audit --json` e:

- Imprime um resumo por severidade (critical, high, moderate, low)
- Lista cada vulnerabilidade que viola o threshold com: pacote, advisory ID, range afetado, e disponibilidade de fix
- Sai com código `1` se houver violações → **bloqueia o CI**
- Suporta `--allow GHSA-xxxx,...` para exceções revisadas com justificativa

**Threshold de falha: `high` e `critical`** (moderate é reportado mas não bloqueia)

### 3.3 Tratamento de vulnerabilidades

```
Vulnerabilidade encontrada
├── fix disponível? → npm audit fix (no workspace afetado)
├── somente major fix? → avaliar atualização manual + testes
├── sem fix? (aguardando patch)
│   ├── severity = moderate → documentar em .audit-exceptions.md
│   └── severity = high/critical → avaliar alternativa ou mitigação (WAF rule, etc.)
└── falso positivo?
    └── adicionar --allow GHSA-xxx com comentário no ci.yml
```

---

## 4. Integridade de Pacotes

### 4.1 Registry assinado

Desde npm 9.0 (Node 20+), o comando `npm audit signatures` verifica se cada pacote instalado possui uma assinatura criptográfica válida emitida pelo registry.

Isso detecta:
- Pacotes injetados em mirrors maliciosos
- Builds substituídos após publicação original

```bash
# Executado automaticamente no CI; também disponível localmente:
npm audit signatures
# Expected output: audited N packages
# All packages have valid registry signatures
```

### 4.2 `package-lock.json` como ancora de integridade

O lockfile armazena o hash SHA-512 de cada pacote:

```json
{
  "integrity": "sha512-abc123.../def456=="
}
```

`npm ci` verifica esse hash antes de instalar. Uma discrepância indica adulteração.

### 4.3 `--ignore-scripts` no CI

No CI, todos os `npm ci` usam `--ignore-scripts`. Isso impede que scripts de ciclo de vida (`preinstall`, `postinstall`, `prepare`) executem código arbitrário durante a instalação.

Exceção: `npx prisma generate` é executado explicitamente e isolado, apenas para gerar os tipos TypeScript do Prisma.

---

## 5. Lockfiles Obrigatórios

### 5.1 Regras impostas

| Regra | Como imposta |
|---|---|
| Lockfile deve existir | `npm ci` falha sem `package-lock.json` |
| Lockfile deve estar em sincronia | `npm ci` falha se `package.json` divergir |
| Novos pacotes usam versão exata | `save-exact=true` no `.npmrc` |
| Lockfile commitado no repositório | `.gitignore` **não** exclui `package-lock.json` |

### 5.2 `.npmrc` configurado

```ini
# Root .npmrc
registry=https://registry.npmjs.org/  ← previne dependency confusion
save-exact=true                        ← pin exato, sem ^
package-lock=true                      ← lockfile sempre mantido
engine-strict=true                     ← falha se Node.js incompatível
prefer-offline=true                    ← usa cache local quando possível
```

### 5.3 Fluxo correto para adicionar dependências

```bash
# ✅ Correto — adiciona exato, atualiza lockfile, sem scripts
cd backend
npm install <pacote> --save-exact --ignore-scripts

# Revisar o diff do lockfile antes de commitar
git diff backend/package-lock.json

# ❌ Errado — instala sem lock (nunca usar em projetos seguros)
npm install --no-package-lock
```

---

## 6. Atualizações Controladas (Dependabot)

### 6.1 Configuração

Arquivo: [`.github/dependabot.yml`](../.github/dependabot.yml)

| Ecosystem | Diretório | Frequência | Agrupamento |
|---|---|---|---|
| npm | `/backend` | Semanal (segunda) | Patch + minor agrupados |
| npm | `/frontend` | Semanal (segunda) | Patch + minor agrupados |
| npm | `/` (root) | Semanal (segunda) | Individual |
| github-actions | `/` | Semanal (terça) | Patch + minor agrupados |

### 6.2 Fluxo de revisão de PR do Dependabot

```
Dependabot abre PR
    ↓
CI executa: lockfile integrity + audit + lint + tests
    ↓
Review manual: changelog, breaking changes, test coverage
    ↓
Para pacotes críticos (auth, crypto, DB): revisor adicional obrigatório
    ↓
Merge → executar `npm run pin:actions` para re-pinhar SHAs de actions
```

### 6.3 Pacotes não agrupados (revisão individual)

Os seguintes pacotes são excluídos do grupo automático e recebem PRs individuais:

`jsonwebtoken`, `bcryptjs`, `otplib`, `prisma`, `@prisma/client`, `stripe`, `@aws-sdk/*`, `helmet`, `express-rate-limit`, `zod`, `react`, `react-dom`, `vite`

---

## 7. Pipeline CI/CD Protegido

### 7.1 Arquitetura do pipeline

```
Push / PR
    ↓
┌─────────────────────────────────────────────────────────────┐
│  ci.yml                                                     │
│                                                             │
│  lockfile ──→ audit ──→ lint ──→ test-unit ──→ build       │
│                   │                   │         ↓           │
│                   └─────────────────────→ sbom (main only) │
│                                                             │
│  test-integration (paralelo, com PostgreSQL service)        │
└─────────────────────────────────────────────────────────────┘
    ↓ (main push ou schedule diário)
┌─────────────────────────────────────────────────────────────┐
│  security.yml                                               │
│                                                             │
│  dependency-review (PRs only)                               │
│  deep-audit + signature verify                              │
│  secret-scan (gitleaks, full history)                       │
│  license-check                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Permissões mínimas do GitHub Token

```yaml
permissions:
  contents: read    # padrão — apenas leitura do repositório
```

Jobs que precisam de mais:
- `audit` job: `pull-requests: write` (para comentar resumo no PR)
- `secret-scan` job: `security-events: write` (para SARIF annotations)

**Nenhum job tem `contents: write` ou `admin` permissions.**

### 7.3 Pinagem de Actions a commit SHA

Todas as Actions de terceiros são referenciadas por commit SHA, não por tag:

```yaml
# ❌ Inseguro — tag pode ser movida a qualquer momento
- uses: actions/checkout@v4

# ✅ Seguro — SHA imutável, código auditável
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
```

Para atualizar SHAs após um upgrade de Action:

```bash
# Resolves todos os `uses:` com tag para SHA + adiciona comentário
GITHUB_TOKEN=ghp_xxx npm run pin:actions

# Verificar antes de aplicar
GITHUB_TOKEN=ghp_xxx npm run pin:actions:dry
```

### 7.4 Princípio de mínimo privilégio para deploy

Deploy para AWS usa **OIDC** (sem credenciais armazenadas):

```yaml
# Na IAM Role de CI (Terraform: infra/terraform/iam.tf)
# A role só existe para:
#   - Push de imagens no ECR
#   - Deploy de serviços no ECS
# DENY explícito em secretsmanager:GetSecretValue
```

O código de aplicação em runtime lê segredos do AWS Secrets Manager via IAM Role da task ECS — nunca via variáveis de ambiente hardcoded.

---

## 8. Segredos no CI

### 8.1 Segredos de CI necessários

Configure no GitHub → Settings → Secrets and variables → Actions:

| Secret | Descrição | Usado em |
|---|---|---|
| `CI_JWT_SECRET` | JWT de teste para integration tests (≥64 chars aleatórios) | `ci.yml` — test-integration |
| `CI_MFA_ENCRYPTION_KEY` | Chave AES-256 para testes (64 hex chars) | `ci.yml` — test-integration |
| `CI_DATA_ENCRYPTION_KEY` | Chave AES-256 para testes (64 hex chars) | `ci.yml` — test-integration |

**Esses segredos são usados APENAS nos testes** — são valores de teste, não de produção.

### 8.2 Segredos de produção

Segredos de produção (JWT, chaves AES, Stripe, DB) estão **exclusivamente** no AWS Secrets Manager:
- Nunca em variáveis de ambiente de servidor
- Nunca em código fonte
- Nunca em `docker-compose.yml` ou Dockerfiles de produção
- Acesso apenas pela IAM Role da ECS Task em runtime

Ver: [docs/security-architecture.md](security-architecture.md) — Seção Secrets Manager

### 8.3 Geração de segredos de CI

```bash
# JWT Secret (128 chars hex)
openssl rand -hex 64

# AES-256-GCM key (64 chars hex = 32 bytes = 256 bits)
openssl rand -hex 32
```

### 8.4 Rotação de segredos

| Segredo | Frequência de rotação | Procedimento |
|---|---|---|
| `CI_JWT_SECRET` | Anual (ou após comprometimento) | Atualizar GitHub Secret → re-run CI |
| `CI_MFA_ENCRYPTION_KEY` | Anual | Atualizar GitHub Secret → re-run CI |
| Segredos de produção | Via AWS Secrets Manager rotation | Automático (RDS) / Manual (JWT, Stripe) |

---

## 9. Varredura de Segredos (Gitleaks)

### 9.1 Configuração

Arquivo: [`.gitleaks.toml`](../.gitleaks.toml)

Gitleaks usa regras built-in (centenas de padrões para provedores de nuvem, tokens de API, chaves privadas) + regras personalizadas para o DominaHub:

| Regra customizada | Detecta |
|---|---|
| `dominahub-jwt-secret` | `JWT_SECRET=...` hardcoded |
| `dominahub-mfa-key` | Chaves AES hexadecimais de 64 chars |
| `dominahub-database-url` | `postgresql://user:pass@host/db` |
| `dominahub-stripe-secret` | `sk_live_*` e `sk_test_*` |
| `dominahub-stripe-webhook` | `whsec_*` |
| `dominahub-bcrypt-hash` | Hash bcrypt commitado |
| `dominahub-private-key-pem` | Chaves PEM |
| `dominahub-totp-secret` | Segredos TOTP base32 |

### 9.2 Execução

```bash
# Escanear todo o histórico do repositório
npm run secret:scan

# Verificar apenas staged changes (pre-commit)
npm run secret:protect

# Em CI (automatic, via security.yml)
# Escaneia histórico completo com fetch-depth: 0
```

### 9.3 Integração como git hook (recomendado)

```bash
# Instalar o hook localmente (exige gitleaks instalado)
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
gitleaks protect --config .gitleaks.toml --staged -v
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Gitleaks detectou possível segredo. Commit bloqueado."
  echo "   Remova o segredo e tente novamente."
  echo "   Para detalhes: gitleaks protect --staged --verbose"
  exit 1
fi
EOF
chmod +x .git/hooks/pre-commit
```

### 9.4 Se um segredo vazar

```bash
# 1. ROTACIONAR o segredo IMEDIATAMENTE (antes de qualquer outra coisa)
#    → AWS Console / Stripe Dashboard / GitHub Settings

# 2. Remover do histórico git
git filter-repo --path <arquivo> --invert-paths  # ou BFG Repo Cleaner

# 3. Force push (exige aprovação do team lead)
git push --force-with-lease

# 4. Todos os colaboradores precisam re-clonar o repositório

# 5. Registrar o incidente como breach se o segredo era de produção
#    → POST /api/v1/privacy/breaches (BreachRecord LGPD)
```

---

## 10. SBOM — Software Bill of Materials

### 10.1 O que é e por que importa

O SBOM é um inventário estruturado de todas as dependências (diretas e transitivas) com versões exatas e licenças. É essencial para:

- **Resposta a incidentes**: identificar imediatamente se uma nova CVE afeta o projeto
- **Compliance**: exigido por regulamentações como EO 14028 (EUA) e crescente pressão da ANPD
- **Auditoria de fornecedores**: evidência para SOC2, ISO 27001

### 10.2 Geração

```bash
# Formato CycloneDX (compatível com Dependency-Track, OWASP)
npm run sbom
# → sbom-backend.json
# → sbom-frontend.json
```

Em produção, SBOMs são gerados automaticamente a cada push em `main` e armazenados como artifacts no GitHub Actions por 90 dias.

### 10.3 Consultar o SBOM

```bash
# Listar todos os pacotes com versão
cat sbom-backend.json | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin'));
d.components.forEach(c => console.log(c.name + '@' + c.version));
"

# Verificar se Log4j (exemplo) está presente
grep -i 'log4j' sbom-backend.json
```

---

## 11. Licenças de Software

### 11.1 Licenças permitidas

Verificação automática em `security.yml` (job `license-check`):

| Licença | Status | Razão |
|---|---|---|
| MIT | ✅ Permitida | Permissiva, compatível com SaaS |
| Apache-2.0 | ✅ Permitida | Permissiva, inclui concessão de patente |
| ISC | ✅ Permitida | Similar ao MIT |
| BSD-2-Clause / BSD-3-Clause | ✅ Permitidas | Permissivas |
| 0BSD, Unlicense, CC0-1.0 | ✅ Permitidas | Domínio público efetivo |
| CC-BY-3.0 / CC-BY-4.0 | ✅ Permitidas | Attribution only |
| GPL-2.0 / GPL-3.0 | ❌ **Bloqueada** | Copyleft — contamina código proprietário |
| AGPL-1.0 / AGPL-3.0 | ❌ **Bloqueada** | Copyleft agressivo — inclui uso em rede |
| LGPL (qualquer versão) | ❌ **Bloqueada** | Copyleft fraco — risco em SaaS |

### 11.2 Verificação local

```bash
# Requer: npm install -g license-checker
cd backend
license-checker --production --onlyAllow "MIT;Apache-2.0;ISC;BSD-2-Clause;BSD-3-Clause;0BSD"
```

---

## 12. Runbooks de Resposta

### 12.1 CVE crítica em dependência direta

```
1. npm audit fix --workspace backend (ou frontend)
   → se não disponível: avaliar alternativa de pacote

2. Rodar test:all localmente
   → se testes passarem: abrir PR, CI valida, merge

3. Se não houver fix:
   → Adicionar WAF rule temporária para mitigar o vetor de ataque
   → Documentar em docs/vulnerability-exceptions.md com:
      - CVE ID
      - Data de descoberta
      - Mitigação aplicada
      - Data estimada do fix upstream
```

### 12.2 Segredo comprometido no repositório

```
1. IMEDIATAMENTE rotacionar o segredo no sistema de origem
   (AWS Secrets Manager / Stripe / GitHub)

2. Revogar TODAS as sessões ativas se o segredo era JWT_SECRET
   → Executar no DB: UPDATE sessions SET revoked_at = now()

3. Limpar o histórico git:
   git filter-repo --replace-text <(echo "SEGREDO==>REDACTED")
   git push --force-with-lease origin main

4. Todos os colaboradores: git fetch + git reset --hard origin/main

5. Verificar logs de auditoria (auth_events) por uso do token comprometido
   → SELECT * FROM auth_events WHERE created_at > '<data_do_commit>'

6. Registrar como breach se dados de usuário foram expostos
```

### 12.3 Action comprometida no CI

```
1. Identificar qual commit SHA está comprometido
   → Verificar o diff no repositório da Action

2. Desabilitar o workflow imediatamente:
   → Renomear o arquivo para *.yml.disabled ou comentar o trigger

3. Verificar se o runner executou código malicioso:
   → Revisar logs do GitHub Actions
   → Verificar se GITHUB_TOKEN foi exfiltrado
   → Verificar se secrets foram acessados

4. Atualizar a Action para uma versão não comprometida:
   GITHUB_TOKEN=xxx npm run pin:actions

5. Re-habilitar o workflow e re-executar

6. Rotacionar TODOS os secrets acessíveis pelo CI
```

---

## Referências

- [SLSA Framework](https://slsa.dev/) — Supply-chain Levels for Software Artifacts
- [OpenSSF Scorecard](https://scorecard.dev/) — Security health metrics para repositórios
- [npm Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html) — OWASP
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Gitleaks Documentation](https://gitleaks.io/)
- [CycloneDX SBOM Standard](https://cyclonedx.org/)

---

## Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 2026-03-05 | Criação inicial |
