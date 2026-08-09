# LKT — Lokat Orchestration Framework v1

**Sprint:** Recalibração Corrections 2026-08.2
**Status:** Formalização conceitual. Nenhum runtime, bus, ou motor implementado.

## LKT não é módulo

LKT é um FRAMEWORK/LIFECYCLE de orquestração — um padrão de raciocínio
recorrente que pode orientar qualquer coisa que evolua ao longo do
tempo dentro do LOKAT OS: a evolução de uma Company, um Project, uma
Campaign, ou uma melhoria operacional. Não é uma tela, não é uma tabela,
não é um agente específico.

```
CONTEXT
   ↓
DIAGNOSIS
   ↓
DIRECTION
   ↓
INITIATIVE
   ↓
ARCHITECTURE
   ↓
CONNECTIONS
   ↓
EXECUTION
   ↓
MEASUREMENT
   ↓
LEARNING
   ↓
UPDATED CONTEXT (fecha o loop — nunca um fim absoluto)
```

Ao contrário de um fluxo linear com fim ("projeto entregue, fim"), o LKT
é um LOOP: `LEARNING` sempre realimenta `CONTEXT`, porque toda execução
muda o que se sabe sobre a Company/Project/Campaign.

## Relação com a Central de Projetos

`docs/product/lokat-os-mvp-2026-08.md` já descreve um motor específico
para projetos client-facing:

```
Opportunity → Diagnosis → Strategy → Offer → Architecture → Scope
→ Deliverables → Work → Execution → Measurement → Closure → Learning
→ Productization
```

**Esta não é uma segunda framework concorrente — é uma APLICAÇÃO
específica do loop LKT geral**, para o caso particular de "transformar
uma oportunidade comercial em um projeto entregue e, possivelmente, num
produto replicável (productization)". A correspondência:

| LKT (geral) | Central de Projetos (aplicação a projeto client-facing) |
|---|---|
| CONTEXT | Opportunity |
| DIAGNOSIS | Diagnosis |
| DIRECTION | Strategy |
| INITIATIVE | Offer |
| ARCHITECTURE | Architecture / Scope |
| CONNECTIONS | (implícito em Scope/Deliverables — quais módulos/integrações o projeto usa) |
| EXECUTION | Work / Execution |
| MEASUREMENT | Measurement |
| LEARNING | Learning |
| UPDATED CONTEXT | Closure → Productization (o aprendizado vira contexto reutilizável, inclusive para replicar como oferta) |

Outras aplicações do MESMO loop LKT, formalizadas apenas conceitualmente
aqui (nenhuma implementação):

- **Company evolution** — o loop se repete cada vez que a Company muda de fase (nova rodada de diagnóstico, nova direção, novas iniciativas).
- **Campaign** — versão mais curta do loop, focada em marketing/comunicação/aquisição/conversão/retenção.
- **Operational Improvement** — versão do loop para melhorias internas de processo, sem necessariamente virar um Project formal.

## O que o LKT NÃO é

- Não é um Event Bus (`Domain Events`, formalizado separadamente em `lokat-os-module-connectivity-map-v1.md`, é a camada técnica; LKT é o raciocínio que decide QUANDO um evento importa).
- Não é a Gota Neural (a Gota Neural pode usar o LKT como um dos modelos de raciocínio que aplica, mas o LKT existe independentemente de qualquer IA — é útil mesmo como checklist manual).
- Não substitui Initiative Classification (`lokat-os-activation-v1.md`) — a classificação decide QUAL aplicação do LKT usar (projeto, campanha, melhoria operacional); o LKT é o loop que roda depois dessa decisão.

## Non-goals desta sprint

Nenhum motor, bus, scheduler, ou runtime implementado. Este documento é
puramente conceitual — formaliza um vocabulário e uma estrutura de
raciocínio compartilhada, para que sprints futuras de implementação não
inventem uma quarta forma de descrever o mesmo loop.
