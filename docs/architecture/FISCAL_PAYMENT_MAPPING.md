# Fiscal & Payment — Contratos V2.2

## FiscalDocumentProvider (TypeScript contract only)

Este arquivo define apenas a interface TypeScript. Nenhum módulo de emissão está ativo.
Não há integração com SEFAZ, NF-e, NFS-e ou qualquer ERP.

```typescript
/**
 * Contract for future fiscal document integration.
 * No implementation is active. Do not activate until SQL-87 is validated.
 */
export interface FiscalDocumentProvider {
  readonly name: string;
  readonly version: string;

  /**
   * Returns whether the provider is configured for a given client.
   * Does NOT emit or activate any document.
   */
  isConfigured(clientId: string): Promise<boolean>;

  /**
   * Returns supported document types for the provider.
   * Types: "nfe" | "nfse" | "nfce" | "sat"
   */
  supportedDocumentTypes(): string[];

  /**
   * Validates that the order data contains the minimum fields
   * required for a fiscal document (CNPJ, items, totals).
   * Returns field names that are missing — never raw values.
   */
  validateOrderFields(
    order: Record<string, unknown>
  ): Promise<{ valid: boolean; missingFields: string[] }>;
}
```

## Tipos de pagamento normalizados (OlaClick)

| Chave normalizada | Sinônimos detectados |
|-------------------|----------------------|
| `cartao_credito` | credit, credito, crédito |
| `cartao_debito` | debit, debito, débito |
| `pix` | pix |
| `dinheiro` | cash, dinheiro, especie, espécie |
| `voucher` | voucher, vale |
| `pagamento_online` | online, digital |
| `desconhecido` | (qualquer outro ou ausente) |

## Campos candidatos de pagamento (OlaClick v1/orders)

O endpoint `/v1/orders` pode retornar pagamento em múltiplos formatos:

| Caminho | Tipo esperado | Prioridade |
|---------|---------------|------------|
| `payment_method` | string | 1 |
| `paymentMethod` | string | 2 |
| `payment_type` | string | 3 |
| `paymentType` | string | 4 |
| `forma_pagamento` | string | 5 |
| `metodo_pagamento` | string | 6 |
| `payment.method` | string (objeto) | 7 |
| `payments[].method` | string (array) | 8 |
| `payment_methods[].type` | string (array) | 9 |

Use `/api/olaclick/payment-methods/diagnostics?client_id=X` para identificar
qual(is) campo(s) o cliente específico usa — sem expor valores.

## Restrições

- Não emitir nota fiscal em nenhuma circunstância sem SQL-87 validado
- Não registrar CNPJ, CPF, valor individual ou item de pedido em logs
- Não ativar FiscalDocumentProvider em produção antes de contrato com provider fiscal
