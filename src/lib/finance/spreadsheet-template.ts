/**
 * Builds the downloadable "Modelo da Lokat" workbook (Fase 13) using the
 * `xlsx` (SheetJS) package — client-side only, no server round trip. Called
 * from a click handler, never on mount/automatically.
 */

import * as XLSX from "xlsx";

const README_ROWS: string[][] = [
  ["Modelo de planilha Lokat — Meu Negócio"],
  [""],
  ["Este arquivo é um modelo. Preencha as abas com os dados do seu negócio e importe de volta em Meu Negócio → Financeiro → Dados e planilhas."],
  [""],
  ["Campos a preencher"],
  ["Preencha manualmente: descrição, valor, categoria, datas, quantidade, unidade e custo unitário nas abas correspondentes."],
  [""],
  ["Campos calculados"],
  ["Não preencha colunas de total, margem ou saldo — esses valores são recalculados automaticamente na importação."],
  [""],
  ["Planejado x Realizado"],
  ["Planejado é o valor esperado antes do período acontecer. Realizado é o valor que efetivamente entrou ou saiu do caixa. Use a coluna Status (planejado/pago/recebido/atrasado) para diferenciar."],
  [""],
  ["Teórico x Real"],
  ["Teórico é o que a ficha técnica ou o orçamento diz que deveria acontecer. Real é o que realmente foi medido ou movimentado. Divergências grandes entre os dois merecem investigação, não são prova de erro."],
  [""],
  ["Formato de datas"],
  ["Use sempre DD/MM/AAAA (formato brasileiro), por exemplo 27/07/2026."],
  [""],
  ["Formato monetário"],
  ["Use vírgula como separador decimal, por exemplo 1.234,56. Não inclua o símbolo R$ dentro da célula."],
  [""],
  ["Unidades"],
  ["Preencha a unidade de cada insumo/produto exatamente como usada na operação (kg, g, l, ml, un)."],
  [""],
  ["Campos obrigatórios"],
  ["Descrição, valor e data são obrigatórios em todas as abas de movimentação. Linhas sem esses três campos são rejeitadas na importação."],
  [""],
  ["Como importar de volta"],
  ["Vá em Meu Negócio → Financeiro → Dados e planilhas → Importar planilha, selecione este arquivo preenchido e revise a proposta de importação antes de confirmar. Nada é aplicado automaticamente."],
];

const CASH_FLOW_ROWS: string[][] = [
  ["Descrição", "Direção (entrada/saída)", "Categoria", "Valor (R$)", "Data de vencimento", "Data efetiva", "Status", "Forma de pagamento"],
  ["Ex.: Venda balcão — sábado", "entrada", "vendas", "1250,00", "27/07/2026", "27/07/2026", "recebido", "pix"],
  ["Ex.: Aluguel do salão", "saída", "aluguel", "3200,00", "05/08/2026", "", "planejado", "boleto"],
];

const FIXED_COSTS_ROWS: string[][] = [
  ["Descrição", "Valor mensal (R$)", "Categoria", "Faturamento médio mensal (R$)"],
  ["Ex.: Aluguel", "3200,00", "aluguel", "45000,00"],
];

const VARIABLE_COSTS_ROWS: string[][] = [
  ["Descrição", "Valor (R$)", "Categoria", "% do faturamento (opcional)"],
  ["Ex.: Taxas de maquininha", "890,00", "taxas_maquininha", "2,5"],
];

const REVENUES_ROWS: string[][] = [
  ["Descrição", "Valor planejado (R$)", "Valor realizado (R$)", "Período", "Status"],
  ["Ex.: Vendas de julho", "45000,00", "42300,00", "07/2026", "parcial"],
];

const INGREDIENTS_ROWS: string[][] = [
  ["Insumo", "Unidade", "Quantidade de compra", "Valor de compra (R$)", "Valor unitário (R$, calculado)"],
  ["Ex.: Pão de hambúrguer", "un", "50", "75,00", ""],
];

const PRODUCTS_ROWS: string[][] = [
  ["Produto", "Custo com insumos (R$, calculado)", "Custo fixo (R$)", "Embalagem (R$)", "Custo total (R$, calculado)", "Preço (R$)", "Status", "Margem (%, calculado)", "Ficha técnica"],
  ["Ex.: Smash Duplo", "", "1,20", "0,90", "", "28,90", "ativo", "", "smash-duplo"],
];

const TECHNICAL_SHEETS_ROWS: string[][] = [
  ["Ficha técnica", "Insumo", "Quantidade usada", "Unidade", "Fator de correção"],
  ["Ex.: Smash Duplo", "Pão de hambúrguer", "1", "un", "1,00"],
  ["Ex.: Smash Duplo", "Carne bovina 90g", "2", "un", "1,08"],
];

export interface LokatTemplateWorkbookMeta {
  fileName: string;
  sheetNames: string[];
}

export function buildLokatTemplateWorkbook(): { workbook: XLSX.WorkBook; meta: LokatTemplateWorkbookMeta } {
  const workbook = XLSX.utils.book_new();
  const sheets: Array<[string, string[][]]> = [
    ["LEIA-ME", README_ROWS],
    ["FLUXO DE CAIXA", CASH_FLOW_ROWS],
    ["CUSTOS FIXOS", FIXED_COSTS_ROWS],
    ["CUSTOS VARIÁVEIS", VARIABLE_COSTS_ROWS],
    ["RECEITAS", REVENUES_ROWS],
    ["INSUMOS", INGREDIENTS_ROWS],
    ["PRODUTOS", PRODUCTS_ROWS],
    ["FICHAS TÉCNICAS", TECHNICAL_SHEETS_ROWS],
  ];

  for (const [name, rows] of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }

  return { workbook, meta: { fileName: "modelo-lokat-meu-negocio.xlsx", sheetNames: sheets.map(([name]) => name) } };
}

/** Triggers a browser download of the template — call only from a click handler. */
export function downloadLokatTemplate(): void {
  const { workbook, meta } = buildLokatTemplateWorkbook();
  XLSX.writeFile(workbook, meta.fileName);
}
