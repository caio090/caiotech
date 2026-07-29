"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FilePlus2, Link2, PackagePlus, Paperclip, Search, X } from "lucide-react";
import { PRODUCT_CATALOG_FIXTURES } from "@/lib/business-command-center/fixtures";
import { productMatches } from "@/lib/business-command-center/calculations";
import type { ProductAttachment, ProductCatalogItem } from "@/lib/business-command-center/types";

const brl = (cents: number | null) => cents === null ? "Indisponível" : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MAPPING = { linked: "Vinculado", suggested: "Sugestão de vínculo", unlinked: "Não vinculado", conflict: "Conflito", archived: "Produto externo arquivado" } as const;
const ORIGIN_LABEL = { digital_menu: "Cardápio digital", spreadsheet: "Planilha", manual: "Cadastro manual", simulated: "Exemplo simulado" } as const;
export function ProductCommandCenter() {
  const [products, setProducts] = useState<ProductCatalogItem[]>(PRODUCT_CATALOG_FIXTURES); const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"all" | "complete" | "attention">("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const visible = useMemo(() => products.filter((item) => productMatches(item, query, filter)), [products, query, filter]);
  const selectedProduct = selectedProductId ? products.find((item) => item.id === selectedProductId) ?? null : null;
  function attach(productId: string, file: File | null) { if (!file) return; const ext = file.name.split(".").pop()?.toLowerCase(); if (!ext || !["pdf", "xlsx", "xls", "csv", "png", "jpg", "jpeg"].includes(ext)) return; const type: ProductAttachment["type"] = ["png", "jpg", "jpeg"].includes(ext) ? "image" : ext as ProductAttachment["type"]; setProducts((current) => current.map((item) => item.id === productId ? { ...item, attachments: [...item.attachments, { id: `${productId}-${file.name}`, name: file.name, type, state: "session_only" }] } : item)); }
  return <div className="space-y-4" data-testid="product-command-center"><header className="border border-gray-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase text-purple-700">Produtos e fichas técnicas</p><h2 className="text-lg font-black">Catálogo, custos e vínculos</h2><p className="text-[11px] text-gray-600">Estado demonstrativo em memória. Nenhum vínculo é aplicado automaticamente.</p></div><button className="inline-flex items-center justify-center gap-1.5 bg-purple-600 px-3 py-2 text-xs font-bold text-white"><PackagePlus className="h-4 w-4" />Novo produto</button></div></header><div className="flex flex-col gap-2 sm:flex-row"><label className="flex flex-1 items-center gap-2 border border-gray-200 bg-white px-3"><Search className="h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, categoria ou código" className="w-full py-2.5 text-xs outline-none" /></label><div className="flex gap-1">{(["all", "complete", "attention"] as const).map((key) => <button key={key} onClick={() => setFilter(key)} className={`px-3 py-2 text-xs font-bold ${filter === key ? "bg-purple-600 text-white" : "border border-gray-200 bg-white"}`}>{key === "all" ? "Todos" : key === "complete" ? "Completos" : "Precisam atenção"}</button>)}</div></div><div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">{visible.map((product) => <article key={product.id} className="border border-gray-200 bg-white p-4"><div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center bg-gray-100 text-[10px] font-bold text-gray-500">SEM FOTO</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><h3 className="text-sm font-black">{product.name}</h3><p className="text-[10px] text-gray-500">{product.category} · {product.code}</p></div>{product.alerts.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-600" />}</div><p className="mt-2 text-[10px] text-gray-600">Fonte: {product.source === "digital_menu" ? "Cardápio digital" : product.source === "spreadsheet" ? "Planilha" : "Exemplo simulado"}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-[11px]"><div><dt className="text-gray-500">Ficha técnica</dt><dd className="font-bold">{product.technicalSheet.label}</dd></div><div><dt className="text-gray-500">Cobertura</dt><dd className="font-bold">{(product.technicalSheet.coverage * 100).toFixed(0)}%</dd></div><div><dt className="text-gray-500">Custo por porção</dt><dd className="font-bold">{brl(product.portionCostCents)}</dd></div><div><dt className="text-gray-500">Preço</dt><dd className="font-bold">{brl(product.priceCents)}</dd></div><div><dt className="text-gray-500">CMV</dt><dd className="font-bold">{product.cmv === null ? "Indisponível" : `${product.cmv.toFixed(2).replace(".", ",")}%`}</dd></div><div><dt className="text-gray-500">Margem</dt><dd className="font-bold">{brl(product.marginCents)}</dd></div></dl><div className="mt-3 border-t pt-3 text-[11px]"><p><strong>Identificado por:</strong> {product.externalMapping.externalLabel}</p><p><strong>Vínculo:</strong> {MAPPING[product.externalMapping.state]}</p><p><strong>Atualizado:</strong> {new Date(product.updatedAt).toLocaleDateString("pt-BR")}</p>{product.alerts.map((alert) => <p key={alert} className="mt-1 text-amber-700">{alert}</p>)}</div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelectedProductId(product.id)} className="inline-flex items-center gap-1 border px-2 py-1.5 text-[10px] font-bold"><FilePlus2 className="h-3 w-3" />{product.technicalSheet.id ? "Editar ficha" : "Criar ficha"}</button><button className="inline-flex items-center gap-1 border px-2 py-1.5 text-[10px] font-bold"><Link2 className="h-3 w-3" />Revisar vínculo</button><label className="inline-flex cursor-pointer items-center gap-1 border px-2 py-1.5 text-[10px] font-bold"><Paperclip className="h-3 w-3" />Anexar<input type="file" accept=".png,.jpg,.jpeg,.pdf,.xlsx,.xls,.csv" className="hidden" onChange={(event) => attach(product.id, event.target.files?.[0] ?? null)} /></label></div>{product.attachments.map((attachment) => <p key={attachment.id} className="mt-2 bg-blue-50 px-2 py-1 text-[10px] text-blue-800">{attachment.name} · somente nesta sessão</p>)}</article>)}</div>{visible.length === 0 && <div className="border border-dashed p-8 text-center text-xs text-gray-500">Nenhum produto corresponde à busca.</div>}<div className="border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-800">Imagem e PDF: extração automática em breve. Planilhas seguem o fluxo seguro existente, sempre com revisão humana.</div>{selectedProduct && <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedProductId(null)} />}</div>;
}

function ProductDetailDrawer({ product, onClose }: { product: ProductCatalogItem; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    addEventListener("keydown", onKeyDown);
    return () => { removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [onClose]);

  const margin = product.priceCents !== null && product.portionCostCents !== null ? product.priceCents - product.portionCostCents : null;
  return <div className="fixed inset-0 z-[90] bg-black/50" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
    <aside className="ml-auto flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase text-purple-700">Ficha do produto · demonstrativo</p><h2 id="product-detail-title" className="text-lg font-black">{product.name}</h2></div><button ref={closeButton} onClick={onClose} aria-label="Fechar" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"><X className="h-5 w-5" /></button></div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
        <div><dt className="text-gray-500">Categoria</dt><dd className="font-bold">{product.category}</dd></div>
        <div><dt className="text-gray-500">Código</dt><dd className="font-bold">{product.code}</dd></div>
        <div><dt className="text-gray-500">Origem</dt><dd className="font-bold">{ORIGIN_LABEL[product.source]}</dd></div>
        <div><dt className="text-gray-500">Ficha técnica</dt><dd className="font-bold">{product.technicalSheet.label}</dd></div>
        <div><dt className="text-gray-500">Versão</dt><dd className="font-bold">{product.technicalSheet.version ?? "Indisponível"}</dd></div>
        <div><dt className="text-gray-500">Cobertura</dt><dd className="font-bold">{(product.technicalSheet.coverage * 100).toFixed(0)}%</dd></div>
        <div><dt className="text-gray-500">Custo</dt><dd className="font-bold">{brl(product.costCents)}</dd></div>
        <div><dt className="text-gray-500">Custo por porção</dt><dd className="font-bold">{brl(product.portionCostCents)}</dd></div>
        <div><dt className="text-gray-500">Preço</dt><dd className="font-bold">{brl(product.priceCents)}</dd></div>
        <div><dt className="text-gray-500">CMV</dt><dd className="font-bold">{product.cmv === null ? "Indisponível" : `${product.cmv.toFixed(2).replace(".", ",")}%`}</dd></div>
        <div><dt className="text-gray-500">Margem</dt><dd className="font-bold">{brl(margin)}</dd></div>
        <div><dt className="text-gray-500">Vínculo</dt><dd className="font-bold">{MAPPING[product.externalMapping.state]}</dd></div>
      </dl>
      {product.alerts.length > 0 && <div className="mt-4 border-t pt-4"><p className="text-[10px] font-black uppercase text-gray-500">Alertas</p>{product.alerts.map((alert) => <p key={alert} className="mt-1 text-xs text-amber-700">{alert}</p>)}</div>}
      <div className="mt-4 border-t pt-4 text-xs"><p className="text-[10px] font-black uppercase text-gray-500">Como calculamos</p><p className="mt-1 rounded bg-gray-50 p-3 font-mono text-[11px] text-gray-700">CMV = custo por porção ÷ preço · margem = preço − custo por porção</p><p className="mt-2 text-[11px] text-gray-500">Exemplo simulado; os valores não representam dados reais de compras ou vendas.</p></div>
      <div className="mt-6 flex gap-2"><button onClick={onClose} className="rounded-md border border-gray-200 px-3 py-2 text-xs font-bold">Fechar</button></div>
    </aside>
  </div>;
}
