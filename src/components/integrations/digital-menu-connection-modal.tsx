"use client";
import { useState } from "react";
import {
  Loader2, Link2, X, UtensilsCrossed, Eye, EyeOff,
  ShieldAlert, Lock, ChevronDown, XCircle,
} from "lucide-react";

export type DigitalMenuClientOption = { id: string; company_name: string; email?: string | null };

const DIGITAL_MENU_PROVIDERS = [
  { slug: "olaclick", name: "OlaClick" },
] as const;

export function DigitalMenuConnectionModal({
  onClose,
  onSaved,
  clients,
  preselectedClientId,
}: {
  onClose: () => void;
  onSaved: () => void;
  clients: DigitalMenuClientOption[];
  preselectedClientId?: string;
}) {
  const [providerSlug, setProviderSlug] = useState<string>(DIGITAL_MENU_PROVIDERS[0].slug);
  const [clientId,    setClientId]    = useState(preselectedClientId ?? "");
  const [connName,    setConnName]    = useState("");
  const [token,       setToken]       = useState("");
  const [apiBaseUrl,  setApiBaseUrl]  = useState("");
  const [notes,       setNotes]       = useState("");
  const [showToken,   setShowToken]   = useState(false);
  const [showSteps,   setShowSteps]   = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const selectedProvider = DIGITAL_MENU_PROVIDERS.find((p) => p.slug === providerSlug) ?? DIGITAL_MENU_PROVIDERS[0];

  async function handleSave() {
    if (!clientId || !connName || !token) { setError("Preencha todos os campos obrigatórios."); return; }
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/olaclick/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id:       clientId,
          connection_name: connName,
          access_token:    token,
          api_base_url:    apiBaseUrl.trim() || undefined,
          notes,
        }),
      });
      const d = await r.json() as { ok: boolean; reason?: string; message?: string };
      if (d.ok) { onSaved(); }
      else if (d.reason === "sql_pending") { setError("SQL 39 pendente. Rode docs/supabase/39-olaclick-connections.sql no Supabase."); }
      else { setError(d.message ?? "Erro ao salvar conexão."); }
    } catch { setError("Erro de rede. Tente novamente."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-orange-500" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Conectar Cardápio Digital</p>
              <p className="text-[10px] text-gray-400">via {selectedProvider.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700">
              Se o token apareceu em print ou conversa, revogue e gere outro no OlaClick antes de conectar.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Provedor <span className="text-red-500">*</span></label>
            <select
              value={providerSlug}
              onChange={(e) => setProviderSlug(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400 bg-white"
            >
              {DIGITAL_MENU_PROVIDERS.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Cliente <span className="text-red-500">*</span></label>
            {clients.length > 0 ? (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400 bg-white"
              >
                <option value="">Selecione o cliente…</option>
                {clients.map((c) => {
                  const hasDup = clients.filter(x => x.company_name === c.company_name).length > 1;
                  const label = hasDup
                    ? `${c.company_name} · ${c.email ?? "sem email"} · ${c.id.slice(0, 8)}`
                    : c.company_name;
                  return <option key={c.id} value={c.id}>{label}</option>;
                })}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic">Nenhum cliente cadastrado.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Nome da conexão <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={connName}
              onChange={(e) => setConnName(e.target.value)}
              placeholder="Ex: Duh Lanches — OlaClick"
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Token / API Key — {selectedProvider.name} <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={`Cole o token gerado no ${selectedProvider.name}`}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 pr-10 outline-none focus:border-orange-400 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />Token salvo criptografado. Não aparece em tela após salvar.
            </p>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-gray-700">Configurações avançadas</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">URL da API do provedor</label>
                  <input
                    type="url"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="Use apenas se o provedor exigir uma URL específica"
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-orange-400 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Para OlaClick deixe em branco. Necessário apenas se o provedor tiver uma URL personalizada.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre essa conexão..."
              rows={2}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none resize-none focus:border-orange-400"
            />
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-xs font-semibold text-gray-700">Como gerar token no {selectedProvider.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showSteps ? "rotate-180" : ""}`} />
            </button>
            {showSteps && (
              <div className="p-4 space-y-2 text-xs text-gray-600">
                {[
                  "Acesse o painel OlaClick.",
                  "Vá em Integrações.",
                  "Clique em API Keys.",
                  "Clique em Gerar novo token.",
                  "Marque permissões de leitura: menu:read, orders:read, clients:read e companies:read.",
                  "Copie o token gerado.",
                  "Cole aqui na LOKAT OS.",
                  "Clique em Salvar e testar conexão.",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 bg-orange-100 text-orange-700 text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !clientId || !connName || !token}
              className="flex-1 py-2.5 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
              {saving ? "Salvando..." : "Salvar conexão"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
