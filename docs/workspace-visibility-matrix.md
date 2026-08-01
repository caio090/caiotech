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

## Nota — Sprint LOKAT Core 2.1 (mapa de módulos)

`src/config/platform-modules.ts` introduz `ModuleSurface = WorkspaceSurface |
"operational_user"` para a matriz de visibilidade de módulo na página
`/admin/ecossistema`. `"operational_user"` é **conceitual, não uma nova
WorkspaceSurface real** — não altera `src/lib/workspaces/types.ts` nem
`workspace-capabilities.ts`, e não introduz uma nova autorização paralela.
É só uma granularidade a mais para descrever "um usuário operacional dentro
de agency/direct_business", já que hoje não existe esse sub-papel na
autorização real (todo usuário autenticado herda a superfície inteira). Esta
matriz continua sendo a fonte de verdade para o que é de fato bloqueado no
servidor.

## Nota — Sprint Recovery 2.1.3 (isolamento futuro do CRM adaptativo)

`docs/crm/crm-surface-matrix.md` registra a visibilidade futura do CRM
adaptativo por superfície (`CRM_SURFACE_VISIBILITY` em
`src/lib/crm-adaptive/types.ts`). Quando implementado, deve reaproveitar
`workspace-capabilities.ts` como única fonte de autorização — não introduz
uma segunda árvore de permissões. `tenant_isolation` e
`crm_workspace_isolation` (ambos `priority: "P1"`/`"P0"` em
`project-status.ts`) tratam esse isolamento como gate de segurança, não
como feature de produto.

## Nota — Sprint REC OS 3.0.1 (bottom nav por superfície)

`MobileBottomNav` ganhou um prop opcional `surface` (Fase 31) — quando
informado, usa `SURFACE_BOTTOM_NAV_PRIMARY[surface]`
(`src/lib/mobile-shell/types.ts`) filtrado contra os itens que a
capability do usuário já libera, nunca concedendo acesso novo. Hoje só é
resolvido com segurança para preview ativo do Super Admin
(`previewContext.surface`) e para a sessão real de `super_admin` — para
sessões reais de agency/agency_client/direct_business fora de preview, a
superfície ainda não é resolvida por `_layout-client.tsx` (cai no
comportamento anterior, sem regressão). Ver
`docs/mobile/mobile-app-shell.md`.

## Nota — Sprint Navegação e Experiência 3.0.1.2

Meu Escritório (/admin/escritorio) reaproveita o mesmo isolamento já
documentado aqui (staff admin/super_admin via requireAdminContentOSContext()) --
nenhuma matriz de visibilidade nova. resolveCrmWorkspaceContext()
(src/lib/crm/workspace-context.ts) registra honestamente que o CRM
(waitlist_entries) ainda não tem segmentação por workspace/agência/cliente --
ver docs/crm/crm-workspace-context.md.
