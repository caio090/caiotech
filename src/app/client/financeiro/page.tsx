import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CreditCard, Clock, History, Package, Plus, AlertCircle } from "lucide-react";

const ADDITIONAL_SERVICES = [
  { id: "1", label: "Vídeo extra",                icon: "🎬" },
  { id: "2", label: "Captação extra",             icon: "📸" },
  { id: "3", label: "Campanha de tráfego avulsa", icon: "📈" },
  { id: "4", label: "Landing page",               icon: "🖥️" },
  { id: "5", label: "Automação WhatsApp",          icon: "💬" },
];

export default async function ClientFinanceiroPage() {
  let companyName = "sua marca";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("company_name")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (clientRow?.company_name) companyName = clientRow.company_name;
      }
    } catch {}
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={`Plano, cobranças e pagamentos — ${companyName}`}
      />

      {/* Plano atual — aguardando configuração */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Plano atual</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum plano ativo</p>
          <p className="text-xs text-gray-400 max-w-xs">
            Quando seu plano for configurado pela equipe, as informações de cobrança aparecerão aqui.
          </p>
        </div>
        <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Integração financeira em preparação. Fale com a equipe para configurar seu plano.</span>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Histórico de pagamentos</h2>
        </div>
        <div className="text-center py-8 text-gray-400">
          <History className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">Nenhum pagamento registrado ainda.</p>
          <p className="text-xs mt-1 text-gray-400">O histórico aparecerá aqui após as integrações serem configuradas.</p>
        </div>
      </div>

      {/* Serviços adicionais */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-bold text-gray-800">Serviços adicionais</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Serviços que podem ser solicitados à equipe.</p>
        <div className="space-y-2">
          {ADDITIONAL_SERVICES.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-base">{s.icon}</span>
                <span className="text-sm text-gray-700">{s.label}</span>
              </div>
              <button className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-xl transition-colors">
                <Plus className="w-3 h-3" />
                Solicitar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
