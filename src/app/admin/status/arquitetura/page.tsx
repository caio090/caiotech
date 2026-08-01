import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import EcosystemMapClient from "../../ecossistema/_ecosystem-client";

/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 8/9) — o mapa técnico da
 * plataforma (módulos, painéis, dados, integrações, dependências, Radar de
 * Produto, Roadmap) mora agora dentro de Status, como "Arquitetura da
 * Plataforma" — ele NUNCA competiu de fato com o conteúdo de Status
 * (execução/validação) em termos de dado, mas competia na navegação
 * principal como se fosse outra área operacional (era, inclusive, um dos 4
 * itens fixos do rodapé mobile do Super Admin). Reaproveita
 * EcosystemMapClient sem alterações — nenhum card duplicado, nenhuma
 * reescrita do conteúdo técnico.
 */
export default function PlatformArchitecturePage() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-3 pt-4 sm:px-6">
        <Link href="/admin/status" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Status
        </Link>
      </div>
      <EcosystemMapClient />
    </div>
  );
}
