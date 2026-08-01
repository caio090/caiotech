# Rotina do Negócio — Sprint REC OS 3.0.1

**Estado: `planned`.** Registrado como subexperiência futura **dentro de**
Meu Negócio — não um módulo principal novo ("Meu Escritório" explicitamente
não criado, conforme o ticket).

## Visões planejadas

- **Hoje**: foco, tarefas, reuniões, pendências, follow-ups, entregas,
  financeiro, notas, fechamento do dia.
- **Semana**: prioridades, metas, compromissos, atrasos, resultados,
  revisão, próxima semana.
- **Mês**: metas, realizado, decisões, aprendizados, faturamento,
  despesas, campanhas, documentos, pendências, próximo mês.

## Relação com o que já existe

Reaproveitaria dados já reais de Meu Negócio (Financeiro, Metas — Sprint
Meu Negócio 2.1.2, `src/lib/business-strategy/`) e do REC OS
(follow-ups, aprovações pendentes) — nunca uma segunda fonte de verdade
para faturamento, metas ou tarefas.

## Sem persistência

Nenhuma tabela nova, nenhuma migration — a subexperiência, quando
implementada, deve ler das mesmas fontes já em memória/Supabase que os
módulos correspondentes já usam.

## Próximos passos

Prototipar só a visão "Hoje" primeiro (menor escopo, maior valor
imediato), consumindo `MeuDiaBlock` (`src/app/admin/dashboard/_meu-dia.tsx`,
já existe como equivalente no dashboard da agência) como referência de
padrão, antes de generalizar para Semana/Mês.
