import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  CheckCircle, Clock, CreditCard, QrCode, Plus,
  History, Package, AlertCircle,
} from "lucide-react";

const DEMO_SERVICES = [
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

      {/* Plano atual */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Plano atual</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Plano</p>
            <p className="text-sm font-semibold text-gray-800">Gestão de Redes</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Status</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" />
              Ativo
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Valor mensal</p>
            <p className="text-sm font-bold text-gray-900">R$ 1.800,00</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Próximo vencimento</p>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <Clock className="w-3 h-3" />
              <span>Sem data definida</span>
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-3 py-2 rounded-lg">
          <AlertCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
          Dados demonstrativos. A integração financeira real será configurada em breve.
        </p>
      </div>

      {/* Pagamento via Pix */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-bold text-gray-800">Pagamento via Pix</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* QR Code placeholder */}
          <div className="w-36 h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center flex-shrink-0">
            <QrCode className="w-12 h-12 text-gray-300 mb-1" />
            <span className="text-[10px] text-gray-400">QR Demonstrativo</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-3">
              Copie o código Pix abaixo para realizar o pagamento.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-400 truncate font-mono">
                00020126580014br.gov.bcb.pix0136demo-chave-pix-demonstrativa
              </div>
              <button className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex-shrink-0">
                Copiar
              </button>
            </div>
            <p className="mt-3 text-[10px] text-gray-400">
              <AlertCircle className="inline w-3 h-3 mr-1 -mt-0.5" />
              Pagamento demonstrativo. Integração real com gateway será configurada posteriormente.
            </p>
          </div>
        </div>
      </div>

      {/* Histórico */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-800">Histórico de pagamentos</h2>
        </div>
        <div className="text-center py-10 text-gray-400">
          <History className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm">Nenhum pagamento registrado ainda.</p>
          <p className="text-xs mt-1">O histórico aparecerá aqui após as integrações serem configuradas.</p>
        </div>
      </div>

      {/* Serviços adicionais */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-4 h-4 text-purple-500" />
          <h2 className="text-sm font-bold text-gray-800">Serviços adicionais</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Serviços fora do escopo do plano atual.</p>
        <div className="space-y-2">
          {DEMO_SERVICES.map((s) => (
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
