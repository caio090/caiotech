# Diagnóstico como gateway — Sprint REC OS 3.0.1

**Estado: `planned`.** Auditoria feita, contrato registrado, nenhuma
implementação nova de UI/API.

## Auditoria

`src/app/diagnostico/` e `src/app/diagnostico-marketing/` já existem como
fluxo de captação (formulário + possível Typebot, ver
`docs/TYPEBOT_LEAD_CAPTURE_STRATEGY.md`). Hoje o resultado do diagnóstico
não alimenta automaticamente `BusinessProfile`, DNA, nicho, módulos
recomendados, CRM, REC OS, calendário ou relatórios — é um formulário de
captação de lead, não um gateway de contexto para o resto da plataforma.

## Contrato registrado (novo)

```ts
interface BusinessDiagnosticGateway {
  source: "formulario_interno" | "typebot" | "conversa_ia_futura" | "importacao" | "dados_existentes" | "preenchimento_manual";
  consumers: Array<"business_profile" | "dna" | "nicho" | "modulos_recomendados" | "terminologia" | "indicadores" | "operacao" | "crm" | "rec_os" | "calendario" | "relatorios">;
}
```

(Registrado aqui como referência conceitual — ver
`src/lib/crm-adaptive/types.ts` para o padrão de `DataConfidence`
reaproveitado quando os tipos `DiagnosticField`/`DiagnosticSection` forem
implementados.)

## Qualidade do diagnóstico (Fase 26)

Cada resposta futura precisa de: origem, confiança (reaproveitando
`DataConfidence` do Data Hub — `confirmed | calculated | estimated |
incomplete | divergent | unknown`, não uma escala nova), evidência, data,
confirmação, módulos consumidores, atualização proposta. **Nunca aplicada
automaticamente a todos os módulos** — cada consumidor decide se aceita a
atualização proposta.

## Conversa real com IA

Não implementada nesta sprint (`diagnostic_ai_conversation`,
`readiness: planned`) — mesmo princípio "sem IA falsa" de
`src/lib/intelligence/availability.ts`.

## Próximos passos

Implementar o contrato como tipos reais (`DiagnosticField` etc.) e uma
função pura de normalização do formulário atual para o formato do
gateway, antes de conectar a qualquer módulo consumidor.
