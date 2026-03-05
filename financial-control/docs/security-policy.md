# Política de Segurança da Informação — DominaHub

> **Classificação:** Interno — Confidencial
> **Versão:** 1.0 | **Data:** 2026-03-05
> **Aprovado por:** CISO / CEO
> **Revisão programada:** Março 2027 (anual) ou após incidente grave

---

## Sumário

1. [Declaração de Política e Escopo](#1-declaração-de-política-e-escopo)
2. [Estrutura de Governança](#2-estrutura-de-governança)
3. [Princípio do Menor Privilégio](#3-princípio-do-menor-privilégio)
4. [Separação de Ambientes e Acessos](#4-separação-de-ambientes-e-acessos)
5. [Onboarding e Offboarding Seguro](#5-onboarding-e-offboarding-seguro)
6. [Gestão de Incidentes de Segurança](#6-gestão-de-incidentes-de-segurança)
7. [Revisões Periódicas de Acesso](#7-revisões-periódicas-de-acesso)
8. [Cultura Security-First](#8-cultura-security-first)
9. [Gestão de Fornecedores e Terceiros](#9-gestão-de-fornecedores-e-terceiros)
10. [Violações e Consequências](#10-violações-e-consequências)
11. [Referências e Documentos Relacionados](#11-referências-e-documentos-relacionados)

---

## 1. Declaração de Política e Escopo

### 1.1 Propósito

Esta política estabelece os **requisitos mínimos de segurança** que todos os colaboradores, prestadores de serviço e sistemas do DominaHub devem atender. Ela serve como o documento-raiz da nossa postura de segurança — todos os outros documentos técnicos (arquitetura, playbooks, políticas específicas) derivam e são consistentes com este.

### 1.2 Fundamento

O DominaHub processa **dados financeiros pessoais** de alta sensibilidade contextual. Uma falha de segurança não é apenas um problema técnico — é uma violação de confiança com consequências legais (LGPD), financeiras (reembolsos, multas) e reputacionais potencialmente irreversíveis para um SaaS de estágio inicial.

**Segurança não é opcional. É um requisito de produto.**

### 1.3 Escopo

Aplica-se a:
- Todos os colaboradores CLT, PJ e estagiários
- Prestadores de serviço e consultores externos com acesso a sistemas
- Sistemas, infraestrutura e código do DominaHub em todos os ambientes
- Dados de usuários finais tratados pela plataforma

### 1.4 Princípios Fundamentais

| Princípio | Definição Operacional |
|---|---|
| **Menor privilégio** | Cada pessoa e sistema acessa apenas o estritamente necessário para sua função |
| **Defesa em profundidade** | Múltiplas camadas de controle — falha de uma não compromete o todo |
| **Assume breach** | Operamos como se um comprometimento já tivesse ocorrido; monitoramento contínuo |
| **Segurança por design** | Requisitos de segurança definidos antes do código, não após |
| **Responsabilidade individual** | Cada pessoa é responsável pelas credenciais e acessos atribuídos a ela |

---

## 2. Estrutura de Governança

### 2.1 Papéis e Responsabilidades

| Papel | Responsabilidades de Segurança |
|---|---|
| **CEO** | Aprovação final da política; orçamento de segurança; comunicação pública em incidentes críticos |
| **CISO / CTO** | Dono da política; decisões de risco; aprovação de exceções; revisão anual |
| **Security Champion (por time)** | Ponto de contato de segurança no time; primeiro respondedor de dúvidas; participa do threat model |
| **DPO** | Conformidade LGPD; notificação à ANPD; comunicação com titulares de dados |
| **Engenharia** | Implementar controles técnicos; seguir secure coding guidelines; reportar vulnerabilidades |
| **DevOps/Platform** | Manter infraestrutura segura; gerenciar credenciais de deploy; on-call de infraestrutura |
| **RH** | Executar checklists de onboarding/offboarding; verificação de antecedentes |

### 2.2 Tomada de Decisão de Risco

```
Risco identificado
    ↓
Engenharia/DevOps avalia impacto e probabilidade
    ↓
Baixo risco (CVSS < 4) → equipe decide, documenta
    ↓
Médio risco (CVSS 4-7) → Security Champion + Tech Lead aprovam
    ↓
Alto risco (CVSS > 7) → CISO aprova; prazo máximo de remediação: 30 dias
    ↓
Crítico (exploração ativa) → CISO + CEO; remediação em 72h
```

### 2.3 Cadência de Governança

| Evento | Frequência | Participantes |
|---|---|---|
| Threat modeling de feature nova | Por feature com acesso a dados sensíveis | Eng + Security Champion |
| Security review de PR (dependências novas) | Por PR | Tech Lead + Security Champion |
| Revisão de acessos | Trimestral | CISO + RH + Tech Leads |
| Revisão de incidentes | Após cada incidente P1/P2 | Time completo + CISO |
| Atualização da política | Anual | CISO + CEO |
| Pentest externo | Anual (ou pré-Series A) | Empresa especializada |

---

## 3. Princípio do Menor Privilégio

### 3.1 Regra Geral

> **Ninguém recebe mais acesso do que o mínimo necessário para realizar sua função atual, pelo menor período de tempo necessário.**

Toda solicitação de acesso deve responder:
- O que você precisa acessar?
- Por que você precisa desse acesso?
- Por quanto tempo você precisará?

### 3.2 Hierarquia de Acessos

```
Nível 0 — Nenhum acesso
    ↓
Nível 1 — Leitura (Read-Only)
  • Logs de aplicação (sem dados de usuário)
  • Dashboards de monitoramento
  • Código-fonte (público ao time)
    ↓
Nível 2 — Operacional
  • Deploy em staging
  • Acesso a dados de produção anonimizados
  • Execução de runbooks aprovados
    ↓
Nível 3 — Elevado (requer aprovação CISO)
  • Acesso a dados de produção identificáveis
  • Deploy em produção direto
  • Gerenciamento de secrets
    ↓
Nível 4 — Administrativo (máximo 2 pessoas)
  • Root AWS / IAM admin
  • Acesso irrestrito ao banco de produção
  • Gerenciamento de billing e contrato
```

### 3.3 Regras Operacionais

**Credenciais:**
- Cada pessoa tem credenciais **individuais e únicas** — credenciais compartilhadas são proibidas
- Senhas devem usar um **gerenciador de senhas** aprovado (1Password for Teams ou equivalente)
- MFA obrigatório em **todos** os sistemas com dados de usuário ou acesso a produção
- Senhas temporárias devem ser trocadas no primeiro acesso

**Acesso privilegiado:**
- Acesso de Nível 3+ usa **sessões temporárias** (AWS STS `assume-role`, máx 1h)
- Acesso ao banco de produção requer **dupla aprovação** (tech lead + CISO) e é logado
- Não existe acesso SSH direto ao servidor de produção — tudo via ECS Exec com log habilitado
- Break-glass accounts (emergência) existem, mas seu uso dispara alerta automático

**Segredos e credenciais:**
- Zero segredos em código, variáveis de ambiente de servidor ou Slack
- Todos os segredos em AWS Secrets Manager (produção) ou 1Password (desenvolvimento)
- Rotação mínima: segredos de produção a cada 90 dias; tokens de serviço anualmente

### 3.4 Matriz de Acesso

Ver: [docs/access-control-matrix.md](access-control-matrix.md)

---

## 4. Separação de Ambientes e Acessos

### 4.1 Ambientes Definidos

| Ambiente | Propósito | Dados | Acesso |
|---|---|---|---|
| **Development (local)** | Desenvolvimento diário | Sintéticos / seed fixo | Todos os engenheiros |
| **Staging** | QA, testes de integração, demos | Anonimizados ou sintéticos | Engenharia + Produto |
| **Production** | Usuários reais | Dados reais de usuários | Restrito — ver abaixo |

### 4.2 Regras de Separação

**Isolamento de rede:**
- Cada ambiente tem VPC dedicada (produção, staging) ou apenas local (dev)
- Produção e staging **não** compartilham peering, credentials ou secrets
- Security Groups bloqueiam tráfego entre ambientes

**Isolamento de dados:**
- Dados de produção **nunca** são copiados para staging ou dev sem anonimização aprovada
- Scripts de dump/restore de produção requerem aprovação CISO + logs de auditoria
- Banco de staging usa credenciais completamente diferentes de produção

**Isolamento de credenciais:**
- IAM roles separadas por ambiente (prod-task-role ≠ staging-task-role)
- Secrets Manager namespaces separados (`/prod/*` vs `/staging/*`)
- CI/CD não tem acesso a produção exceto via pipeline de deploy aprovado

**Isolamento de CI/CD:**
```
Código → PR Review → CI (unit + integration em staging DB) → Aprovação → Deploy Staging
                                                                    ↓
                                                               QA Sign-off
                                                                    ↓
                                                           Deploy Production
                                                        (requer aprovação manual)
```

### 4.3 Acesso a Produção — Controles

| Situação | Processo |
|---|---|
| Deploy rotineiro | Via pipeline CI/CD aprovado — automático após QA |
| Debug de incidente | ECS Exec com aprovação do on-call lead; sessão logada |
| Query no banco | Bastião temporário via AWS Session Manager; log obrigatório |
| Dump de dados para análise | Aprovação CISO + RH; dados anonimizados antes de sair de produção |
| Acesso de suporte a conta de usuário | Log em `audit_logs`; aprovação do usuário via ticket |

### 4.4 Ambientes Proibidos

- **Não existe** "acesso de dev ao banco de produção"
- **Não existe** `scp` ou `rsync` de arquivos de produção para máquina local
- **Não existe** compartilhamento de credenciais de produção via Slack, e-mail ou Notion

---

## 5. Onboarding e Offboarding Seguro

> Detalhes operacionais: [docs/onboarding-offboarding.md](onboarding-offboarding.md)

### 5.1 Onboarding — Princípios

**Acesso mínimo inicial:** Todo novo colaborador começa com acesso de Nível 1 (leitura apenas). Elevações são solicitadas conforme necessidade demonstrada, com aprovação do gestor + CISO.

**Verificação de antecedentes:** Para funções com acesso a Nível 3+, verificação de antecedentes criminais e de referências antes da concessão.

**Contrato e NDA:** Assinado antes de qualquer acesso a sistemas ou código-fonte.

**Treinamento obrigatório (Semana 1):**
- Política de segurança (este documento) — leitura e aceite formal
- Secure coding guidelines do DominaHub
- Como reportar incidentes e suspeitas
- Simulação de phishing (verificação de atenção)

### 5.2 Offboarding — Regras Críticas

**O offboarding de segurança é iniciado no mesmo dia da comunicação de desligamento**, independentemente do aviso prévio ou período de transição.

Itens revogados no Dia 0:
- Acesso a sistemas de produção e staging
- Tokens de API ativos
- Sessões ativas no aplicativo (invalidação de JWT)
- Acesso ao repositório GitHub
- Acesso ao AWS Console e CLI

Itens revogados até o último dia:
- E-mail corporativo e Google Workspace
- Ferramentas de comunicação (Slack)
- Gerenciador de senhas corporativo

**Todas as credenciais que o colaborador desligado tinha acesso devem ser rotacionadas**, independente de suspeita de má-fé.

### 5.3 Gestão de Dispositivos

- Dispositivos corporativos retornam ao RH no dia do desligamento
- Dispositivos pessoais com acesso corporativo (BYOD): remoção remota de perfis e dados corporativos

---

## 6. Gestão de Incidentes de Segurança

> Playbooks técnicos detalhados: [docs/incident-response.md](incident-response.md)

### 6.1 Classificação de Severidade

| Severidade | Critério | Exemplo | SLA de Resposta |
|---|---|---|---|
| **P1 — Crítico** | Dados de usuários expostos OU serviço de produção comprometido | Vazamento de banco, RCE em produção, comprometimento de JWT | 1h para contenção; 72h para ANPD |
| **P2 — Alto** | Vulnerabilidade exploitável descoberta OU acesso não autorizado sem exposição de dados | SQLi bloqueado pelo WAF, sessão de admin comprometida | 4h para triagem; 24h para remediação |
| **P3 — Médio** | Comportamento anômalo detectado OU CVE de terceiro sem exploração ativa | Spike de scraping contido, dependência com CVE alta | 24h para triagem; 7 dias para resolução |
| **P4 — Baixo** | Melhoria de segurança identificada, CVE moderada, hardening | Configuração subótima, CVE sem vetor de exploração | 30 dias |

### 6.2 Cadeia de Comunicação

```
DETECTOR (qualquer colaborador, sistema de alerta)
    ↓ reporta imediatamente via canal #incidentes-segurança
ON-CALL ENGINEER
    ↓ triagem inicial (P1/P2?) em < 30 min
SECURITY CHAMPION do time
    ↓ confirmação e escalação se necessário
CISO / CTO (para P1/P2)
    ├─→ containment lead (eng)
    ├─→ comunicação interna (updates a cada 1h para P1)
    └─→ decisão de notificação externa
         ├─→ DPO para ANPD (se dados pessoais, LGPD Art. 48, 72h)
         └─→ Comunicação a usuários afetados (se necessário)
CEO (para P1 com exposição pública ou LGPD)
    └─→ Comunicação pública, imprensa, investidores
```

### 6.3 Regra de Ouro do Incidente

> **Nunca agir sozinho em um incidente.** Sempre notificar o canal #incidentes-segurança primeiro, mesmo que a ação pareça óbvia. Ações não coordenadas podem destruir evidências ou agravar o incidente.

### 6.4 Post-Mortem Obrigatório

Para qualquer incidente P1 ou P2:

- **Prazo:** Post-mortem em até 5 dias úteis após resolução
- **Blameless:** Foco em processos e sistemas, não em pessoas
- **Formato:** Timeline → Causas raiz (5 Whys) → Impacto → Actions items com dono e prazo
- **Distribuição:** Todo o time de engenharia; compartilhado com CEO

**Métricas de resposta a incidentes (revisadas trimestralmente):**
- MTTD (Mean Time to Detect)
- MTTR (Mean Time to Respond/Contain)
- Número de P1/P2 por trimestre
- Taxa de reincidência (mesmo tipo de incidente repetido)

---

## 7. Revisões Periódicas de Acesso

### 7.1 Calendário de Revisões

| Revisão | Frequência | Responsável | Sistemas |
|---|---|---|---|
| **Access review completo** | Trimestral | CISO + RH | Todos os sistemas |
| **IAM review (AWS)** | Mensal | DevOps Lead | AWS IAM, roles, policies |
| **Secrets rotation check** | Mensal | DevOps Lead | Secrets Manager, API keys |
| **GitHub permissions** | Trimestral | Tech Lead | Repos, branches, Actions secrets |
| **Ferramentas SaaS** | Trimestral | CISO + RH | Stripe, Slack, 1Password, etc. |
| **Contas de serviço** | Semestral | CISO | Service accounts, tokens de CI |
| **Permissões de banco** | Semestral | DevOps + CISO | Roles PostgreSQL, RDS IAM |

### 7.2 Processo de Access Review Trimestral

**Semana 1:** Geração do relatório de acessos

```bash
# Gerar relatório de IAM (AWS CLI)
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d > iac/access-reports/iam-$(date +%Y%m).csv

# Listar todos os usuários IAM e suas últimas atividades
aws iam list-users --query 'Users[*].{User:UserName,Last:PasswordLastUsed}' --output table

# Listar grupos e políticas por usuário
aws iam list-groups-for-user --user-name <nome>
```

**Semana 2:** Revisão com gestores
- Para cada colaborador: confirmar se o acesso listado é necessário para a função atual
- Identificar acessos acumulados (role creep) — comum após mudanças de time
- Identificar acessos órfãos (ex-colaboradores, contas de projeto encerrado)

**Semana 3:** Ajustes de acesso
- Revogar acessos desnecessários
- Documentar exceções aprovadas com justificativa e prazo de revisão

**Semana 4:** Relatório para CISO
- Número de acessos revisados
- Número de acessos revogados
- Exceções documentadas
- Riscos residuais

### 7.3 Critérios de Revogação Automática

Os seguintes critérios disparam revogação imediata sem necessidade de revisão:

| Critério | Ação |
|---|---|
| Colaborador desligado | Revogar todos os acessos no Dia 0 |
| Chave de API sem uso por 90 dias | Revogar e gerar nova se necessário |
| Usuário IAM sem login por 60 dias | Desabilitar, notificar gestor |
| MFA removido sem aprovação | Suspender acesso até reconfiguração |
| Acesso temporário expirado | Revogar automaticamente (via policy de expiração) |

### 7.4 Documentação de Acessos

Todos os acessos Nível 3+ são documentados em [docs/access-control-matrix.md](access-control-matrix.md) com:
- Nome do colaborador / sistema
- Nível de acesso concedido
- Justificativa
- Data de concessão
- Data de próxima revisão
- Aprovador

---

## 8. Cultura Security-First

### 8.1 Princípio

> Segurança não é responsabilidade exclusiva do time de segurança. É uma habilidade e mentalidade que todo membro do DominaHub deve desenvolver.

Uma cultura security-first não se constrói com regras — se constrói com **contexto, ferramentas, e reconhecimento**.

### 8.2 Programa de Security Champions

**O que é:** Um membro de cada time (eng, produto, suporte) que atua como ponto de contato de segurança, sem ser um especialista em tempo integral.

**Responsabilidades:**
- Participar do threat modeling de features novas do seu time
- Revisar PRs com foco em segurança (autenticação, autorização, validação de entrada)
- Ser o primeiro ponto de contato para dúvidas de segurança do time
- Participar do canal #segurança e trazer preocupações ao CISO

**Benefícios para o Champion:**
- Treinamentos avançados (custeados pela empresa): cursos OWASP, AWS Security, etc.
- Participação em conferências de segurança (1 por ano)
- Visibilidade e reconhecimento na avaliação de performance

### 8.3 Treinamentos Obrigatórios

| Treinamento | Público | Frequência | Formato |
|---|---|---|---|
| **Security Awareness** (phishing, engenharia social, senhas) | Todos | Semestral | Assíncrono + simulação |
| **Secure Coding Fundamentals** (OWASP Top 10, injeção, XSS) | Engenharia | Anual | Workshop prático |
| **LGPD e Privacidade** (direitos, retenção, breach reporting) | Todos | Anual | Assíncrono |
| **Incident Response Drill** | Eng + DevOps | Semestral | Simulação de incidente |
| **Threat Modeling** | Eng + Produto | Por feature crítica | Workshop |

**Taxa de conclusão alvo: 100%** — treinamentos incompletos bloqueiam acesso a sistemas produtivos após 30 dias de prazo.

### 8.4 Processo de Reporte de Vulnerabilidades (Interno)

Todo colaborador que identificar uma vulnerabilidade deve reportar. **Não existe punição por encontrar um bug de segurança.**

```
Identificou algo suspeito?
    ↓
1. NÃO explorar ou tentar replicar além do necessário para entender
2. NÃO compartilhar detalhes em canais públicos ou externos
3. Reportar IMEDIATAMENTE para #segurança no Slack ou dpo@dominahub.com.br
4. Se P1/P2 evidente: ligar diretamente para o CISO
```

**Programa de reconhecimento:** Vulnerabilidades confirmadas resultan em:
- Menção no all-hands e canal #wins
- P1: bônus em gift card (R$ 500–1000 dependendo do impacto)
- Contribuição registrada na avaliação de performance

### 8.5 Threat Modeling em Features Novas

Toda feature que envolve:
- Autenticação / autorização
- Acesso a dados de usuário
- Integração com terceiro (API externa)
- Upload/download de arquivos
- Processos financeiros

...deve passar por um **threat model rápido (30min)** antes do desenvolvimento:

```
Perguntas do threat model (STRIDE simplificado):
1. Quem pode usar essa feature indevidamente? (Spoofing/Tampering)
2. O que acontece se a API chamada retornar dados incorretos? (Tampering)
3. Quais dados sensíveis são processados ou expostos? (Information Disclosure)
4. O que acontece se essa feature ficar indisponível? (DoS)
5. Quem está autorizado a executar cada ação? (Elevation of Privilege)
6. Como auditamos quem fez o quê? (Non-repudiation)
```

Resultado documentado em comentário na issue/ticket antes da estimativa.

### 8.6 Security KPIs (acompanhados trimestralmente)

| Métrica | Meta | Frequência |
|---|---|---|
| Taxa de conclusão de treinamentos | ≥ 95% | Semestral |
| Tempo médio de resolução de CVE alta (MTTR) | ≤ 7 dias | Contínuo |
| Número de incidentes P1 por trimestre | 0 | Trimestral |
| Cobertura de MFA nos sistemas críticos | 100% | Mensal |
| Dependências com CVE alta pendente | 0 | Contínuo |
| PRs com revisão de segurança (Nível 3+ changes) | 100% | Contínuo |
| Taxa de sucesso em simulações de phishing | < 5% cliques | Semestral |

### 8.7 Gamificação e Engajamento

| Iniciativa | Formato | Frequência |
|---|---|---|
| **Security Newsletter** | 5 itens de segurança relevantes da semana | Semanal (CISO) |
| **CVE da Semana** | Uma CVE relevante explicada para não-especialistas | Semanal (#segurança) |
| **Bug Bounty Interno** | Pontos por vulnerabilidade encontrada; ranking trimestral | Contínuo |
| **Capture The Flag (CTF)** | Exercício prático em ambiente sandbox | Semestral |
| **Post-mortem aberto** | Apresentação blameless para o time completo | Por incidente P1/P2 |

---

## 9. Gestão de Fornecedores e Terceiros

### 9.1 Avaliação de Fornecedores

Antes de contratar um serviço que processará dados de usuários do DominaHub:

1. **Due diligence de privacidade:** O fornecedor está em conformidade com LGPD? Possui DPA (Data Processing Agreement)?
2. **Segurança da informação:** Possui certificações (SOC2, ISO 27001)? Como protege dados em trânsito e em repouso?
3. **Suboperadores:** O fornecedor terceiriza para outros? Quais garantias existem?
4. **Breach notification:** O fornecedor notificará o DominaHub dentro de 72h em caso de incidente?

### 9.2 Contratos com Terceiros

Todos os contratos com fornecedores com acesso a dados incluem:
- Cláusula de confidencialidade e LGPD
- Direito de auditoria
- Obrigação de breach notification em 72h
- Limitação de uso dos dados ao escopo contratado
- Processo de devolução/destruição de dados ao término

### 9.3 Acesso de Contratados Externos

- Acesso sempre via conta individual (nunca compartilhada)
- Escopo mínimo e por prazo determinado
- Revogado imediatamente ao término do projeto
- Nenhum acesso a dados de produção sem aprovação explícita do CISO
- NDA assinado antes de qualquer acesso

---

## 10. Violações e Consequências

### 10.1 O Que Constitui Violação

- Compartilhamento de credenciais com colegas ou terceiros
- Acesso a dados de usuários sem necessidade operacional registrada
- Cópia de dados de produção para ambientes não aprovados
- Comprometimento de segredo por negligência (ex.: commit com credencial)
- Falha em reportar uma suspeita de incidente
- Tentativa de burlar controles de segurança aprovados
- Uso de sistemas da empresa para atividades ilícitas

### 10.2 Processo

1. Investigação interna (CISO + RH + Jurídico)
2. Proporcionalidade: acidentes vs. negligência vs. intencional
3. Para incidentes com dados de usuários: LGPD pode requerer notificação mesmo em casos internos

### 10.3 Consequências

| Tipo | Consequência Possível |
|---|---|
| Acidental, sem impacto | Reforço de treinamento, revisão de processo |
| Negligente, sem impacto externo | Advertência formal, revisão de acesso |
| Negligente, com impacto a usuários | Advertência + possível desligamento + responsabilidade civil |
| Intencional | Desligamento imediato por justa causa + medidas legais |

---

## 11. Referências e Documentos Relacionados

| Documento | Localização | Descrição |
|---|---|---|
| Matriz de Controle de Acesso | [docs/access-control-matrix.md](access-control-matrix.md) | Permissões por papel e sistema |
| Onboarding/Offboarding | [docs/onboarding-offboarding.md](onboarding-offboarding.md) | Checklists operacionais |
| Playbooks de Incidente (técnico) | [docs/incident-response.md](incident-response.md) | Resposta técnica por tipo de incidente |
| Arquitetura de Segurança | [docs/security-architecture.md](security-architecture.md) | Infraestrutura e controles técnicos |
| Supply Chain Security | [docs/supply-chain-security.md](supply-chain-security.md) | Segurança de dependências e CI/CD |
| Inventário de Dados (LGPD) | [docs/data-inventory.md](data-inventory.md) | Catálogo de dados pessoais |
| Política de Privacidade | [docs/privacy-policy.md](privacy-policy.md) | Política pública LGPD |
| Terraform IAM | [infra/terraform/iam.tf](../infra/terraform/iam.tf) | Implementação técnica de IAM |

---

## Histórico de Versões

| Versão | Data | Alteração | Aprovado por |
|---|---|---|---|
| 1.0 | 2026-03-05 | Versão inicial | CISO / CEO |

---

*Esta política é revisada anualmente ou imediatamente após qualquer incidente de segurança classificado como P1.*
