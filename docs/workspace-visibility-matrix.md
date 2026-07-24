# Matriz de visibilidade — Workspaces 1.0

Gerada na Sprint Workspaces 1.0. Reflete `src/config/workspace-capabilities.ts`
(fonte de verdade — esta tabela é documentação, não o código).

> Esta matriz cobre **visibilidade** (o que cada superfície pode ver). Para
> **enforcement de escrita** durante um preview do Super Admin (o que pode ser
> mutado), ver `docs/workspace-preview-security.md`, adicionado no hotfix
> 1.0.1.

| Superfície | Vê a própria estrutura | Vê outras agências | Vê empresas diretas da plataforma | Vê clientes de agência | Status técnico global |
|---|---|---|---|---|---|
| **Super Admin** | Sim (plataforma inteira) | Sim | Sim | Somente com preview/grant | Sim |
| **Agência** | Sim (própria agência + próprios clientes) | Não | Não | Não (só os seus) | Não |
| **Cliente da agência** | Sim (próprio negócio) | Não | Não | Não (só o seu, identificação básica da agência responsável) | Não |
| **Empresa direta** | Sim (próprio negócio) | Não | Não (nem outras empresas diretas) | Não (não possui carteira) | Não |

## Isolamento garantido nesta sprint

- **Agência → Agência**: nenhuma consulta em `src/lib/workspaces/preview.ts` ou
  `src/app/api/admin/workspaces/route.ts` retorna dados de uma agência ao
  resolver outra — cada resolução é escopada por `workspace_id` único.
- **Cliente → Cliente**: `agency_clients` é sempre filtrado por
  `client_id`/`agency_id` explícitos; nenhuma rota lista clientes de uma
  agência para quem não seja o Super Admin (via preview) ou a própria agência
  (fora do escopo desta sprint — painel real da agência ainda não lê
  `agency_clients` para popular sua própria carteira, ver "Não feito" no
  relatório final).
- **Empresa direta → Carteira**: `direct_business` nunca lista outros
  workspaces — `resolveWorkspacePreview` retorna exatamente 1 workspace por
  chamada.
- **Agência → Status técnico**: `platform.view_status` só está em
  `SUPER_ADMIN_CAPABILITIES` — nenhuma outra superfície a possui.

## Matriz de mutação por superfície (Fase 5 do hotfix 1.0.2)

Consolida `docs/workspace-mutation-inventory.md` por módulo e superfície —
"Bloqueado" significa uma rota real com `withMutationProtection`;
"Em memória" significa que não há nada a bloquear porque nada persiste
ainda; "N/A" significa que o módulo não é exposto a essa superfície.

| Módulo | Agência | Cliente da agência | Empresa direta |
|---|---|---|---|
| Clientes | Bloqueado (4 rotas: criar, convite, editar/arquivar, hard-delete/restore/bulk) | N/A | N/A |
| REC OS | Bloqueado (rascunhos, aprovação, produção, rec-projects) | Bloqueado (mesmas rotas, capability `client_portal.*`) | Bloqueado (mesmas rotas, capability `business.*`) |
| Relatórios | Bloqueado (upload, interpretação IA) | N/A (só leitura de calendário/resultados) | Bloqueado (upload, interpretação IA) |
| Equipe | Bloqueado (convite, delete-test-account) | N/A | Bloqueado (convite) |
| Financeiro | N/A (sem card Financeiro na superfície Agência) | Bloqueado (leitura apenas — sem mutação exposta em `/client/financeiro`) | Bloqueado (6 rotas de cobrança/pagamento + coupons) |
| Integrações | N/A | N/A | Bloqueado (OlaClick, Meta) |
| Meu Negócio | N/A | Em memória (não é exposto à superfície `agency`, só `direct_business`/`client_portal` conceitualmente) | Em memória (nada a bloquear) |
| CRM | N/A — nenhuma superfície expõe CRM hoje (ver inventário) | N/A | N/A |

Toda mutação real e alcançável, em toda célula desta tabela, está
"Bloqueado". Nenhuma célula ficou marcada "pending_protection".

## Limitação declarada

Esta matriz descreve o que a **arquitetura de capacidades** permite. Ela não
substitui RLS no banco — enquanto `agency_workspaces`/`agency_clients` não
tiverem RLS aplicada e confirmada (ver `docs/supabase/69-account-types-agency-workspaces.sql`,
aplicação real não confirmada nesta sprint), o isolamento real depende de
todo acesso passar pelas funções server-side deste módulo
(`resolveWorkspacePreview`, `src/app/api/admin/workspaces/route.ts`) e nunca
de uma query direta ao Supabase a partir do cliente.
