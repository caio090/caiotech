# Arquitetura de Dados Multi-Tenant — Lokat OS

*Criado: 2026-07-06. Status: Definição conceitual — não migrar sem planejamento.*

---

## 1. Tipos de Entidade

| Entidade                | Descrição                                                                | Tabela atual / Prevista            |
|-------------------------|--------------------------------------------------------------------------|------------------------------------|
| **Lokat interna**       | Equipe Lokat — acesso irrestrito ao sistema                              | `auth.users` + `profiles.role = super_admin/admin` |
| **Cliente direto**      | Empresa ou agência que assina diretamente a plataforma                   | `profiles` + `organizations` (futuro) |
| **Agência assinante**   | Agência que usa a plataforma para gerir múltiplos clientes               | `profiles.account_type = agency`   |
| **Cliente de agência**  | Marca/empresa atendida pela agência — não acessa a plataforma diretamente (ainda) | `clients` + `agency_clients` (futuro) |
| **Cliente convidado**   | Pessoa que recebeu convite de acesso restrito via link                   | `client_invites` + `client_user_access` |
| **Lead / Interessado**  | Pessoa que demonstrou interesse mas ainda não tem conta                  | `launch_waitlist`                  |
| **Signup legado**       | Cadastro antigo anterior à waitlist estruturada                          | `admin_signups_view` (view de leitura) |
| **Arquivo / Projeto**   | Artes, briefings, vídeos, documentos vinculados a clientes ou projetos   | Supabase Storage (Fase 1) → `file_metadata` (futuro) |

---

## 2. Separação Recomendada de Tabelas

### Identidade e Acesso

```
auth.users          — identidade real (email, senha, OAuth)
profiles            — role, account_type, client_id, subscription
client_invites      — convites de acesso limitado por link/token
client_user_access  — vínculo usuário ↔ cliente
```

### Organizações e Clientes

```
organizations / workspaces   — empresas/agências como entidade (futuro)
clients                      — marcas/empresas atendidas
agency_clients               — vínculo agência → cliente (futuro)
```

### Leads e Pipeline de Cadastro

```
launch_waitlist       — interessados no beta (fonte primária)
admin_signups_view    — view legada de cadastros antigos (somente leitura por ora)
marketing_diagnostics — diagnósticos de marketing local preenchidos
```

### Produção e Conteúdo

```
rec_items / contentos    — planos de conteúdo vinculados a clientes
rec_briefs               — briefings de projetos audiovisuais
calendar_items           — calendário editorial
content_approvals        — aprovações por link externo
```

### Finanças e Planos

```
subscriptions / billing  — planos, trial, cancellation
olaclick_connections     — vínculo com cardápio digital
financial_snapshots      — resumo de faturamento por cliente
```

### Integrações Externas

```
meta_connections         — tokens OAuth Meta/Instagram por usuário
client_meta_assets       — vínculo ativo Meta → cliente
data_sources             — outras fontes de dados (manuais, planilhas)
```

---

## 3. Regras Obrigatórias

1. **Todo conteúdo precisa de `owner_id` ou `workspace_id` + `client_id`.**
2. **Todo arquivo precisa de `storage_owner_id` e política de retenção.**
3. **Todo lead precisa de `source` e `status`.**
4. **Nunca misturar cliente interno da Lokat com cliente de agência sem `owner_type`.**
5. **Não apagar `auth.users` automaticamente ao arquivar um lead.**
6. **Hard delete somente com confirmação explícita do usuário (duplo `confirm`).**
7. **Service role nunca é usada em chamadas do browser — apenas em Route Handlers server-side.**
8. **Tokens OAuth (Meta, OlaClick) nunca retornam em respostas de API públicas.**

---

## 4. Storage — Estratégia por Camada

| Tipo de arquivo         | Onde guardar                   | Por quê                              |
|-------------------------|-------------------------------|--------------------------------------|
| Thumbnails, avatars     | Supabase Storage (público)    | Acesso rápido via URL                |
| Artes aprovadas, previews | Supabase Storage (privado, signed URL) | Controle de acesso por prazo |
| Briefings, contratos    | Supabase Storage (privado)    | Retenção simples, sem dependência    |
| Projetos grandes (vídeo bruto, fotos RAW) | Google Drive (Fase 2) | Volume, colaboração por pasta       |
| Entrega de cliente final | Google Drive ou link externo  | O cliente já usa Drive               |

> Ver `docs/STORAGE_AND_DRIVE_STRATEGY.md` para detalhes.

---

## 5. Decisões de Migração

- **Não implementar `organizations/workspaces` agora** — risco de quebrar RLS existente.
- **`admin_signups_view`**: fonte legada somente leitura. Antes de ativar ações de delete/archive, identificar a tabela base via SQL Editor (`SELECT pg_get_viewdef('public.admin_signups_view', true)`).
- **`launch_waitlist`** é a fonte oficial de leads novos — todas as inscrições beta vão para ela.
- **`profiles`** permanece a fonte de verdade sobre `role` e `account_type` para usuários autenticados.
- **Futuro**: criar `organizations` como camada central para agências e seus clientes; migrar gradualmente.

---

## 6. Como descobrir a tabela base de admin_signups_view

Execute no Supabase SQL Editor:

```sql
SELECT pg_get_viewdef('public.admin_signups_view', true);
```

Isso retorna o SQL completo que define a view. A tabela base será visível no `FROM` ou no `JOIN`.

---

*Atualizar este documento quando decisões de migração forem tomadas.*
