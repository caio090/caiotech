(function () {
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("node:fs") as typeof import("node:fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("node:path") as typeof import("node:path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fixtures = require("../../../../lib/business-command-center/fixtures.ts") as typeof import("../../../../lib/business-command-center/fixtures");
const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/app/admin/meu-negocio/_product-command-center.tsx"), "utf8");
let passed = 0; let failed = 0;
const assert = (condition: boolean, label: string) => { if (condition) { passed++; console.log(`  ok - ${label}`); } else { failed++; console.error(`  FAIL - ${label}`); } };

console.log("\n[test] fixture Smash disponível para o QA de regressão");
{
  const smash = fixtures.PRODUCT_CATALOG_FIXTURES.find((item) => item.id === "smash");
  assert(Boolean(smash) && smash!.name === "Smash de Exemplo", "produto Smash existe no catálogo demonstrativo");
}

console.log("\n[test] Editar ficha abre o drawer (bug relatado no QA visual)");
{
  assert(source.includes("onClick={() => setSelectedProductId(product.id)}"), "botão Editar/Criar ficha seleciona o produto e abre o drawer");
  assert(source.includes("{selectedProduct && <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedProductId(null)} />}"), "drawer é renderizado apenas quando há produto selecionado");
  assert(!/setProducts/.test(source.split("function ProductDetailDrawer")[1] ?? ""), "abrir/fechar o drawer não muta a lista de produtos");
}

console.log("\n[test] acessibilidade do drawer de produto");
{
  const drawer = source.split("function ProductDetailDrawer")[1] ?? "";
  assert(drawer.includes('role="dialog"') && drawer.includes('aria-modal="true"'), "role dialog e aria-modal presentes");
  assert(drawer.includes("aria-labelledby=\"product-detail-title\"") && drawer.includes('id="product-detail-title"'), "título associado ao dialog via aria-labelledby");
  assert(drawer.includes("closeButton.current?.focus()"), "foco inicial vai para o botão Fechar");
  assert(drawer.includes('event.key === "Escape"') && drawer.includes("onClose()"), "ESC fecha o drawer");
  assert(drawer.includes('aria-label="Fechar"'), "botão Fechar identificado por aria-label");
  assert(drawer.includes("previous?.focus()"), "foco retorna ao elemento que abriu o drawer (o botão Editar ficha)");
  assert(drawer.includes("removeEventListener(\"keydown\", onKeyDown)"), "listener de teclado é removido ao fechar (sem vazamento)");
  assert(drawer.includes("focus-visible:ring"), "foco visível no botão Fechar");
}

console.log("\n[test] conteúdo mínimo do drawer");
{
  const drawer = source.split("function ProductDetailDrawer")[1] ?? "";
  for (const field of ["Categoria", "Código", "Origem", "Ficha técnica", "Versão", "Custo por porção", "Preço", "CMV", "Margem", "Vínculo", "Como calculamos"]) {
    assert(drawer.includes(field), `drawer exibe ${field}`);
  }
  assert(drawer.includes("product.alerts"), "drawer exibe alertas do produto quando existirem");
  assert(drawer.includes("Exemplo simulado"), "drawer deixa claro que os valores são demonstrativos");
}

console.log(`[result] ${passed} passed, ${failed} failed`); if (failed) process.exitCode = 1;
})();
