# Arquitetura do CRM Adaptativo — Sprint Recovery 2.1.3

**CRM adaptativo não implementado.** Este documento registra a
arquitetura futura — `src/lib/crm-adaptive/types.ts` tem os contratos
(tipos + rótulos), sem tela, API, tabela ou persistência. O CRM real hoje
é a área `crm` de `src/config/project-status.ts` (leads, funil,
oportunidades, coluna Instagram, perfis 4-way) — este trabalho não o
altera.

## Núcleo universal

`CrmLead`, `CrmContact`, `CrmCompany`, `CrmOpportunity`, `CrmPipeline`,
`CrmStage`, `CrmActivity`, `CrmHistoryEntry`, `CrmTask`, `CrmDocument`,
`CrmMessage`, `CrmTag`, `CrmSegment` — mais `CrmLeadTemperature`, score,
probabilidade, valor, próxima ação e motivo de perda como campos de
`CrmLead`/`CrmOpportunity` (não tipos próprios, já que descrevem esses
dois núcleos).

O núcleo é universal: os pacotes de nicho (ver
`crm-niche-adapters.md`) adaptam linguagem, campos visíveis, indicadores e
terminologia **sobre** este núcleo — nunca duplicam ou copiam os tipos.

## Por que "adaptativo"

O mesmo princípio de `business-niche-packs.ts`: um pacote nunca copia um
módulo, adapta campos/indicadores/terminologia sobre o módulo universal.
O CRM adaptativo aplica essa mesma lógica ao domínio comercial.

## Superfícies e nichos

Ver `crm-surface-matrix.md` e `crm-niche-adapters.md`.

## IA futura do CRM

`CRM_INTELLIGENCE_CAPABILITIES` (`src/lib/crm-adaptive/types.ts`):
resumir lead, sugerir próxima ação/follow-up, identificar lead esfriando,
detectar falta de resposta, classificar intenção, preparar reunião, gerar
plano de fechamento, identificar objeções, sugerir perguntas, revisar
proposta, prever risco, analisar perda.

`CRM_INTELLIGENCE_FORBIDDEN_AUTO_ACTIONS` — a IA nunca decide sozinha:
fechar lead, descartar, alterar valor, enviar mensagem, prometer condição,
alterar pipeline, mover oportunidade. Toda ação exige revisão humana ou
uma regra explícita — mesmo princípio "sem IA falsa" de
`src/lib/intelligence/availability.ts`.

## O que esta sprint NÃO fez

- Nenhuma tabela nova no Supabase.
- Nenhuma rota de API nova.
- Nenhuma tela nova.
- Nenhuma migration.
- Nenhuma integração externa (WhatsApp, e-mail, discador).
- Nenhum motor de temperatura/score calculando de verdade.
- Nenhuma automação de follow-up enviando mensagem.

## Nota — Sprint REC OS 3.0.1 (CRM mobile é diferente de CRM adaptativo)

Esta sprint implementou uma experiência **mobile** para o CRM real hoje
(`crm`/`crm_leads_clientes` — leads/funil/oportunidades), não o CRM
adaptativo descrito neste documento. Ver
`docs/mobile/crm-mobile-experience.md`. O CRM adaptativo continua
inteiramente `planned`, sem nenhuma implementação nova.

## Próximos passos (fora desta sprint)

1. Desenhar o schema real (SQL) só depois de `official_domain_qa` do MVP
   P0/P1 atual, para não competir por atenção com os gates de release
   mais urgentes.
2. Implementar `CrmSurfaceVisibility` como enforcement real, reaproveitando
   `workspace-capabilities.ts` — nunca uma segunda autorização paralela.
3. Prototipar um nicho por vez (Alimentação primeiro, mesmo arquétipo já
   real no Centro de Comando) antes de generalizar para os demais.

## Nota — Sprint Navegação e Experiência 3.0.1.2

CRM adaptativo completo continua fora do escopo (nenhum motor de
temperatura, nenhuma automação de follow-up criados nesta sprint). O que
foi corrigido: rota canônica única (/admin/leads + alias /admin/crm),
remoção de entrada duplicada na navegação, e o vazamento de
SUPABASE_SERVICE_ROLE_KEY na UI (ver docs/crm/crm-safe-data-access.md).
resolveCrmWorkspaceContext() documenta o estado real de segmentação
(platform-wide hoje) para orientar a evolução adaptativa futura sem
fingir que ela já existe.
