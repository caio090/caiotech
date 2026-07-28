import type { BusinessAlert, CmvChangeEffect, CmvEvolutionPoint, CommandCenterMetric, CommerceDataProviderCapability, ProductCatalogItem } from "./types";

const calculatedAt = "2026-07-01T12:00:00.000Z";
const periodStart = "2026-06-01";
const periodEnd = "2026-06-30";
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (value: number) => `${value.toFixed(1).replace(".", ",")}%`;

function metric(input: Omit<CommandCenterMetric, "trace"> & { formula: string; inputs: Array<{ label: string; value: number; unit: string; source: string }> }): CommandCenterMetric {
  return { ...input, trace: { metricId: input.id, metricLabel: input.label, formulaLabel: input.tooltip, formulaExpression: input.formula, periodStart, periodEnd, dataNature: input.nature, dataSources: [...new Set(input.inputs.map((item) => item.source))], inputs: input.inputs, includedRecords: 248, excludedRecords: 7, coverage: input.confidence === "high" ? 0.96 : 0.82, warnings: input.state === "simulated" ? ["Exemplo simulado; não representa dados reais."] : [], calculationVersion: "command-center-v1", calculatedAt, target: null, result: input.value, unit: input.formattedValue.includes("%") ? "%" : "BRL", linksToFixData: [{ label: "Corrigir base", destination: input.destination }] } };
}

export const COMMAND_CENTER_METRICS: CommandCenterMetric[] = [
  metric({ id: "sales", label: "Vendas realizadas", value: 10000000, formattedValue: brl(10000000), comparison: "+8,4%", period: "Junho de 2026", source: "Cardápio digital simulado", updatedAt: calculatedAt, nature: "simulated", confidence: "medium", state: "simulated", tooltip: "Soma das vendas consideradas", destination: "reports", formula: "Σ vendas", inputs: [{ label: "Vendas", value: 10000000, unit: "centavos", source: "Cardápio digital simulado" }] }),
  metric({ id: "orders", label: "Pedidos", value: 248, formattedValue: "248", comparison: "+12", period: "Junho de 2026", source: "Cardápio digital simulado", updatedAt: calculatedAt, nature: "simulated", confidence: "medium", state: "simulated", tooltip: "Pedidos únicos no período", destination: "reports", formula: "contagem de pedidos únicos", inputs: [{ label: "Pedidos únicos", value: 248, unit: "pedidos", source: "Cardápio digital simulado" }] }),
  metric({ id: "ticket_average", label: "Ticket médio", value: 40323, formattedValue: brl(40323), comparison: "+3,1%", period: "Junho de 2026", source: "Cálculos Lokat", updatedAt: calculatedAt, nature: "calculated", confidence: "medium", state: "simulated", tooltip: "Vendas divididas por pedidos", destination: "reports", formula: "vendas ÷ pedidos", inputs: [{ label: "Vendas", value: 10000000, unit: "centavos", source: "Cardápio digital simulado" }, { label: "Pedidos", value: 248, unit: "pedidos", source: "Cardápio digital simulado" }] }),
  metric({ id: "cmv_actual", label: "CMV real", value: 37, formattedValue: pct(37), comparison: "+1,8 p.p.", period: "Junho de 2026", source: "Inventário + Compras", updatedAt: calculatedAt, nature: "calculated", confidence: "medium", state: "simulated", tooltip: "Consumo real sobre vendas", destination: "cmv_menu", formula: "(estoque inicial + compras - estoque final) ÷ vendas", inputs: [{ label: "Estoque inicial", value: 1200000, unit: "centavos", source: "Inventário simulado" }, { label: "Compras", value: 3500000, unit: "centavos", source: "Compras simuladas" }, { label: "Estoque final", value: 1000000, unit: "centavos", source: "Inventário simulado" }, { label: "Vendas", value: 10000000, unit: "centavos", source: "Cardápio digital simulado" }] }),
  metric({ id: "cmv_theoretical", label: "CMV teórico", value: 33, formattedValue: pct(33), comparison: "meta 32%", period: "Junho de 2026", source: "Fichas técnicas", updatedAt: calculatedAt, nature: "calculated", confidence: "medium", state: "simulated", tooltip: "Consumo esperado sobre vendas", destination: "technical_sheets", formula: "consumo teórico ÷ vendas", inputs: [{ label: "Consumo teórico", value: 3300000, unit: "centavos", source: "Fichas técnicas simuladas" }, { label: "Vendas", value: 10000000, unit: "centavos", source: "Cardápio digital simulado" }] }),
  metric({ id: "cmv_gap", label: "Lacuna de CMV", value: 4, formattedValue: "4,0 p.p.", comparison: brl(400000), period: "Junho de 2026", source: "Cálculos Lokat", updatedAt: calculatedAt, nature: "calculated", confidence: "medium", state: "simulated", tooltip: "Diferença entre CMV real e teórico", destination: "cmv_menu", alert: "Acima da meta simulada", formula: "CMV real - CMV teórico", inputs: [{ label: "CMV real", value: 37, unit: "%", source: "Cálculos Lokat" }, { label: "CMV teórico", value: 33, unit: "%", source: "Cálculos Lokat" }] }),
  metric({ id: "cash_balance", label: "Saldo atual", value: 1845000, formattedValue: brl(1845000), comparison: "+5,2%", period: "Junho de 2026", source: "Fluxo de caixa simulado", updatedAt: calculatedAt, nature: "simulated", confidence: "low", state: "simulated", tooltip: "Entradas menos saídas acumuladas", destination: "finance", formula: "saldo inicial + entradas - saídas", inputs: [{ label: "Saldo", value: 1845000, unit: "centavos", source: "Fluxo de caixa simulado" }] }),
  metric({ id: "stock_value", label: "Valor em estoque", value: 1000000, formattedValue: brl(1000000), comparison: "-4,0%", period: "30/06/2026", source: "Inventário simulado", updatedAt: calculatedAt, nature: "simulated", confidence: "medium", state: "simulated", tooltip: "Quantidade por custo médio", destination: "stock", formula: "Σ quantidade × custo médio", inputs: [{ label: "Estoque final", value: 1000000, unit: "centavos", source: "Inventário simulado" }] }),
  metric({ id: "reserve_days", label: "Cobertura sem vendas", value: 18, formattedValue: "18 dias", comparison: "meta 30 dias", period: "Junho de 2026", source: "Cálculos Lokat", updatedAt: calculatedAt, nature: "calculated", confidence: "low", state: "simulated", tooltip: "Caixa disponível sobre gasto médio diário", destination: "finance", alert: "Reserva abaixo da meta simulada", formula: "caixa disponível ÷ gasto médio diário", inputs: [{ label: "Cobertura", value: 18, unit: "dias", source: "Cálculos Lokat" }] }),
];

export const COMMAND_CENTER_ALERTS: BusinessAlert[] = [
  { id: "cmv-gap", priority: "high", title: "CMV real acima do teórico", explanation: "Há 4 p.p. ainda não explicados.", impact: "Pode reduzir a margem do período.", origin: "Cálculos Lokat", sector: "CMV", action: "Conferir inventário e compras", destination: "cmv_menu", suggestedOwner: "Gestor de operações", status: "open" },
  { id: "missing-sheet", priority: "medium", title: "Produto sem ficha completa", explanation: "Um produto vendido não tem custo integral.", impact: "Reduz a cobertura do CMV teórico.", origin: "Fichas técnicas", sector: "Produtos", action: "Completar ficha", destination: "products_pricing", suggestedOwner: "Cozinha", status: "open" },
  { id: "reserve", priority: "medium", title: "Reserva abaixo da meta", explanation: "A cobertura simulada é de 18 dias.", impact: "Menor proteção contra queda de vendas.", origin: "Financeiro", sector: "Financeiro", action: "Revisar plano de reserva", destination: "finance", suggestedOwner: "Financeiro", status: "monitoring" },
];

export const PRODUCT_CATALOG_FIXTURES: ProductCatalogItem[] = [
  { id: "smash", image: null, name: "Smash de Exemplo", category: "Hambúrgueres", code: "SM-001", status: "active", source: "simulated", externalMapping: { externalLabel: "Smash Clássico", state: "linked", technicalSheetLabel: "Ficha Técnica Smash V2" }, technicalSheet: { id: "sheet-smash-v2", label: "Ficha Técnica Smash V2", version: "2", completeness: "complete", coverage: 1 }, costCents: 862, portionCostCents: 862, priceCents: 2500, cmv: 34.48, marginCents: 1638, costStatus: "current", updatedAt: calculatedAt, alerts: [], attachments: [] },
  { id: "combo", image: null, name: "Combo da Casa", category: "Combos", code: "CB-002", status: "active", source: "digital_menu", externalMapping: { externalLabel: "Combo Duh", state: "suggested", technicalSheetLabel: null }, technicalSheet: { id: null, label: "Sem ficha", version: null, completeness: "missing_sheet", coverage: 0 }, costCents: null, portionCostCents: null, priceCents: 3290, cmv: null, marginCents: null, costStatus: "missing", updatedAt: "2026-05-10T12:00:00.000Z", alerts: ["Confirmar vínculo sugerido", "Criar ficha técnica"], attachments: [] },
  { id: "batata", image: null, name: "Batata Especial", category: "Acompanhamentos", code: "AC-003", status: "draft", source: "spreadsheet", externalMapping: { externalLabel: "Batata G", state: "unlinked", technicalSheetLabel: "Ficha Batata V1" }, technicalSheet: { id: "sheet-batata-v1", label: "Ficha Batata V1", version: "1", completeness: "incomplete", coverage: 0.68 }, costCents: 690, portionCostCents: 690, priceCents: 1600, cmv: 43.13, marginCents: 910, costStatus: "stale", updatedAt: "2026-04-15T12:00:00.000Z", alerts: ["Custo desatualizado", "Produto externo não vinculado"], attachments: [] },
];

export const CMV_EVOLUTION: CmvEvolutionPoint[] = [
  { period: "Abr.", actual: 34.1, theoretical: 32.2, target: 32, gap: 1.9, coverage: .91, state: "estimated", source: "Exemplo simulado", note: "Cobertura parcial" },
  { period: "Mai.", actual: 35.2, theoretical: 32.8, target: 32, gap: 2.4, coverage: .93, state: "estimated", source: "Exemplo simulado", note: "Cobertura parcial" },
  { period: "Jun.", actual: 37, theoretical: 33, target: 32, gap: 4, coverage: .96, state: "calculated", source: "Exemplo simulado", note: "Demonstração determinística" },
];
export const CMV_CHANGE_EFFECTS: CmvChangeEffect[] = [
  { id: "cost", label: "Efeito do custo", percentagePoints: 0.9, state: "estimated", explanation: "Variação estimada dos custos vigentes." },
  { id: "price", label: "Efeito do preço", percentagePoints: -0.2, state: "estimated", explanation: "Efeito estimado do preço praticado." },
  { id: "mix", label: "Efeito do mix", percentagePoints: 0.6, state: "estimated", explanation: "Mudança na participação dos produtos." },
  { id: "discount", label: "Efeito de desconto", percentagePoints: null, state: "incomplete", explanation: "Dados de desconto insuficientes." },
  { id: "operational", label: "Efeito operacional não explicado", percentagePoints: null, state: "incomplete", explanation: "Requer inventário e perdas com maior cobertura." },
];

export const OLACLICK_CAPABILITIES: CommerceDataProviderCapability[] = [
  { resource: "orders", state: "available", source: "Rota server-side /api/olaclick/orders", lastTest: null, note: "Implementado; disponibilidade runtime não testada nesta branch." },
  { resource: "order_items", state: "available", source: "Leitura agregada de pedidos", lastTest: null, note: "Implementado com diagnóstico de completude." },
  { resource: "products", state: "not_tested", source: "/api/olaclick/products-sold", lastTest: null, note: "Implementado, sem teste runtime nesta sprint." },
  { resource: "categories", state: "not_implemented", source: "Adapter OlaClick", lastTest: null, note: "Endpoint oficial não confirmado." },
  { resource: "modifiers", state: "not_implemented", source: "Adapter OlaClick", lastTest: null, note: "Não implementado." },
  { resource: "customers_summary", state: "not_implemented", source: "Adapter OlaClick", lastTest: null, note: "Somente agregado quando disponível." },
  { resource: "payments", state: "available", source: "Métricas de pedidos", lastTest: null, note: "Extração implementada, cobertura variável." },
  { resource: "discounts", state: "available", source: "Métricas de pedidos", lastTest: null, note: "Extração implementada." },
  { resource: "fees", state: "available", source: "Métricas de pedidos", lastTest: null, note: "Extração implementada." },
  { resource: "service_types", state: "available", source: "Métricas de pedidos", lastTest: null, note: "Extração implementada." },
  { resource: "order_sources", state: "available", source: "Métricas de pedidos", lastTest: null, note: "Extração implementada." },
  { resource: "cancellations", state: "available", source: "Status de pedidos", lastTest: null, note: "Disponível quando retornado pelo provider." },
  { resource: "refunds", state: "not_implemented", source: "Adapter OlaClick", lastTest: null, note: "Não implementado." },
  { resource: "reports", state: "available", source: "Relatório de faturamento", lastTest: null, note: "Relatório interno implementado." },
];

