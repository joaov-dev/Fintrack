# Política de Privacidade — DominaHub

> **Lei Geral de Proteção de Dados (LGPD) — Lei nº 13.709/2018**
> **Versão:** 1.0 | **Vigência:** 05 de março de 2026 | **Revisão programada:** março de 2027

---

## 1. Quem Somos

**DominaHub Tecnologia Ltda** ("DominaHub", "nós", "nosso") é a controladora dos seus dados pessoais conforme definido pela LGPD.

| | |
|---|---|
| **Razão Social** | DominaHub Tecnologia Ltda |
| **CNPJ** | XX.XXX.XXX/XXXX-XX |
| **Endereço** | [Endereço completo] |
| **E-mail de contato** | privacidade@dominahub.com.br |
| **DPO (Encarregado)** | [Nome do DPO] |
| **E-mail do DPO** | dpo@dominahub.com.br |

O DominaHub é uma plataforma de controle financeiro pessoal que permite gerenciar contas, transações, orçamentos, metas e investimentos em um único lugar.

---

## 2. Quais Dados Coletamos e Por Quê

Coletamos apenas os dados estritamente necessários para a prestação do serviço (**princípio da minimização** — LGPD Art. 6 III).

### 2.1 Dados de Cadastro

| Dado | Finalidade | Base Legal |
|---|---|---|
| Nome completo | Identificação, personalização da interface | Art. 7 V — execução de contrato |
| Endereço de e-mail | Autenticação, comunicações transacionais | Art. 7 V — execução de contrato |
| Senha (hash bcrypt) | Autenticação segura | Art. 7 V — execução de contrato |
| Foto de perfil (opcional) | Personalização da interface | Art. 7 V — execução de contrato |

### 2.2 Dados Financeiros

Estes dados são fornecidos **voluntariamente por você** para uso das funcionalidades da plataforma. Eles **não são vendidos, alugados ou compartilhados** com terceiros para fins comerciais.

| Dado | Finalidade | Base Legal |
|---|---|---|
| Transações (valor, descrição, data) | Controle financeiro pessoal | Art. 7 V — execução de contrato |
| Contas bancárias (nome, tipo, saldo inicial) | Gestão de contas | Art. 7 V — execução de contrato |
| Categorias de gastos | Organização de despesas | Art. 7 V — execução de contrato |
| Orçamentos mensais | Planejamento financeiro | Art. 7 V — execução de contrato |
| Metas financeiras | Controle de objetivos | Art. 7 V — execução de contrato |
| Dívidas e passivos | Controle de endividamento | Art. 7 V — execução de contrato |
| Cartões de crédito (nome, limite, datas) | Controle de faturas | Art. 7 V — execução de contrato |
| Posições de investimento | Controle de carteira | Art. 7 V — execução de contrato |
| Comprovantes (anexos de transações) | Documentação de gastos | Art. 7 V — execução de contrato |

### 2.3 Dados de Preferências

| Dado | Finalidade | Base Legal |
|---|---|---|
| Moeda, idioma, fuso horário | Formatação da interface | Art. 7 V — execução de contrato |
| Preferências de notificações | Controle de comunicações | Art. 7 IX — legítimo interesse |

### 2.4 Dados de Segurança e Acesso

| Dado | Finalidade | Base Legal | Retenção |
|---|---|---|---|
| Endereço IP das sessões | Segurança da conta | Art. 7 IX — legítimo interesse | Até expiração da sessão |
| User-agent do dispositivo | Identificação para segurança | Art. 7 IX — legítimo interesse | Até expiração da sessão |
| Histórico de tentativas de login | Prevenção de força bruta | Art. 7 IX — legítimo interesse | 30 dias |
| Eventos de autenticação | Trilha de auditoria de segurança | Art. 7 IX — legítimo interesse | 365 dias |
| Segredo MFA (autenticação de dois fatores) | Autenticação segura | Art. 7 V — execução de contrato | Até exclusão da conta |

### 2.5 Dados de Consentimento

Mantemos um registro auditável de todos os consentimentos concedidos ou revogados por você (tipo, versão, data, IP), conforme exigido pela LGPD Art. 7 I e Art. 8. Esses registros são retidos por **5 anos** para fins de obrigação legal.

### 2.6 Dados de Faturamento

Para planos pagos, o processamento de pagamento é realizado pelo **Stripe**. O DominaHub recebe apenas um identificador de cliente (`stripeCustomerId`) e não armazena dados de cartão de crédito. O Stripe atua como suboperador de dados (ver seção 5).

---

## 3. O Que NÃO Coletamos

Por design, o DominaHub **nunca coleta**:

- CPF, CNPJ, RG ou qualquer documento de identificação nacional
- Dados biométricos
- Dados de saúde ou médicos
- Origem racial ou étnica
- Opiniões políticas, religiosas ou filosóficas
- Localização GPS em tempo real
- Conteúdo de comunicações privadas (e-mails, mensagens)
- Dados de menores de 18 anos — o uso da plataforma é vedado a menores

---

## 4. Como Usamos Seus Dados

Seus dados são utilizados **exclusivamente** para:

1. **Prestar o serviço contratado** — exibir, organizar e processar suas informações financeiras
2. **Manter a segurança da sua conta** — detectar acessos não autorizados e proteger contra fraudes
3. **Cumprir obrigações legais** — manter trilhas de auditoria exigidas por lei
4. **Melhorar a plataforma** — apenas com dados anônimos e agregados (sem identificação individual), e somente com o seu consentimento explícito
5. **Comunicações transacionais** — e-mails de confirmação, alertas de segurança e notificações funcionais relacionadas ao serviço

**Nunca usamos seus dados para:**
- Publicidade comportamental
- Venda ou aluguel a terceiros
- Criação de perfis para fins alheios ao serviço contratado

---

## 5. Compartilhamento de Dados e Suboperadores

O DominaHub compartilha dados pessoais com terceiros **apenas quando estritamente necessário** para a operação do serviço:

| Suboperador | País | Dados Compartilhados | Finalidade | Garantias |
|---|---|---|---|---|
| **Amazon Web Services (AWS)** | EUA | Dados da aplicação, logs, IPs | Hospedagem e infraestrutura de nuvem | Cláusulas Padrão Contratuais (SCCs) — LGPD Art. 33 II |
| **Stripe** | EUA | E-mail, identificador de cliente, valor da assinatura | Processamento de pagamentos | SCCs — LGPD Art. 33 II |
| **Have I Been Pwned (HIBP)** | EUA | Apenas os 5 primeiros caracteres do hash SHA-1 da senha | Verificação de vazamentos de credenciais | Dado anonimizado por k-anonymity — nenhum dado identificável transmitido |

> **Nota sobre o HIBP:** Durante o cadastro, verificamos se sua senha apareceu em vazamentos públicos conhecidos. Para isso, enviamos ao serviço HIBP apenas os 5 primeiros caracteres de um hash SHA-1 da sua senha. O HIBP não recebe sua senha nem pode identificá-lo. Esse dado é considerado anonimizado.

**Não compartilhamos seus dados com:**
- Parceiros de marketing
- Data brokers
- Qualquer parte não listada acima

---

## 6. Segurança dos Seus Dados

Adotamos medidas técnicas e organizacionais de segurança alinhadas ao estado da arte:

| Camada | Proteção |
|---|---|
| Comunicação | TLS 1.2/1.3 em todas as conexões |
| Senhas | Hash bcrypt com custo 12 — irreversível |
| Autenticação dois fatores | TOTP via app autenticador (RFC 6238) |
| Segredo MFA | Cifrado com AES-256-GCM em repouso |
| Comprovantes (anexos) | Cifrados com AES-256-GCM em repouso |
| Banco de dados | Cifrado em repouso com AES-256 (AWS KMS CMK) |
| Backups | Cifrados com AES-256 CMK — sem acesso externo |
| Credenciais internas | Armazenadas no AWS Secrets Manager com KMS |
| Firewall de Aplicação (WAF) | Regras OWASP, bloqueio de SQLi e XSS |
| Controle de acesso | IAM com mínimo privilégio necessário |
| Logs de auditoria | Imutáveis por trigger de banco de dados |
| Monitoramento | Detecção automática de comportamentos anômalos |

Em caso de incidente de segurança que possa afetar seus dados, notificaremos você e a **ANPD (Autoridade Nacional de Proteção de Dados)** dentro de **72 horas** após o conhecimento do incidente, conforme exigido pela LGPD Art. 48.

---

## 7. Por Quanto Tempo Guardamos Seus Dados

| Dado | Período de Retenção | Justificativa |
|---|---|---|
| Dados financeiros (transações, contas, etc.) | Até você excluir sua conta | Prestação do serviço contratado |
| Conta de usuário ativa | Indefinido (enquanto ativa) | Prestação do serviço |
| Conta após solicitação de exclusão | 30 dias adicionais | Período de resfriamento para cancelamento |
| E-mail (lista de supressão) | 30 dias após exclusão completa | Prevenção de re-cadastro indevido |
| Tentativas de login | 30 dias | Evidência de brute force |
| Sessões expiradas | Imediatamente após expiração | Higiene de dados |
| Eventos de autenticação | 365 dias | Trilha de auditoria de segurança |
| Logs de ações do usuário | 365 dias | Trilha de auditoria operacional |
| Registros de consentimento | 5 anos | Obrigação legal (prazo prescricional civil) |
| Dados de faturamento | Conforme contrato Stripe + 5 anos (obrigação fiscal) | Obrigação legal |

---

## 8. Seus Direitos (LGPD Art. 18)

Você tem os seguintes direitos em relação aos seus dados pessoais:

| Direito | Como Exercer |
|---|---|
| **Confirmação de tratamento** — saber se tratamos seus dados | `GET /api/v1/privacy/me` ou pelo e-mail de privacidade |
| **Acesso aos dados** — visualizar todos os dados que temos sobre você | `GET /api/v1/privacy/me` na plataforma |
| **Portabilidade** — exportar seus dados em formato legível por máquina (JSON) | `GET /api/v1/privacy/export` na plataforma |
| **Correção** — atualizar dados incorretos ou desatualizados | Configurações da conta |
| **Eliminação de dados financeiros** — excluir suas transações, contas e dados financeiros (mantendo a conta ativa) | `DELETE /api/v1/auth/data` na plataforma |
| **Eliminação total** — excluir sua conta e todos os dados associados | `DELETE /api/v1/privacy/account` — a exclusão é permanente após 30 dias |
| **Cancelamento da exclusão** — reverter uma solicitação de exclusão dentro de 30 dias | `POST /api/v1/privacy/account/cancel` |
| **Revogação de consentimento** — retirar consentimentos opcionais (e-mails de marketing, analytics) | `PUT /api/v1/privacy/consent` |
| **Informação sobre compartilhamento** — saber com quem compartilhamos seus dados | Esta política (Seção 5) |
| **Oposição ao tratamento** — opor-se a tratamentos baseados em legítimo interesse | Contato: dpo@dominahub.com.br |

Para exercer qualquer direito, você também pode contatar nosso DPO diretamente em **dpo@dominahub.com.br**. Responderemos em até **15 dias úteis**.

---

## 9. Consentimento

### Consentimentos Obrigatórios (necessários para uso do serviço)
Ao criar sua conta, você consente com:
- Os **Termos de Serviço** — necessário para usar a plataforma
- Esta **Política de Privacidade** — necessário para usar a plataforma

### Consentimentos Opcionais (você pode aceitar ou recusar sem restrições)
- **E-mails de marketing** — newsletters, novidades e promoções
- **Analytics** — análise de comportamento de uso para melhoria do produto (dados agregados e anonimizados)

Você pode alterar seus consentimentos opcionais a qualquer momento nas configurações da conta ou através da API (`PUT /api/v1/privacy/consent`). A revogação do consentimento não afeta a licitude do tratamento realizado antes da revogação.

---

## 10. Cookies e Tecnologias Similares

O DominaHub utiliza:

| Tecnologia | Finalidade | Obrigatório |
|---|---|---|
| Cookie `refresh_token` | Autenticação — manter sessão ativa (httpOnly, sameSite=strict, secure) | Sim |
| `localStorage` | Preferências de interface (tema, configurações visuais) | Sim |

**Não utilizamos** cookies de rastreamento, pixels de terceiros, scripts de analytics externos ou fingerprinting de dispositivo.

---

## 11. Transferência Internacional de Dados

Seus dados são armazenados em servidores da **AWS** localizados nos Estados Unidos. Essa transferência é realizada com base em **Cláusulas Padrão Contratuais (SCCs)**, que fornecem garantias adequadas de proteção conforme o LGPD Art. 33 II.

Da mesma forma, os dados de faturamento são processados pelo **Stripe** (EUA) sob SCCs.

---

## 12. Menores de Idade

O DominaHub é destinado exclusivamente a **maiores de 18 anos**. Não coletamos conscientemente dados de menores. Se identificarmos que coletamos dados de um menor de 18 anos, excluiremos esses dados imediatamente. Se você acredita que um menor forneceu dados à plataforma, entre em contato com **dpo@dominahub.com.br**.

---

## 13. Alterações nesta Política

Podemos atualizar esta política periodicamente. Quando houver alterações materiais:

- Você será notificado por e-mail com **30 dias de antecedência**
- A versão anterior ficará disponível para consulta
- Sua continuidade no uso da plataforma após a data de vigência da nova versão implica aceitação das mudanças
- Caso não concorde com as alterações, você pode solicitar a exclusão da conta

O histórico de versões desta política está disponível abaixo (Seção 15).

---

## 14. Contato e Reclamações

**Encarregado de Proteção de Dados (DPO):**
- Nome: [Nome do DPO]
- E-mail: dpo@dominahub.com.br
- Endereço: [Endereço completo]

**Para privacidade e dados:**
- E-mail: privacidade@dominahub.com.br

**Autoridade Nacional de Proteção de Dados (ANPD):**
Se você acredita que seus direitos não foram atendidos, você pode apresentar reclamação à ANPD:
- Site: [gov.br/anpd](https://www.gov.br/anpd)

---

## 15. Histórico de Versões

| Versão | Data de Vigência | Principais Alterações |
|---|---|---|
| 1.0 | 05 de março de 2026 | Versão inicial |

---

*Esta política foi elaborada em conformidade com a Lei nº 13.709/2018 (LGPD), o Regulamento Geral sobre Proteção de Dados da UE (GDPR) e as recomendações da ANPD.*
