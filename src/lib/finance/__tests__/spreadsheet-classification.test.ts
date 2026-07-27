/**
 * Real behavioral tests for src/lib/finance/spreadsheet-classification.ts —
 * no jest/vitest in this project (established pattern).
 *
 *   node src/lib/finance/__tests__/spreadsheet-classification.test.ts
 */
(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require("../spreadsheet-classification.ts") as typeof import("../spreadsheet-classification");
const { detectHeaderRowIndex, suggestSheetType, suggestColumnMapping, suggestDataClassification, analyzeSheet } = mod;

let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) { passed++; console.log(`  ok   - ${label}`); }
  else { failed++; console.error(`  FAIL - ${label}`); }
}

console.log("[test] detectHeaderRowIndex — encontra a linha de cabeçalho mesmo com linhas em branco antes");
{
  const rows = [
    ["", "", ""],
    ["Fluxo de caixa — julho 2026", "", ""],
    ["Descrição", "Valor", "Data"],
    ["Venda balcão", "1250,00", "27/07/2026"],
  ];
  assert(detectHeaderRowIndex(rows) === 2, "identifica a linha 2 (0-indexed) como cabeçalho, ignorando título e linha vazia");
}

console.log("\n[test] detectHeaderRowIndex — retorna null quando não há cabeçalho reconhecível");
{
  const rows = [["123", "456"], ["789", "012"]];
  assert(detectHeaderRowIndex(rows) === null, "planilha só com números não tem cabeçalho detectável");
}

console.log("\n[test] suggestSheetType — classifica pelo nome da aba e pelo cabeçalho");
{
  const cashFlow = suggestSheetType("FLUXO DE CAIXA", ["Descrição", "Valor", "Data de vencimento"]);
  assert(cashFlow.type === "cash_flow", "aba \"FLUXO DE CAIXA\" é classificada como cash_flow");
  assert(cashFlow.confidence > 0, "classificação encontrada tem confiança maior que zero");

  const unknown = suggestSheetType("Planilha7", ["Coluna A", "Coluna B"]);
  assert(unknown.type === "unknown" && unknown.confidence === 0, "sem sinal nenhum, o tipo é unknown com confiança zero — nunca inventa um palpite");
}

console.log("\n[test] suggestColumnMapping — sugere campo e confiança por coluna");
{
  const columns = suggestColumnMapping(["Descrição", "Valor", "Data de vencimento", "Coluna aleatória XYZ"], [["Venda", "100,00", "01/08/2026", "?"]]);
  assert(columns[0].suggestedField === "description", "\"Descrição\" mapeia para o campo description");
  assert(columns[1].suggestedField === "amount", "\"Valor\" mapeia para o campo amount");
  assert(columns[2].suggestedField === "dueDate", "\"Data de vencimento\" mapeia para dueDate");
  assert(columns[3].suggestedField === null, "coluna sem correspondência não recebe um campo forçado");
  assert(columns[0].confidence > 0 && columns[0].confidence <= 1, "confiança fica entre 0 e 1 (exclusive/inclusive)");
}

console.log("\n[test] suggestDataClassification — real, planejado, teórico, projetado, estimado");
{
  assert(suggestDataClassification("Vendas planejadas", []) === "planned", "\"planejadas\" no nome sugere natureza planned");
  assert(suggestDataClassification("Custo teórico da ficha técnica", []) === "theoretical", "\"teórico\" sugere natureza theoretical");
  assert(suggestDataClassification("Projeção de caixa", []) === "projected", "\"projeção\" sugere natureza projected");
  assert(suggestDataClassification("Fluxo de caixa realizado", []) === "actual", "\"realizado\" sugere natureza actual");
  assert(suggestDataClassification("Planilha genérica", []) === "unknown", "sem sinal nenhum, natureza é unknown — nunca assume actual por padrão");
}

console.log("\n[test] regressões — palavras completas, acentos, caixa e células vazias");
{
  const unrelatedColumns = suggestColumnMapping(
    ["Coluna aleatória XYZ", "PRODUÇÃO", "contabilidade", ""],
    [["?", "10", "20", ""]]
  );
  assert(unrelatedColumns.every((column) => column.suggestedField === null), "colunas desconhecidas e vazias permanecem sem mapeamento");
  assert(suggestSheetType("PRODUÇÃO", []).type === "unknown", "produção não é confundida com produtos");
  assert(suggestSheetType("contabilidade", []).type === "unknown", "contabilidade não é confundida com contas por substring");
  assert(suggestDataClassification("PROJEÇÃO DE CAIXA", []) === "projected", "projeção com acento e maiúsculas é projected");
  assert(suggestDataClassification("projecao de caixa", []) === "projected", "projecao sem acento é projected");
  assert(suggestDataClassification("", [""]) === "unknown", "texto e célula vazios permanecem unknown");
}

console.log("\n[test] analyzeSheet — monta a análise completa de uma aba");
{
  const sheet = analyzeSheet("RECEITAS", [
    ["Receitas planejadas — julho"],
    ["Descrição", "Valor planejado", "Valor realizado", "Data"],
    ["Vendas de julho", "45000,00", "42300,00", "31/07/2026"],
  ]);
  assert(sheet.headerRowIndex === 1, "detecta a linha de cabeçalho corretamente dentro da análise completa");
  assert(sheet.suggestedType === "revenues", "aba RECEITAS é classificada como revenues");
  assert(sheet.rowCount === 1, "conta 1 linha de dados após o cabeçalho");
  assert(sheet.columns.length === 4, "mapeia as 4 colunas do cabeçalho");
  assert(sheet.previewRows.length <= 6, "preview nunca extrapola o limite de 6 linhas");
}

console.log(`\n[test] finance/spreadsheet-classification — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
})();
