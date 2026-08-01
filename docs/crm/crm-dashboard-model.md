# Modelo de Dashboards do CRM — Sprint Recovery 2.1.3

`CrmDashboardMode`, `CRM_DASHBOARD_ESSENTIAL_WIDGETS`,
`CRM_DASHBOARD_MANAGER_WIDGETS` em `src/lib/crm-adaptive/types.ts`.
Nenhuma tela implementada nesta sprint.

## Visão Essencial

Novos leads, leads quentes, follow-ups de hoje, follow-ups atrasados,
propostas abertas, valor em negociação, conversão, próxima ação.

## Visão Gestor

Funil, conversão por etapa, tempo por etapa, origem, responsável, valor,
previsão, perdas, motivos, temperatura, SLA de follow-up, cohort,
recorrência, comparação de períodos, nicho, produto, canal.

## Mesma fonte

Os dois modos devem consumir exatamente a mesma fonte de dados — o mesmo
princípio já aplicado em Meu Negócio (Visão simples / Modo Gestor, Sprint
Meu Negócio 2.1.2): a diferença é densidade e explicação, nunca dois
cálculos separados que podem divergir.

## Próximos passos

Implementar a Visão Essencial primeiro (menos widgets, menor risco de
divergência) sobre dado real de um único nicho antes de generalizar a
Visão Gestor.
