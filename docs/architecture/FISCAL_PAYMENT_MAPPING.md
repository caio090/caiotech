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
| `pix` | pix, PIX, Pix |
| `dinheiro` | cash, dinheiro, especie, espécie, money |
| `cartao_credito` | credit, credito, crédito, credit_card, visa, mastercard |
| `cartao_debito` | debit, debito, débito, debit_card |
| `cartao` | card, cartao, cartão (sem distinção crédito/débito) |
| `voucher` | voucher, vale, vale_refeicao, ticket_restaurant, vr, vt, ifood, alelo |
| `pagamento_online` | online, digital, app, link_pagamento |
| `misto` | múltiplos métodos sem valores individuais |
| `outro` | prepago, boleto, ou método reconhecível mas sem categoria acima |
| `desconhecido` | ausente ou não parseável |

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

## Modelo de completude de pagamento (V2.2.1)

O campo `paymentDataCompleteness` retornado pelo endpoint `/api/olaclick/orders` indica
a qualidade dos dados de pagamento para o período consultado:

| Valor | Significado |
|-------|-------------|
| `"complete"` | Todos os pedidos retornaram forma de pagamento |
| `"partial"` | Pelo menos 1 pedido retornou; pelo menos 1 não retornou |
| `"unavailable"` | Nenhum pedido retornou forma de pagamento |
| `"unknown"` | Não há pedidos no período para determinar completude |

### Pedido misto (`misto`)

Quando um pedido usa múltiplas formas de pagamento e a API **não** retorna os valores
individuais de cada forma, o pedido é classificado como `misto` e o faturamento total
é atribuído inteiramente a essa categoria. Isso evita duplicação de receita.

Quando a API retorna valores individuais (`payment.amount` por entry), é realizado
rateio proporcional — mas apenas se `sum(amounts) > 0`.

### Reconciliação

- `faturamentoPorFormaPagamento` soma sempre o `total` do pedido, nunca o valor de item
- A soma de `faturamentoPorFormaPagamento` deve ser igual a `faturamento_total`
- Desvios são causados por arredondamento de ponto flutuante (< 0,01 R$) e são aceitáveis
- `pedidosPorFormaPagamento["desconhecido"]` + `paymentOrdersWithData` = `total_pedidos`

### Campos rastreados por pedido recente

O array `pedidos_recentes` inclui o campo `payment: string | null` com a forma
normalizada (única) ou `"misto"` para múltiplas. Nunca expõe valores brutos da API.

## Restrições

- Não emitir nota fiscal em nenhuma circunstância sem SQL-87 validado
- Não registrar CNPJ, CPF, valor individual ou item de pedido em logs
- Não ativar FiscalDocumentProvider em produção antes de contrato com provider fiscal
- Não expor payload bruto da OlaClick — apenas campos normalizados
