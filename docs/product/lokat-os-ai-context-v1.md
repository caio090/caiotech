# LOKAT OS — AI Context Model v1

**Sprint:** Recalibração LOKAT OS 2026-08
**Status:** Formalização conceitual. Nenhuma IA contextual nova implementada.

## O que já existe

`src/lib/ai-suggestions.ts` (`getContentOSSuggestions`, consumido por
`SmartSuggestionsPanel` em `producao/page.tsx`) — sugestões pontuais
dentro de UM módulo (REC OS), sem hierarquia, sem contexto de Company
ou Project (que ainda não existem como entidades formais). Este é o
único ponto de IA contextual real no repositório hoje; tudo abaixo é
formalização de para onde essa peça evolui, não substituição dela.

## Hierarquia de contexto

```
GLOBAL    "Quais empresas precisam da minha atenção?"
COMPANY   "O que está travando esta empresa?"
PROJECT   "O que falta para concluir este projeto?"
MODULE    "Quais oportunidades precisam de follow-up?"
ITEM      "Me ajude a executar esta atividade."
```

Cada nível é um ESCOPO de contexto, não um chat separado — a mesma IA
responde em qualquer nível, só muda o que é montado para ela.

## AI Context Pack — o que pode ser incluído

```
workspace
company
company_dna
diagnosis
project
work_items
recent_events
approvals
crm_summary
content_summary
calendar_summary
metrics
data_quality
integrations
documents/references
```

**Regra:** nunca montar isso "cegamente" (mandar tudo sempre). Cada
inclusão precisa responder:

- **Escopo** — em que nível (Global/Company/Project/Module/Item) essa informação é relevante?
- **Relevância** — essa informação muda a resposta para a pergunta atual?
- **Limites** — até onde no tempo/volume essa informação entra (ex.: "últimos 30 dias de eventos", não o histórico inteiro)?
- **Privacidade** — essa informação pode ser vista pela pessoa que está fazendo a pergunta (client visibility, ver NIS)?
- **Provenance** — de onde veio (qual módulo/tabela), para poder ser auditado depois?
- **Confidence** — o dado é `confirmed`/`calculated`/`estimated`/`incomplete`/`divergent`/`unknown`? (Escala já existente em `DataConfidence`, Data Hub Core 2.1 — reaproveitada, não reinventada, conforme já feito por `business-strategy/*`.)

## Autonomia — sugerir ≠ executar

```
LEVEL 0   explica
LEVEL 1   sugere
LEVEL 2   gera draft
LEVEL 3   executa após confirmação explícita
LEVEL 4+  futuro
```

**Decisão para o MVP:** nenhuma alteração destrutiva silenciosa. Exemplo
de fluxo aceitável no MVP: IA sugere plano semanal → usuário aprova →
Work Items são criados (Level 3, sempre com confirmação explícita antes
de qualquer escrita).

## Prioridade — sinais visíveis, não "misteriosos"

IA pode INTERPRETAR sinais, mas a prioridade final apresentada ao
usuário precisa ser rastreável a sinais concretos:

```
deadlines
blockers
dependencies
revenue_impact
risk
project_stage
overdue
approvals
data_quality
```

Nunca apresentar um score/prioridade sem poder mostrar, se perguntado,
quais desses sinais o geraram — mesma exigência de explicabilidade já
formalizada para scores de Company (ver
`docs/architecture/lokat-os-entity-centric-v1.md`, seção Company Card:
"IA não pode simplesmente inventar '74% de saúde'").

## Não fazer

- Não implementar nenhum nível de autonomia além do que já existe (`ai-suggestions.ts`, Level 1).
- Não montar um "contexto pack" real nesta sprint.
- Não introduzir uma segunda escala de confiança — reaproveitar `DataConfidence`.
