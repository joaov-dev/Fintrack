# DominaHub — Plano de Resposta a Incidentes

> **Versão:** 1.0 | **Data:** 2026-03-04 | **Classificação:** Confidencial

---

## Sumário

1. [Papéis e Responsabilidades](#1-papéis-e-responsabilidades)
2. [Severidades e SLAs](#2-severidades-e-slas)
3. [Processo Geral de Resposta](#3-processo-geral-de-resposta)
4. [Playbook 1 — Brute Force / Credential Stuffing](#4-playbook-1--brute-force--credential-stuffing)
5. [Playbook 2 — Scraping / Data Exfiltration](#5-playbook-2--scraping--data-exfiltration)
6. [Playbook 3 — Sessão Comprometida / Acesso Não Autorizado](#6-playbook-3--sessão-comprometida--acesso-não-autorizado)
7. [Playbook 4 — Vazamento de Credencial de Infraestrutura](#7-playbook-4--vazamento-de-credencial-de-infraestrutura)
8. [Playbook 5 — Injeção SQL / Exploração de Aplicação](#8-playbook-5--injeção-sql--exploração-de-aplicação)
9. [Playbook 6 — DDoS / Degradação de Serviço](#9-playbook-6--ddos--degradação-de-serviço)
10. [Playbook 7 — Comprometimento de Conta de Usuário](#10-playbook-7--comprometimento-de-conta-de-usuário)
11. [Playbook 8 — Exclusão em Massa de Dados (CLEAR_ACCOUNT_DATA)](#11-playbook-8--exclusão-em-massa-de-dados)
12. [Comunicação e Notificação](#12-comunicação-e-notificação)
13. [Ferramentas de Investigação](#13-ferramentas-de-investigação)
14. [Pós-Incidente](#14-pós-incidente)

---

## 1. Papéis e Responsabilidades

| Papel | Responsável | Contato |
|---|---|---|
| **Incident Commander (IC)** | Engineering Lead | Slack #incidentes |
| **SecOps Engineer** | Dev On-Call | PagerDuty |
| **Comunicação Jurídica** | DPO (LGPD) | email direto |
| **Comunicação Usuários** | Product Owner | Status Page |

**Regra:** O IC coordena tudo. Nenhuma ação de contenção é tomada sem confirmação do IC, exceto nos primeiros 5 minutos de um incidente Crítico.

---

## 2. Severidades e SLAs

| Severidade | Definição | Tempo de Resposta | Tempo de Contenção |
|---|---|---|---|
| **P1 — Crítico** | Dados de usuários expostos, serviço indisponível, credencial de infra vazada | 15 min | 2 horas |
| **P2 — Alto** | Ataque em andamento (brute force, scraping), anomalia confirmada | 30 min | 4 horas |
| **P3 — Médio** | Comportamento suspeito não confirmado, alerta de anomalia | 2 horas | 24 horas |
| **P4 — Baixo** | Configuração subótima, melhoria preventiva | Próximo sprint | — |

---

## 3. Processo Geral de Resposta

```
DETECT → TRIAGE → CONTAIN → INVESTIGATE → ERADICATE → RECOVER → POST-INCIDENT
```

### 3.1 DETECT
**Fontes de alerta:**
- CloudWatch Alarm → SNS → Email / PagerDuty
- Usuário reporta comportamento estranho
- Time jurídico / regulatório reporta

**Primeira ação:** Abrir canal `#inc-YYYYMMDD-<tipo>` no Slack e designar IC.

### 3.2 TRIAGE (≤15 min para P1/P2)
1. Confirmar se o alarme é real ou falso positivo
2. Determinar severidade (P1–P4)
3. Identificar blast radius (quantos usuários afetados, quais dados)
4. Acionar playbook correspondente

### 3.3 CONTAIN
- Ações imediatas para parar o dano (bloquear IP, revogar sessão, etc.)
- **Preservar evidências ANTES de qualquer cleanup**
- Documentar cada ação com timestamp no canal do incidente

### 3.4 INVESTIGATE
- Usar queries CloudWatch Insights (seção 13) para correlacionar eventos
- Timeline dos eventos com requestId
- Identificar vetor de entrada

### 3.5 ERADICATE
- Remover o vetor de entrada (patch, configuração)
- Revogar credenciais comprometidas
- Notificar usuários afetados se necessário

### 3.6 RECOVER
- Restaurar operação normal
- Validar que a mitigação é efetiva (monitorar 24h)
- Comunicar resolução

### 3.7 POST-INCIDENT
- Postmortem em 5 dias úteis (ver seção 14)
- Atualizar playbooks se necessário

---

## 4. Playbook 1 — Brute Force / Credential Stuffing

**Trigger:** Alarme `dominahub-production-credential-stuffing` ou `dominahub-production-auth-failure-rate`

**Indicadores:**
- >15 falhas de auth de um mesmo IP em 5 min
- Múltiplas contas tentadas com mesma senha
- Sequência de `LOGIN_FAIL` no `auth_events` com emails diferentes

### Passos

```bash
# 1. Confirmar o ataque — identificar o IP atacante
aws logs start-query \
  --log-group-name /aws/ecs/dominahub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, ip, userId, detail
    | filter message = "ANOMALY" and type = "CREDENTIAL_STUFFING"
    | sort @timestamp desc
    | limit 20
  '
# Anote o(s) IP(s) atacante(s)

# 2. Verificar volume de contas afetadas
aws logs start-query \
  --log-group-name /aws/ecs/dominahub-production \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, ip, status
    | filter message = "HTTP" and status = 401
    | stats count() as failures by ip
    | sort failures desc
  '
```

```bash
# 3. Bloquear IP no WAF (contenção imediata)
# Criar IP set no WAF e adicionar à ACL
aws wafv2 create-ip-set \
  --name "blocked-ips-incident-$(date +%Y%m%d)" \
  --scope REGIONAL \
  --ip-address-version IPV4 \
  --addresses "1.2.3.4/32"   # substituir com IP real
```

```bash
# 4. Verificar se alguma conta foi comprometida (LOGIN_OK após LOGIN_FAIL em burst)
# Executar no banco de dados:
psql $DATABASE_URL -c "
  SELECT DISTINCT e1.userId, e1.ip, e1.createdAt
  FROM auth_events e1
  WHERE e1.event = 'LOGIN_OK'
    AND e1.createdAt > NOW() - INTERVAL '1 hour'
    AND EXISTS (
      SELECT 1 FROM auth_events e2
      WHERE e2.event = 'LOGIN_FAIL'
        AND e2.ip = e1.ip
        AND e2.createdAt > NOW() - INTERVAL '1 hour'
      GROUP BY e2.ip HAVING COUNT(*) >= 5
    );
"
```

```bash
# 5. Para cada userId comprometido confirmado — revogar todas as sessões
psql $DATABASE_URL -c "
  UPDATE sessions
  SET \"revokedAt\" = NOW()
  WHERE \"userId\" = 'USER_ID_AQUI'
    AND \"revokedAt\" IS NULL;
"
```

**Notificação:** Se contas comprometidas → acionar Playbook 7 para cada usuário.

**Resolução:** Bloquear CIDR atacante no WAF, considerar habilitar CAPTCHA no login, monitorar 24h.

---

## 5. Playbook 2 — Scraping / Data Exfiltration

**Trigger:** Alarme `dominahub-production-scraping` ou `dominahub-production-bulk-data-access`

**Indicadores:**
- >120 req/min de um IP
- Usuário autenticado fazendo >30 chamadas de listagem por minuto
- Padrão sequencial de IDs nos logs (enumeração)

### Passos

```bash
# 1. Identificar o atacante
aws logs start-query --log-group-name /aws/ecs/dominahub-production \
  --start-time $(date -d '30 minutes ago' +%s) --end-time $(date +%s) \
  --query-string '
    fields @timestamp, type, ip, userId, endpoint, reqPerMin, detail
    | filter message = "ANOMALY" and (type = "SCRAPING" or type = "BULK_DATA_ACCESS")
    | sort @timestamp desc
  '

# 2. Calcular volume de dados potencialmente exfiltrados
# Para scraping autenticado, verificar no banco:
psql $DATABASE_URL -c "
  SELECT COUNT(*), resource
  FROM audit_logs
  WHERE \"userId\" = 'USER_ID_AQUI'
    AND action LIKE '%_READ%'
    AND \"createdAt\" > NOW() - INTERVAL '1 hour'
  GROUP BY resource;
"

# 3. Containment — bloquear IP ou suspender sessão do usuário
# Para IP não autenticado → bloquear no WAF (ver passo 3 do Playbook 1)
# Para usuário autenticado → revogar sessão
psql $DATABASE_URL -c "
  UPDATE sessions SET \"revokedAt\" = NOW()
  WHERE \"userId\" = 'USER_ID_AQUI' AND \"revokedAt\" IS NULL;
"
```

**Avaliação de impacto:** Verificar se dados coletados incluem PII (nomes, emails, dados bancários). Se sim → LGPD Art. 48 obriga notificação à ANPD em 72h.

---

## 6. Playbook 3 — Sessão Comprometida / Acesso Não Autorizado

**Trigger:** Alarme `dominahub-production-session-ip-shift` ou report de usuário

**Indicadores:**
- Sessão ativa acessada de IP inesperado (país diferente, ASN diferente)
- Usuário reporta ações que não realizou
- Refresh token usado de IP nunca visto

### Passos

```bash
# 1. Investigar sessões do usuário
psql $DATABASE_URL -c "
  SELECT id, \"ipAddress\", \"userAgent\", \"createdAt\", \"lastUsedAt\", \"revokedAt\"
  FROM sessions
  WHERE \"userId\" = 'USER_ID_AQUI'
  ORDER BY \"createdAt\" DESC;
"

# 2. Ver ações recentes do usuário nos logs
aws logs start-query --log-group-name /aws/ecs/dominahub-production \
  --start-time $(date -d '24 hours ago' +%s) --end-time $(date +%s) \
  --query-string '
    fields @timestamp, method, path, status, ip, requestId
    | filter userId = "USER_ID_AQUI"
    | sort @timestamp desc
    | limit 200
  '

# 3. Revogar TODAS as sessões do usuário (força reautenticação)
psql $DATABASE_URL -c "
  UPDATE sessions
  SET \"revokedAt\" = NOW()
  WHERE \"userId\" = 'USER_ID_AQUI' AND \"revokedAt\" IS NULL;
"

# 4. Verificar se dados foram modificados/deletados
psql $DATABASE_URL -c "
  SELECT action, resource, \"resourceId\", ip, \"createdAt\", before, after
  FROM audit_logs
  WHERE \"userId\" = 'USER_ID_AQUI'
    AND action IN ('TRANSACTION_DELETE', 'ACCOUNT_DELETE', 'CLEAR_ACCOUNT_DATA')
    AND \"createdAt\" > NOW() - INTERVAL '24 hours';
"
```

**Ação:** Notificar usuário por email explicando o ocorrido e instruindo a trocar senha e habilitar MFA.

---

## 7. Playbook 4 — Vazamento de Credencial de Infraestrutura

**Trigger:** Alerta de GitHub Secret Scanning, notificação interna, ou comportamento incomum no CloudTrail

**Indicadores:**
- IAM key usada de IP/região incomum no CloudTrail
- Acesso ao Secrets Manager por principal inesperado
- Repository scan detectou credencial no código

### Passos

```bash
# 1. IMEDIATO (< 5 minutos) — Desativar a credencial comprometida
# Para IAM Access Key:
aws iam update-access-key \
  --access-key-id AKIA_COMPROMETIDA \
  --status Inactive

# Para secret no Secrets Manager — rotacionar imediatamente:
NEW_SECRET=$(openssl rand -hex 64)
aws secretsmanager put-secret-value \
  --secret-id dominahub-production/jwt-access-secret \
  --secret-string "$NEW_SECRET"

# 2. Investigar ações feitas com a credencial comprometida
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA_COMPROMETIDA \
  --start-time $(date -d '7 days ago' -u +"%Y-%m-%dT%H:%M:%SZ") \
  --end-time $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 3. Verificar se dados de produção foram acessados/copiados
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA_COMPROMETIDA \
  | jq '.Events[] | select(.EventName | test("Get|Describe|List|Download"))'

# 4. Revogar todas as sessões de usuário (por precaução, se JWT secret comprometido)
# → Re-deploy do ECS com novo secret é suficiente (invalida todos os JWTs existentes)
aws ecs update-service \
  --cluster dominahub-production \
  --service dominahub-production \
  --force-new-deployment

# 5. Verificar CloudTrail por outros acessos suspeitos na mesma janela temporal
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --start-time $(date -d '7 days ago' -u +"%Y-%m-%dT%H:%M:%SZ")
```

**LGPD:** Se dados de usuários foram acessados → notificação à ANPD em 72h obrigatória.

---

## 8. Playbook 5 — Injeção SQL / Exploração de Aplicação

**Trigger:** WAF bloqueando requests com padrão SQLi, anomalia no log de erros da aplicação

**Indicadores:**
- WAF logs mostram `AWSManagedRulesSQLiRuleSet` bloqueando requests
- Erros Prisma incomuns nos logs (`Raw query failed`)
- Response times anômalos em endpoints específicos

### Passos

```bash
# 1. Identificar o endpoint alvo e o payload
# WAF logs ficam em S3 — consultar via Athena ou aws s3 cp:
aws s3 cp s3://dominahub-production-waf-logs-ACCOUNT_ID/alb/ ./waf-logs/ --recursive \
  --include "*.gz" && gunzip -r ./waf-logs/

# Nos logs de aplicação:
aws logs start-query --log-group-name /aws/ecs/dominahub-production \
  --start-time $(date -d '2 hours ago' +%s) --end-time $(date +%s) \
  --query-string '
    fields @timestamp, level, message, path, requestId, @message
    | filter level = "error" and message = "Unhandled server error"
    | sort @timestamp desc
  '

# 2. Verificar se alguma query escapou do WAF — auditar Prisma queries nos logs
# (O app usa Prisma ORM com prepared statements — baixa probabilidade, mas verificar)

# 3. Se exploração confirmada: isolar o endpoint afetado via ALB listener rule
aws elbv2 create-rule \
  --listener-arn ARN_DO_LISTENER_HTTPS \
  --conditions Field=path-pattern,Values='/api/v1/endpoint-afetado*' \
  --priority 1 \
  --actions Type=fixed-response,FixedResponseConfig='{StatusCode=503,MessageBody="Maintenance"}'

# 4. Verificar integridade dos dados afetados
psql $DATABASE_URL -c "
  SELECT * FROM audit_logs
  WHERE resource = 'RECURSO_AFETADO'
    AND action NOT LIKE '%_READ%'
    AND \"createdAt\" > NOW() - INTERVAL '6 hours'
  ORDER BY \"createdAt\" DESC;
"
```

---

## 9. Playbook 6 — DDoS / Degradação de Serviço

**Trigger:** Alarme `dominahub-production-no-healthy-hosts` ou latência P99 > 5s

**Indicadores:**
- ALB HealthyHostCount = 0
- ECS tasks crashando repetidamente
- CPU/memória das tasks em 100%

### Passos

```bash
# 1. Verificar status do serviço ECS
aws ecs describe-services \
  --cluster dominahub-production \
  --services dominahub-production

# 2. Ver logs das tasks que falharam
aws ecs list-tasks --cluster dominahub-production --desired-status STOPPED | \
  jq '.taskArns[]' | head -5 | xargs -I{} \
  aws ecs describe-tasks --cluster dominahub-production --tasks {}

# 3. Se for DDoS volumétrico — acionar AWS Shield Response Team (se Shield Advanced)
aws shield create-protection-group \
  --protection-group-id dominahub-production \
  --aggregation SUM --pattern ALL

# 4. Escalar horizontalmente para absorver tráfego legítimo
aws ecs update-service \
  --cluster dominahub-production \
  --service dominahub-production \
  --desired-count 10  # aumentar temporariamente

# 5. Adicionar regra WAF de rate limit mais agressiva durante o ataque
aws wafv2 update-rule-group \
  --name dominahub-ddos-mitigation \
  --scope REGIONAL \
  # (ajustar limite para 100 req/5min temporariamente)

# 6. Se necessário — habilitar modo de manutenção (serve static HTML)
# Redirecionar ALB para um target group com página estática de manutenção
```

---

## 10. Playbook 7 — Comprometimento de Conta de Usuário

**Trigger:** Reporte do usuário, detecção interna de anomalia, resultado do Playbook 1

### Passos

```bash
# 1. Revogar todas as sessões
psql $DATABASE_URL -c "
  UPDATE sessions SET \"revokedAt\" = NOW()
  WHERE \"userId\" = 'USER_ID' AND \"revokedAt\" IS NULL;
"

# 2. Verificar danos — ações realizadas pela conta durante o comprometimento
psql $DATABASE_URL -c "
  SELECT a.action, a.resource, a.\"resourceId\", a.ip, a.\"createdAt\"
  FROM audit_logs a
  WHERE a.\"userId\" = 'USER_ID'
    AND a.\"createdAt\" BETWEEN 'INICIO_COMPROMETIMENTO' AND 'FIM_COMPROMETIMENTO'
  ORDER BY a.\"createdAt\" ASC;
"

# 3. Ver transações criadas/deletadas no período
psql $DATABASE_URL -c "
  SELECT id, type, amount, description, \"createdAt\", \"updatedAt\"
  FROM transactions
  WHERE \"userId\" = 'USER_ID'
    AND \"createdAt\" > 'INICIO_COMPROMETIMENTO'
  ORDER BY \"createdAt\" DESC;
"

# 4. Forçar reset de senha (backend — atualizar hash)
# Via admin script (nunca setar a senha diretamente — sempre via bcrypt):
# node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NOVA_SENHA_TEMP', 12).then(h => console.log(h))"
# Depois: UPDATE users SET "passwordHash" = 'HASH' WHERE id = 'USER_ID';
```

**Comunicação ao usuário:**
```
Assunto: Ação de segurança na sua conta DominaHub

Detectamos acesso suspeito à sua conta em [DATA/HORA].
Por precaução, encerramos todas as suas sessões ativas.

AÇÕES NECESSÁRIAS:
1. Acesse dominahub.com.br e redefina sua senha
2. Ative a autenticação de dois fatores (MFA)
3. Revise suas transações das últimas 24h

Se precisar de ajuda: suporte@dominahub.com.br
```

---

## 11. Playbook 8 — Exclusão em Massa de Dados

**Trigger:** Alarme `dominahub-production-destructive-action`

### Passos

```bash
# 1. Identificar a ação e o usuário
psql $DATABASE_URL -c "
  SELECT * FROM audit_logs
  WHERE action = 'CLEAR_ACCOUNT_DATA'
    AND \"createdAt\" > NOW() - INTERVAL '1 hour';
"

# 2. Verificar se foi intencional (verificar auth_events do mesmo requestId)
psql $DATABASE_URL -c "
  SELECT * FROM auth_events
  WHERE metadata::text LIKE '%REQUEST_ID_AQUI%';
"

# 3. Se for ataque (credencial comprometida fazendo mass deletion) → revogar sessão
# (ver Playbook 3 passo 3)

# 4. Restauração via backup RDS (point-in-time recovery)
# Criar snapshot do estado atual antes de restaurar:
aws rds create-db-snapshot \
  --db-instance-identifier dominahub-production \
  --db-snapshot-identifier "pre-restore-$(date +%Y%m%d%H%M%S)"

# Restaurar para ponto antes da deleção:
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier dominahub-production \
  --target-db-instance-identifier dominahub-production-restored \
  --restore-time "TIMESTAMP_ANTES_DA_DELECAO"
```

---

## 12. Comunicação e Notificação

### Notificação à ANPD (LGPD Art. 48)

Obrigatória quando:
- Dados pessoais de usuários foram expostos a terceiros não autorizados
- Prazo: **72 horas** após a ciência do incidente

Informações necessárias:
- Data e hora do incidente
- Natureza dos dados afetados
- Número aproximado de titulares afetados
- Medidas de contenção tomadas
- Contato do DPO

Formulário: https://www.gov.br/anpd/

### Status Page

Atualizar `status.dominahub.com.br` (statuspage.io ou similar):
- **Investigando:** "Estamos investigando relatos de lentidão/comportamento incomum"
- **Identificado:** "Identificamos o problema e estamos trabalhando na correção"
- **Resolvido:** "O incidente foi resolvido. Todos os sistemas operando normalmente"

---

## 13. Ferramentas de Investigação

### CloudWatch Insights — Queries Prontas

```sql
-- Rastrear um requestId específico (correlação completa)
fields @timestamp, level, message, requestId, userId, status, ms, path
| filter requestId = "COLE_O_REQUEST_ID_AQUI"
| sort @timestamp asc

-- Todas as ações de um usuário nas últimas 24h
fields @timestamp, method, path, status, ip, requestId
| filter userId = "COLE_O_USER_ID_AQUI"
| sort @timestamp desc
| limit 500

-- Top IPs por volume de requisições (detecção de scraping)
fields @timestamp, ip, method, path
| stats count() as requests by ip
| sort requests desc
| limit 20

-- Correlação de erros com usuário/IP (detecção de exploração)
fields @timestamp, level, message, requestId, path, userId, ip, @message
| filter level = "error"
| sort @timestamp desc
| limit 50

-- Anomalias por tipo na última hora
fields @timestamp, type, severity, ip, userId, detail
| filter message = "ANOMALY"
| stats count() as total by type, severity
| sort total desc
```

### Banco de Dados — Queries de Investigação

```sql
-- Sessões ativas de um usuário
SELECT id, "ipAddress", "userAgent", "createdAt", "lastUsedAt"
FROM sessions
WHERE "userId" = '$1' AND "revokedAt" IS NULL
ORDER BY "lastUsedAt" DESC;

-- Eventos de autenticação recentes
SELECT event, ip, "userAgent", metadata, "createdAt"
FROM auth_events
WHERE "userId" = '$1'
ORDER BY "createdAt" DESC
LIMIT 50;

-- Audit trail completo de uma sessão
SELECT al.action, al.resource, al."resourceId", al.ip, al."createdAt"
FROM audit_logs al
WHERE al."requestId" = '$1'
ORDER BY al."createdAt" ASC;

-- Falhas de login por IP (brute force evidence)
SELECT ip, COUNT(*) as failures, MIN("createdAt") as first_attempt, MAX("createdAt") as last_attempt
FROM login_attempts
WHERE success = FALSE
  AND "createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY ip
HAVING COUNT(*) >= 5
ORDER BY failures DESC;
```

### CloudTrail — Queries AWS API

```bash
# Ações de uma IAM key específica
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA_XXXX

# Todas as chamadas ao Secrets Manager nas últimas 24h
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=secretsmanager.amazonaws.com \
  --start-time $(date -d '24 hours ago' -u +"%Y-%m-%dT%H:%M:%SZ")

# Mudanças em IAM (criação de roles, políticas)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=iam.amazonaws.com \
  --start-time $(date -d '24 hours ago' -u +"%Y-%m-%dT%H:%M:%SZ") \
  | jq '.Events[] | select(.EventName | test("Create|Attach|Put|Delete"))'
```

---

## 14. Pós-Incidente

### Postmortem (obrigatório para P1 e P2)

Documento a ser criado em até **5 dias úteis** após resolução.

**Template:**

```markdown
# Postmortem — [Tipo do Incidente] — [Data]

## Sumário Executivo
[2-3 linhas descrevendo o que aconteceu e o impacto]

## Timeline
| Hora (UTC) | Evento |
|---|---|
| HH:MM | Alerta disparado |
| HH:MM | IC designado |
| HH:MM | Incidente confirmado |
| HH:MM | Contenção aplicada |
| HH:MM | Resolução |

## Causa Raiz
[O que causou o incidente]

## Impacto
- Usuários afetados: N
- Duração: Xh Ymin
- Dados expostos: sim/não (quais)

## O que funcionou bem
- ...

## O que pode melhorar
- ...

## Ações corretivas
| Ação | Responsável | Prazo |
|---|---|---|
| ... | ... | ... |
```

### Lições Aprendidas

Após cada postmortem, avaliar:
1. O alerta chegou rápido o suficiente? Ajustar thresholds se necessário
2. Os playbooks cobriram o cenário? Atualizar este documento
3. A contenção foi eficaz? Adicionar controles preventivos
4. Algum dado foi exposto? Notificar regulatório e usuários

---

*Documento mantido por: Engineering Team | Revisão: Após cada incidente P1/P2, e no mínimo semestralmente*
