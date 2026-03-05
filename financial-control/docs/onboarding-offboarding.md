# Onboarding e Offboarding Seguro — DominaHub

> **Classificação:** Interno — RH + CISO
> **Versão:** 1.0 | **Data:** 2026-03-05
> **Dono:** RH (processo) + CISO (segurança)

---

## Princípios

**Onboarding:** Acesso mínimo inicial, expandido conforme necessidade demonstrada. Nunca conceder tudo de uma vez "para não perder tempo depois".

**Offboarding:** Segurança executa revoções no **mesmo dia** da comunicação de desligamento, independente do período de aviso prévio. O colaborador pode continuar trabalhando durante o aviso — apenas com os acessos que serão progressivamente reduzidos.

---

## Parte 1 — ONBOARDING

### Linha do Tempo

```
D-7 (pré-admissão)
├── RH envia formulário de boas-vindas + NDA para assinatura
├── RH solicita ao DevOps: criação de conta Google Workspace
└── CISO verifica se cargo requer verificação de antecedentes (Nível 3+)

D-1 (dia anterior)
├── DevOps: conta Google Workspace ativa, senha temporária enviada via canal seguro
├── DevOps: acesso ao Slack (workspace #geral, #dev, #produto)
└── RH: agenda sessão de onboarding de segurança para Semana 1

D0 (primeiro dia)
├── Assinatura de: Contrato CLT/PJ + NDA + Aceite da Política de Segurança
├── Entrega de dispositivo corporativo (se aplicável) + inventário registrado
├── Sessão de boas-vindas: apresentação do time, cultura, canais de comunicação
└── INÍCIO dos acessos de Nível 1 (ver checklist abaixo)

Semana 1
├── Treinamentos obrigatórios: Política de Segurança + LGPD (assíncrono)
├── Setup de MFA em todos os sistemas com acesso
├── Setup do gerenciador de senhas (1Password)
└── Sessão presencial/remota com Security Champion do time

Semana 2-4
├── Solicitar acessos adicionais conforme necessidade real (com justificativa)
└── Verificação de que treinamentos foram concluídos
```

---

### Checklist de Onboarding por Papel

#### Checklist Base (TODOS os colaboradores)

**RH — executa:**
- [ ] Contrato assinado (CLT, PJ ou estágio)
- [ ] NDA / Acordo de Confidencialidade assinado
- [ ] Aceite formal da Política de Segurança (versão datada)
- [ ] Aceite formal da Política de Privacidade interna
- [ ] Verificação de antecedentes (se Nível 3+)
- [ ] Inventário de dispositivo corporativo entregue (IMEI, serial, MAC)
- [ ] Registro no sistema de RH com data de início e cargo

**DevOps — executa:**
- [ ] Conta Google Workspace criada (`nome@dominahub.com.br`)
- [ ] MFA configurado na conta Google (obrigatório antes do primeiro login útil)
- [ ] Adicionado ao grupo correto no Workspace (conforme cargo)
- [ ] Convite enviado ao Slack (canais padrão do cargo)
- [ ] Acesso ao Notion (nível de leitura do workspace)
- [ ] Convite ao 1Password Teams (vault compartilhado do time)

**Colaborador — executa (Semana 1):**
- [ ] Troca de senha temporária no primeiro acesso (≥ 16 chars, gerada no 1Password)
- [ ] MFA ativado em: Google, Slack, GitHub, 1Password
- [ ] Leitura e aceite da Política de Segurança
- [ ] Completar treinamento assíncrono: "Security Awareness" (link no Notion)
- [ ] Completar treinamento assíncrono: "LGPD e Privacidade" (link no Notion)
- [ ] Confirmar ao Security Champion do time que concluiu os treinamentos

---

#### Checklist Adicional — Engenharia (ENG)

**DevOps — executa:**
- [ ] Acesso ao repositório GitHub (role: member; time: engineering)
- [ ] Acesso a AWS Console (role: ReadOnly) — somente após 2 semanas
- [ ] Acesso ao banco de dados Staging (apenas via Bastião aprovado, read-only)
- [ ] Acesso ao CloudWatch Logs (app logs, sem audit/auth logs)
- [ ] Configuração de chave SSH para GitHub (par gerado localmente, pública enviada pelo colaborador)

**Tech Lead — executa:**
- [ ] Tour pelo repositório: estrutura, branches, convenções de commit
- [ ] Code review de primeiro PR (pair programming ou review detalhado)
- [ ] Apresentação do Security Champion do time
- [ ] Apresentação do processo de threat modeling

**Colaborador — executa:**
- [ ] Instalar extensão/plugin de segurança no editor (GitLens, SonarLint ou equivalente)
- [ ] Verificar que `.nvmrc` está sendo respeitado localmente (`node --version`)
- [ ] Nunca commitar `.env` — verificar `.gitignore` local
- [ ] Instalar Gitleaks localmente e ativar pre-commit hook:
  ```bash
  cat > .git/hooks/pre-commit << 'EOF'
  #!/bin/sh
  gitleaks protect --config .gitleaks.toml --staged -v
  EOF
  chmod +x .git/hooks/pre-commit
  ```
- [ ] Primeiro PR deve passar pelo CI completo (confirmação no canal do time)

---

#### Checklist Adicional — DevOps/Plataforma (DEV-OPS)

**CISO — executa (aprovação necessária):**
- [ ] Validação do processo de verificação de antecedentes
- [ ] Aprovação de acesso a AWS console com permissões elevadas

**DevOps senior — executa:**
- [ ] Acesso ao AWS Console com role de DevOps (não admin global)
- [ ] Acesso ao Secrets Manager (leitura de não-críticos)
- [ ] Acesso ao GitHub com permissões de merge em develop
- [ ] Acesso a todos os ambientes (staging com W, produção somente T/E)

**Colaborador — executa:**
- [ ] Hardware key (YubiKey ou equivalente) configurada em AWS e GitHub (para Nível 4)
- [ ] Treinamento: "AWS Security Fundamentals" (custeado pela empresa)
- [ ] Leitura de toda a documentação em `docs/` (security-architecture, supply-chain, etc.)
- [ ] Participação em on-call após 30 dias com acompanhamento de um sênior

---

#### Checklist Adicional — Customer Support (SUP)

**DevOps — executa:**
- [ ] Acesso à ferramenta de suporte (Intercom ou equivalente) com role de agente
- [ ] Acesso ao Stripe Dashboard (live, leitura apenas)
- [ ] Acesso ao Notion (documentação de produto, FAQs)
- [ ] SEM acesso a GitHub, AWS, banco de dados

**Gestor de Suporte — executa:**
- [ ] Treinamento específico: como lidar com dados financeiros de usuários
- [ ] Treinamento: o que fazer em caso de phishing dirigido ao suporte (vishing, impersonation)
- [ ] Processo de escalação: quando envolver engenharia vs. CISO

---

#### Checklist Adicional — Externo/Contratado (EXT)

**RH — executa:**
- [ ] NDA específico para prestadores de serviço (mais restritivo que CLT)
- [ ] DPA (Data Processing Agreement) se terá acesso a dados de usuários
- [ ] Definição clara e documentada do escopo de acesso e prazo

**DevOps — executa:**
- [ ] Conta temporária com prazo de expiração automático
- [ ] Acesso mínimo possível para execução do projeto
- [ ] Nenhum acesso a dados de produção sem aprovação explícita do CISO
- [ ] Acesso ao repositório em fork privado ou repositório separado quando possível

**CISO — valida:**
- [ ] Revisão do escopo de acesso proposto
- [ ] Confirmação de que o contratado não terá mais acesso do que qualquer engenheiro CLT
- [ ] Alerta configurado para qualquer acesso fora do padrão

---

## Parte 2 — OFFBOARDING

### Linha do Tempo e Urgência

```
H+0 (hora do comunicado de desligamento)
└── RH notifica CISO e DevOps imediatamente via canal privado

H+1 (máximo — independente do aviso prévio)
├── REVOGAR: todos os acessos a produção e staging
├── REVOGAR: tokens de API e sessões ativas
├── REVOGAR: acesso ao repositório GitHub
└── INICIAR: inventário de credenciais para rotação

Durante o aviso prévio (se aplicável)
└── Colaborador mantém acesso mínimo para transição
    (Google email, Slack leitura, Notion leitura — nunca acesso a dados)

Último dia
├── REVOGAR: todos os acessos remanescentes
├── REVOGAR: Google Workspace (email convertido para alias ou deletado)
├── ROTACIONAR: todos os segredos que o colaborador conhecia
└── RECOLHER: dispositivos corporativos + hardware keys
```

---

### Checklist de Offboarding por Sistema

#### Revogações do Dia 0 (H+1) — DevOps executa

**Sistemas críticos — revogação imediata:**
- [ ] AWS Console: desabilitar usuário IAM ou remover do grupo de acesso
- [ ] AWS CLI: invalidar chaves de acesso (`Access Key ID` → `Inactive`)
- [ ] Banco de dados Produção: revogar permissões de usuário DB específico
- [ ] Banco de dados Staging: revogar permissões
- [ ] GitHub: remover do repositório / organização
- [ ] GitHub: revogar Personal Access Tokens emitidos pelo colaborador
- [ ] Stripe Dashboard: revogar acesso
- [ ] Secrets Manager: revogar acesso da IAM policy pessoal (se houver)

**Aplicação — invalidar sessões ativas:**
```sql
-- Revogar TODAS as sessões ativas do colaborador no sistema
-- (se o colaborador era usuário da plataforma com conta de teste)
UPDATE sessions
SET revoked_at = NOW(), revocation_reason = 'OFFBOARDING'
WHERE user_id = '<user_id_do_colaborador>';
```

**Monitoramento — alerta configurado:**
- [ ] Configurar alerta de 30 dias: qualquer tentativa de acesso com credenciais antigas

---

#### Revogações do Último Dia — DevOps + RH executam

**Google Workspace:**
- [ ] Suspender conta (não deletar imediatamente — aguardar 30 dias)
- [ ] Transferir propriedade de arquivos críticos no Google Drive
- [ ] Configurar resposta automática no e-mail (contato alternativo)
- [ ] Remover de todos os grupos e aliases

**Ferramentas de comunicação:**
- [ ] Slack: desativar conta (mensagens históricas preservadas)
- [ ] Notion: desativar membro
- [ ] Linear/Jira: desativar usuário (histórico preservado)

**Gerenciador de senhas:**
- [ ] 1Password: revogar acesso a todos os vaults compartilhados
- [ ] 1Password: auditoria de quais segredos o colaborador tinha acesso

**Dispositivos:**
- [ ] Recolher laptop corporativo (format e wipe antes de reutilizar)
- [ ] Recolher hardware keys (YubiKey)
- [ ] BYOD: aplicar Mobile Device Management (MDM) wipe de perfil corporativo
- [ ] Confirmar que dados corporativos foram removidos do dispositivo pessoal

---

#### Rotação de Segredos — DevOps + CISO executam

Todos os segredos que o colaborador desligado **poderia conhecer** devem ser rotacionados, independente de suspeita de má-fé.

```bash
# Para cada segredo afetado:
aws secretsmanager rotate-secret --secret-id /prod/jwt-access-secret
aws secretsmanager rotate-secret --secret-id /prod/jwt-refresh-secret
# ... etc.

# Stripe — gerar nova API key e invalidar a antiga no dashboard
# DB password — alterar via RDS + atualizar no Secrets Manager
```

**Checklist de rotação por cargo:**

| Cargo | Segredos a Rotacionar |
|---|---|
| **ENG** | Nenhum (não tem acesso direto a segredos de produção) |
| **DEV-OPS** | JWT secrets, DB passwords, Stripe webhook, qualquer key que acessou |
| **SEC (CISO)** | Todos os segredos de produção |
| **EXEC** | Billing credentials, Stripe API keys administrativas |
| **EXT** | Quaisquer tokens emitidos especificamente para o projeto |

---

#### Verificação Final — CISO executa (até 5 dias após desligamento)

- [ ] Auditar `auth_events` do colaborador (últimas ações no sistema)
- [ ] Verificar CloudTrail: últimas ações AWS do usuário
- [ ] Verificar GitHub: últimos commits e reviews do colaborador
- [ ] Confirmar que nenhuma credencial ativa referencia o colaborador
- [ ] Confirmar rotação de segredos concluída
- [ ] Documentar o offboarding no registro interno (com data e responsáveis)
- [ ] Se cargo Nível 3+: notificar time sobre conclusão do offboarding

---

## Parte 3 — CONTRATADOS EXTERNOS

### Onboarding de Contratado

1. **Antes do acesso:**
   - Contrato + NDA + DPA (se aplicável) assinados
   - Escopo de acesso definido por escrito e aprovado pelo CISO
   - Data de expiração do acesso definida (máximo 6 meses; renovável)

2. **Concessão de acesso:**
   - Conta individual com nome completo identificável (nunca `contractor` ou `external`)
   - Acesso ao mínimo necessário para o escopo definido
   - MFA obrigatório desde o primeiro acesso
   - Registrado na [matriz de exceções ativas](access-control-matrix.md#6-registro-de-exceções-ativas)

3. **Durante o engajamento:**
   - Revisão de acesso mensal (CISO verifica se escopo ainda é necessário)
   - Qualquer atividade fora do escopo definido dispara offboarding imediato

4. **Encerramento:**
   - Checklist de offboarding completo no último dia do contrato
   - Segredos compartilhados especificamente para o projeto são rotacionados

---

## Parte 4 — REGISTRO E AUDITORIA

### Registro de Onboardings

Manter registro em planilha interna (acesso restrito a RH + CISO):

| Colaborador | Cargo | Data início | Nível de acesso | Treinamentos concluídos | Responsável |
|---|---|---|---|---|---|
| *(exemplo)* | Backend Eng | 2026-03-10 | Nível 2 | ✅ Completos | Tech Lead + DevOps |

### Registro de Offboardings

| Colaborador | Cargo | Data desligamento | Revogações concluídas em H+? | Segredos rotacionados | CISO sign-off |
|---|---|---|---|---|---|
| *(exemplo)* | DevOps | 2026-02-28 | H+0h45 | ✅ | ✅ 2026-03-01 |

### Alerta de Acesso Pós-Desligamento

Configurado no CloudWatch / SIEM:

```json
{
  "filterPattern": "[timestamp, requestId, level=ERROR, message=\"*UNAUTHORIZED*\", userId]",
  "metricTransformations": [{
    "metricName": "PostTerminationAccessAttempt",
    "alarmThreshold": 1
  }]
}
```

Qualquer tentativa de acesso de um usuário desligado gera alerta P2 imediato no canal #incidentes-segurança.

---

## Histórico de Versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 2026-03-05 | Versão inicial |
