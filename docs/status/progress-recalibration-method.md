# Método de recalibração do progresso — Sprint Recovery 2.1.3

## Estado atual (não alterado nesta sprint)

```
V1_PROGRESS = 81
V2_PROGRESS = 12
global_calendar.readiness = "qa_pending"
```

Auditados nesta sprint, **não recalibrados** — não há evidência formal de
QA em Production que justifique mudar esses números agora. A próxima
recalibração só ocorre após `official_domain_qa` (ver
`src/config/delivery-status.ts`).

## Origem dos números atuais

`V1_PROGRESS`/`V2_PROGRESS` são constantes fixadas manualmente por sprints
anteriores, comentadas como "IMUTÁVEL — alterar apenas após QA formal" no
próprio `project-status.ts`. Não existe hoje uma fórmula que os derive
automaticamente — são um julgamento humano histórico, não um cálculo. Esta
sprint não substitui esse julgamento; documenta como o próximo cálculo
formal deve funcionar.

## Princípio

**Código pronto não equivale a produto pronto.** Um módulo pode ter
`readiness: "implemented"` ou até `"deployed"` e ainda não estar validado
— falta a sessão de QA real, o dado real, o uso real.

## Como a próxima recalibração deve funcionar

1. **Módulos ponderados** — nem todo módulo pesa igual. Um módulo P0
   (segurança, isolamento, autenticação) que falha vale mais que um
   módulo P3 concluído.
2. **Código** — existe e compila (`tsc`, `build`, ESLint limpos).
3. **QA** — passou por todos os `ValidationStage` exigidos em
   `MODULE_VALIDATION_REQUIREMENTS` (ver `src/config/delivery-status.ts`)
   para aquele módulo especificamente, não um QA genérico.
4. **Production** — o build publicado é o mesmo commit auditado, sem
   drift entre o que foi testado e o que está no ar.
5. **Dados reais** — quando o módulo depende de dado real (não
   fixture/demo), houve pelo menos uma validação com dado real
   (`real_data_validation`).
6. **Integração** — quando o módulo depende de outro sistema (Supabase,
   OlaClick, Google, WhatsApp), a integração foi exercitada de verdade
   (`integration_validation`), não só o contrato compilando.
7. **Uso real** — o módulo foi usado por uma pessoa de verdade cumprindo
   uma tarefa real, não só clicado durante QA.
8. **Evidência** — cada uma das dimensões acima precisa de uma evidência
   registrada (`validationEvidence` em `ProjectAreaStatus`), não uma
   afirmação sem lastro.
9. **Bloqueios** — nenhum P0 aberto (`releaseBlocker` ou `blockers`) pode
   coexistir com um percentual mais alto do que o anterior.

## O que isso NÃO significa

- Não significa que `V1_PROGRESS`/`V2_PROGRESS` vão necessariamente subir
  na próxima recalibração — podem cair, se o QA formal revelar que menos
  está pronto do que o número atual sugere. O objetivo é honestidade, não
  otimismo.
- Não significa recalcular a cada sprint — só após um marco de QA formal
  em Production (ver `docs/roadmap/august-2026-mvp-recovery.md`,
  checkpoint de 05/08).
