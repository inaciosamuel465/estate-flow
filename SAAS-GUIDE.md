# EstateFlow — Guia do SaaS

## Visão Geral

EstateFlow é um SaaS (Software as a Service) multi-inquilino para imobiliárias.  
Cada imobiliária é um **inquilino (tenant)** dentro do mesmo sistema, com seus próprios dados isolados via `company_id`.

### Arquitetura em 3 camadas

```
Browser (React SPA)  →  API Layer (Vercel Serverless)  →  Neon PostgreSQL
```

- **Frontend único**: mesma aplicação React para todas as imobiliárias, o que muda é o slug na URL (`/minha-empresa/...`)
- **API unificada**: endpoints Vercel Serverless compartilhados, autenticação por JWT (master) ou CompanyContext (imobiliária)
- **Banco único**: tabelas separadas por `company_id` — não há schema ou database por inquilino

---

## Identidade Única (Unified Brand)

Todas as imobiliárias compartilham a **mesma identidade visual do EstateFlow**. Não há white-label total.

| Aspecto | Comportamento |
|---------|---------------|
| Marca | "EstateFlow" — exibida no sidebar, header, emails |
| Cores primárias | Definidas em `company_settings`, fallback para o azul padrão (#4f46e5) |
| Logo | Configurável por imobiliária (via AdminSettings) |
| Domínio | Único: `estateflow.com` — cada imobiliária acessa via slug (`/meu-slug`) |
| Personalização | Logo, cores, WhatsApp, Instagram, SMTP — **nunca** remove a marca EstateFlow |

**Por que?**  
Porque o produto é um SaaS de gestão imobiliária com marca própria, não uma plataforma de white-label.  
As imobiliárias usam a ferramenta, não "compram o código".

---

## Como Criar uma Nova Imobiliária

### Fluxo A — Autocadastro (Público)

Qualquer pessoa pode solicitar uma conta na landing page (`/`).

```
1. Usuário acessa SaasHome (/)
2. Clica em "Criar Imobiliária"
3. Preenche:
   - Nome da imobiliária
   - Nome do administrador
   - Email do administrador
   - Telefone
4. Submete → POST /api/agency/request
5. Solicitação criada com status "pending"
6. Usuário vê: "Aguarde aprovação do administrador"

───

7. Master admin acessa /master/login
8. Vai em "Solicitações" (RequestsList.tsx)
9. Revisa os dados e clica "Aprovar"
10. POST /api/agency/approve é chamado
11. Sistema cria automaticamente:
    ┌─────────────────────────────────────┐
    │ companies (1 linha)                  │
    │ subscriptions (1 linha, free/trial)  │
    │ company_settings (1 linha)           │
    │ users (1 admin)                      │
    └─────────────────────────────────────┘
12. Imobiliária ativada! Admin faz login em /login
```

### Fluxo B — Criação Direta pelo Master

O master admin pode criar imobiliárias manualmente em `CompaniesList.tsx`.

```
1. Master vai em /master → "Empresas"
2. Clica "Nova Imobiliária"
3. Preenche: nome, slug, email, telefone
4. Confirma → sistema insere companies + subscriptions + company_settings
5. Imobiliária criada com status "active" e plano "free"
```

---

## O que é Criado para Cada Imobiliária

### Tabelas de Configuração (1 row cada)

| Tabela | Conteúdo |
|--------|----------|
| `companies` | id, name, slug, status='active', plan='free', subscription_status='trialing', visible=true |
| `subscriptions` | plan_name='free', status='trialing', trial=true |
| `company_settings` | company_name (personalizável: logo, cores, SMTP, WhatsApp, etc.) |
| `users` | 1 admin (nome, email, senha com hash SHA-256, role='admin') |

### Tabelas de Dados (isoladas por company_id)

Cada imobiliária tem seus próprios registros em:
- `properties` — imóveis
- `contracts` — contratos de aluguel/venda
- `leads` — leads capturados
- `users` — corretores, proprietários, clientes
- `notifications` — notificações do sistema
- `activity_log` — histórico de ações
- `marketing_campaigns` — campanhas de marketing
- `property_views` — visualizações de imóveis
- `uploads` — arquivos enviados
- `push_subscriptions` — inscrições push

### Tabelas Globais (compartilhadas)

- `master_users` — admins do sistema (login em /master)
- `saas_settings` — configurações globais (nome do plano, preço)
- `agency_requests` — solicitações de cadastro pendentes
- `system_settings` — chaves PIX, configs do sistema
- `payments` — histórico de pagamentos

---

## Planos e Assinatura

### Modelo

- Plano único "Mensal" (preço configurável em `saas_settings`, default R$ 170)
- Toda imobiliária nova começa como **free trial** (`plan='free'`, `subscription_status='trialing'`)
- Enquanto estiver em trial ou active, a imobiliária funciona normalmente

### Fluxo de Pagamento

```
1. Admin vai em /plans → vê preço e status
2. Clica "Assinar Agora"
3. POST /api/subscriptions/create-preference
4. Redirecionado ao Mercado Pago
5. Paga (cartão, PIX, boleto)
6. Mercado Pago envia webhook → POST /api/subscriptions/webhook
7. Sistema atualiza: companies.subscription_status = 'active'
```

Se Mercado Pago não estiver configurado, o sistema retorna modo sandbox (pagamento simulado).

### Verificação de Acesso

Em `CompanyContext.tsx`:
```
isSubscriptionActive = subscription_status === 'active' || subscription_status === 'trialing'
```

---

## Isolamento entre Imobiliárias

### Como o sistema sabe qual imobiliária está acessando?

`CompanyContext.tsx` resolve o tenant nesta ordem:

1. **Subdomínio** — `minha-empresa.estateflow.com` → extrai `minha-empresa`
2. **Path slug** — `/minha-empresa/admin/dashboard` → extrai `minha-empresa`
3. **LocalStorage** — fallback para dados previamente armazenados

Paths reservados (ignorados na resolução): `master`, `plans`, `login`, `advertise`, `contrato`, `payment`

### Como os dados são isolados no banco?

Toda query usa `getCompanyId()` (que lê do localStorage) para filtrar:

```sql
SELECT * FROM properties WHERE company_id = ${companyId}
```

Esse filtro é aplicado em **todas** as operações CRUD das tabelas por inquilino.

---

## API — Endpoints Principais

### Públicos
| Rota | Função |
|------|--------|
| `POST /api/agency/request` | Solicitar nova imobiliária |
| `GET /api/master/saas-settings` | Obter config global do plano |

### Master (requer JWT)
| Rota | Função |
|------|--------|
| `POST /api/master/login` | Login do master admin |
| `GET /api/agency/list-requests` | Listar solicitações pendentes |
| `POST /api/agency/approve` | Aprovar/rejeitar solicitação |
| `POST /api/master/update-company` | Atualizar dados da imobiliária |
| `GET/POST /api/master/saas-settings` | Configurar plano global |
| `POST /api/master/send-billing-email` | Enviar email de cobrança |

### Assinatura
| Rota | Função |
|------|--------|
| `POST /api/subscriptions/create-preference` | Criar checkout Mercado Pago |
| `GET /api/subscriptions/status` | Status da assinatura |
| `POST /api/subscriptions/webhook` | Webhook de pagamento |

---

## Resumo do Onboarding (Passo a Passo)

```
Visitante                        Master Admin                      Imobiliária
────────                         ────────────                      ──────────
                                                                   
1. Acessa /                                                          
2. Clica "Criar Imobiliária"                                        
3. Preenche formulário                                               
4. "Aguarde aprovação"                                               
                                                                   
                   5. Login em /master                               
                   6. Vê solicitação pendente                        
                   7. Clica "Aprovar"                                
                   8. Sistema cria empresa + admin                   
                                                                   
                                    9. Admin recebe credenciais      
                                    10. Login em /login              
                                    11. Acessa /{slug}/admin         
                                    12. Configura logo, cores, etc   
                                    13. Cadastra imóveis, usuarios   
                                    14. Opcional: assina plano       
```

---

## Personalização Permitida

Cada imobiliária pode configurar via `AdminSettings.tsx`:

| Item | Onde |
|------|------|
| Logo da imobiliária | company_settings.logo_url |
| Cor primária | company_settings.primary_color |
| Cor secundária | company_settings.secondary_color |
| WhatsApp | company_settings.whatsapp |
| Instagram | company_settings.instagram |
| SMTP (email próprio) | company_settings.smtp_* |
| Nome do remetente | company_settings.email_sender_name |

**Não é possível**: remover a marca "EstateFlow", usar domínio próprio, ou alterar o layout global do sistema.
