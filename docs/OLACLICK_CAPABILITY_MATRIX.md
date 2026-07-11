# OlaClick Capability Matrix

Documentação baseada exclusivamente no que está implementado em
`src/app/api/olaclick/orders/route.ts`, `src/app/api/olaclick/connect/route.ts`,
`src/app/api/olaclick/connections/route.ts` e
`src/app/api/olaclick/connections/[id]/route.ts`.

Nenhum endpoint especulativo foi incluído.

---

## 1. Endpoints do Provider OlaClick (chamadas de saída)

| Nome | Endpoint | Método | Autenticação | Filtros enviados | Paginação | Status | Limitações conhecidas |
|---|---|---|---|---|---|---|---|
| Listar pedidos | `{baseUrl}/v1/orders` | GET | Bearer ou x-api-key (auto-probe) | `filter[start_date]`, `filter[end_date]`, `sort=-created_at` | `page` + `limit` (page\_limit) | Implementado | O provider pode ignorar o param `page`; aciona fallback de windowing. Provider total pode ser global (não filtrado por período). |
| Produtos mais vendidos | `{baseUrl}/v1/orders/products-sold` | GET | Bearer ou x-api-key | `filter[start_date]`, `filter[end_date]` | Nenhuma | Implementado (best-effort) | Retorna 404 em algumas contas. Pode retornar quantity=0 em todos os itens. Falha silenciosa: cai no fallback de detalhes. |
| Detalhe de pedido | `{baseUrl}/v1/orders/{id}` | GET | Bearer ou x-api-key | Nenhum | Nenhuma | Implementado (fallback) | Só é chamado quando `/v1/orders` retornou pedidos sem itens. Máximo 20 IDs, concorrência 3. Retorna 404 em algumas contas. |

### Detalhes da autenticação auto-probe

O código tenta `Bearer {token}` primeiro. Se o provider responde 401 ou 403, alterna para
`x-api-key: {token}`. O modo escolhido é fixado para toda a sessão de coleta.

### Paginação adaptativa

A rota tenta paginação padrão (`page` + `limit`, convenção `page_limit`).  
Se o provider ignora o parâmetro `page` (duplicatas detectadas ou `current_page` não avança),
aciona **windowing**:

- **Datetime windowing**: divide o intervalo ao meio recursivamente (máx. 12 níveis) se o
  provider suporta `filter[start_date]` com precisão de timestamp ISO.
- **Daily fallback**: coleta dia a dia se o provider não diferencia filtros intraday.

Ambas as estratégias têm limite de 200 requisições e 10.000 pedidos únicos por chamada.

---

## 2. Endpoints Internos LOKAT OS — OlaClick

| Nome | Endpoint | Método | Autenticação | Parâmetros | Paginação | Status | Limitações conhecidas |
|---|---|---|---|---|---|---|---|
| Métricas de pedidos | `/api/olaclick/orders` | GET | Sessão Supabase (qualquer autenticado) | `client_id` (obrigatório), `period` ou `start_date`+`end_date`, `force_refresh=1` | Gerenciada internamente | Implementado | `maxDuration=60s`. Cache de instância (5 min, perdido no cold start). |
| Listar conexões | `/api/olaclick/connections` | GET | Sessão Supabase | — | Nenhuma | Implementado | Apenas roles: `admin`, `super_admin`, `agency`, `operacional`. Nunca retorna `access_token`. |
| Criar conexão | `/api/olaclick/connect` | POST | Sessão Supabase | `client_id`, `connection_name`, `access_token`, `api_base_url?`, `notes?` | N/A | Implementado | Roles: `admin`, `super_admin`, `agency`. Upsert via RPC; fallback direto pode criar duplicatas se RPC estiver ausente. |
| Excluir conexão | `/api/olaclick/connect?id=` | DELETE | Sessão Supabase | `id` (query param) | N/A | Implementado | Roles: `admin`, `super_admin`, `agency`. |
| Editar conexão | `/api/olaclick/connections/[id]` | PATCH | Sessão Supabase | `connection_name?`, `access_token?`, `api_base_url?`, `notes?` | N/A | Implementado | Roles: `admin`, `super_admin`, `agency`. Token só é atualizado se vier preenchido; caso contrário, preserva o atual. |

---

## 3. Campos da Resposta de Métricas (`/api/olaclick/orders`)

O campo `data` retorna os seguintes campos computados a partir dos pedidos coletados:

| Campo | Tipo | Fonte |
|---|---|---|
| `faturamento_total` | number | Soma de `total_price` / `total_amount` / `total` por pedido |
| `total_pedidos` | number | Contagem de pedidos únicos |
| `ticket_medio` | number \| null | `faturamento_total / total_pedidos` |
| `pedidos_por_status` | Record\<string,number\> \| null | Campo `status` / `order_status` / `state` |
| `produtos_mais_vendidos` | array \| null | De `/v1/orders/products-sold`, fallback de items embutidos, fallback de detalhes |
| `melhores_dias` | array \| null | Top 5 dias por faturamento |
| `pedidos_recentes` | array | Últimos 10 pedidos |
| `heatmap` | array | Distribuição por dia-da-semana × hora (fuso: America/Fortaleza) |
| `pedidosPorServiceType` | Record\<string,number\> | Campo `service_type` / `type` normalizado |
| `pedidosPorSource` | Record\<string,number\> | Campo `source` / `channel` / `origin` |
| `totalDescontos` | number | Campo `discount` / `discount_amount` / `total_discount` |
| `totalTaxasEntrega` | number | Campo `delivery_fee` / `shipping_fee` / `freight` |
| `totalGorjetas` | number | Campo `tip` / `gratuity` / `tip_amount` |
| `concentracaoPorFaixa` | Record\<faixa,{orders,revenue}\> | Faixas: madrugada/manhã/tarde/noite (Fortaleza) |

---

## 4. Comportamento de Completude

| Valor de `completeness` | Significado |
|---|---|
| `complete` | Provider confirmou total filtrado e todos os pedidos foram coletados |
| `partial` | Coleta interrompida (rate limit, timeout, janelas parciais) |
| `operational_only` | Provider ignorou paginação e retornou só a primeira página |
| `unknown` | Não foi possível determinar se a coleta é completa |

Snapshots são persistidos em `client_business_snapshots` apenas quando `completeness === "complete"`.
