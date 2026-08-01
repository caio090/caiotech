# Matriz de superfícies do CRM Adaptativo — Sprint Recovery 2.1.3

`CRM_SURFACE_VISIBILITY` em `src/lib/crm-adaptive/types.ts`. Registro de
visibilidade futura — não há enforcement real ainda.

| Superfície | Vê próprio CRM | Vê CRM de outro workspace | Regra de acesso cruzado |
|---|---|---|---|
| **Super Admin** | Sim (CRM comercial da própria Lokat) | Não | Nunca misturado com leads internos de clientes |
| **Agência** | Sim (leads de novos clientes, propostas, negociações, contratos, renovações, follow-ups, indicações) | Condicional | Só quando cliente possuir módulo ativo + capability permitir + relacionamento válido + workspace correto |
| **Cliente da Agência** | Sim, quando contratado | Não | Nunca vê o CRM comercial da agência, leads de outros clientes ou oportunidades da plataforma |
| **Empresa Direta** | Sim, adaptado por nicho (campos, pipeline, score, dashboards, follow-up, terminologia, automações, indicadores) | Não | — |
| **Usuário Operacional** | Não (só leads atribuídos) | Não | Não vê configurações globais nem outras carteiras |

## Por que Super Admin e Agência nunca se misturam com clientes

O CRM do Super Admin é sobre a **plataforma** (leads da Lokat, agências e
empresas interessadas, onboarding, expansão, upsell, churn, suporte
comercial) — um domínio comercial completamente diferente do CRM que um
cliente usa para vender seus próprios produtos/serviços. Misturar os dois
seria um vazamento de dado comercial entre a Lokat e seus clientes.

## Isolamento planejado

Quando implementado, o isolamento deve reaproveitar
`src/lib/workspaces/workspace-capabilities.ts` (a única camada real de
autorização hoje) — nunca criar uma segunda árvore de permissões paralela,
seguindo o mesmo princípio já aplicado a `operational_user` em
`platform-modules.ts` (conceitual, nunca uma `WorkspaceSurface` real
adicional só porque o CRM precisa dele).
