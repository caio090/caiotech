"use client";

import { useState, useEffect } from "react";
import {
  X, Loader2, CheckCircle2, AlertCircle, Link2,
  AtSign, Globe, ChevronRight, Trash2, Info,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailablePage {
  id:          string;
  name:        string;
  picture_url: string | null;
  instagram: {
    id:          string;
    name:        string | null;
    username:    string | null;
    picture_url: string | null;
  } | null;
}

interface CurrentAssets {
  facebookPage:      { asset_record_id: string; id: string; name: string | null } | null;
  instagramBusiness: { asset_record_id: string; id: string; username: string | null } | null;
  adAccount:         null;
}

type Step = "select" | "confirm" | "saving" | "success";

// ── Modal ─────────────────────────────────────────────────────────────────────

export function MetaClientAssetsModal({
  clientId,
  clientName,
  onSaved,
  onClose,
}: {
  clientId:   string;
  clientName: string;
  onSaved:    () => void;
  onClose:    () => void;
}) {
  const [step,           setStep]           = useState<Step>("select");
  const [pages,          setPages]          = useState<AvailablePage[]>([]);
  const [currentAssets,  setCurrentAssets]  = useState<CurrentAssets | null>(null);
  const [connectionId,   setConnectionId]   = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [error,          setError]          = useState("");
  const [unlinking,      setUnlinking]      = useState(false);

  const selectedPage = pages.find((p) => p.id === selectedPageId) ?? null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/meta/accounts").then((r) => r.json()),
      fetch(`/api/meta/client-assets?client_id=${clientId}`).then((r) => r.json()),
    ])
      .then(([accts, assets]) => {
        if (!active) return;
        const a = accts as {
          ok: boolean; connection_id?: string;
          pages?: AvailablePage[];
          reason?: string; message?: string;
        };
        const ca = assets as { ok: boolean; assets?: CurrentAssets; reason?: string; message?: string };

        if (!a.ok) {
          setError(a.message ?? "Não foi possível carregar os ativos Meta. Verifique a conexão em /admin/conexoes.");
        } else {
          setPages(a.pages ?? []);
          setConnectionId(a.connection_id ?? null);
        }
        if (ca.ok && ca.assets) {
          setCurrentAssets(ca.assets);
          // Pre-select current page if linked
          if (ca.assets.facebookPage?.id) setSelectedPageId(ca.assets.facebookPage.id);
        }
      })
      .catch(() => { if (active) setError("Erro de rede ao carregar ativos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId]);

  async function handleSave() {
    if (!selectedPage) { setError("Selecione uma Página Facebook."); return; }
    setStep("saving");
    setError("");

    try {
      // Link Facebook Page
      const fbRes = await fetch("/api/meta/assets/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id:          clientId,
          asset_type:         "facebook_page",
          asset_id:           selectedPage.id,
          asset_name:         selectedPage.name,
          picture_url:        selectedPage.picture_url,
          meta_connection_id: connectionId ?? undefined,
          is_primary:         !selectedPage.instagram,
        }),
      });
      const fbData = await fbRes.json() as { ok: boolean; reason?: string; message?: string };
      if (!fbData.ok) {
        setError(fbData.message ?? "Erro ao vincular Página Facebook.");
        setStep("select");
        return;
      }

      // Link Instagram Business if available
      if (selectedPage.instagram) {
        const igRes = await fetch("/api/meta/assets/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id:          clientId,
            asset_type:         "instagram_business",
            asset_id:           selectedPage.instagram.id,
            asset_name:         selectedPage.instagram.name ?? selectedPage.instagram.username,
            username:           selectedPage.instagram.username,
            picture_url:        selectedPage.instagram.picture_url,
            meta_connection_id: connectionId ?? undefined,
            is_primary:         true,
          }),
        });
        const igData = await igRes.json() as { ok: boolean; reason?: string; message?: string };
        if (!igData.ok) {
          setError(igData.message ?? "Página vinculada, mas falha ao vincular Instagram.");
          setStep("select");
          return;
        }
      }

      setStep("success");
    } catch {
      setError("Erro de rede. Tente novamente.");
      setStep("select");
    }
  }

  async function handleUnlink(assetRecordId: string) {
    setUnlinking(true);
    setError("");
    try {
      const r = await fetch(`/api/meta/assets/link?id=${assetRecordId}`, { method: "DELETE" });
      const d = await r.json() as { ok: boolean; message?: string };
      if (!d.ok) { setError(d.message ?? "Erro ao desvincular."); return; }
      // Refresh current assets
      const ca = await fetch(`/api/meta/client-assets?client_id=${clientId}`).then((r2) => r2.json()) as { ok: boolean; assets?: CurrentAssets };
      if (ca.ok && ca.assets) setCurrentAssets(ca.assets);
    } catch { setError("Erro de rede ao desvincular."); }
    finally { setUnlinking(false); }
  }

  const isCurrentlyLinked = (pageId: string) =>
    currentAssets?.facebookPage?.id === pageId || currentAssets?.instagramBusiness !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-gray-900">Vincular Meta</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === "success" ? "Vínculo salvo" : clientName}
            </p>
          </div>
          {step !== "saving" && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="text-sm text-gray-400">Carregando ativos da Meta…</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">Vínculo salvo com sucesso!</p>
              {selectedPage && (
                <div className="text-xs text-gray-500 space-y-0.5">
                  <p><span className="font-semibold text-gray-700">Página:</span> {selectedPage.name}</p>
                  {selectedPage.instagram && (
                    <p><span className="font-semibold text-gray-700">Instagram:</span> @{selectedPage.instagram.username}</p>
                  )}
                  <p><span className="font-semibold text-gray-700">Conta de anúncio:</span> Não vinculada</p>
                </div>
              )}
              <button
                onClick={() => { onSaved(); onClose(); }}
                className="mt-2 px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Concluir
              </button>
            </div>
          )}

          {/* Saving */}
          {step === "saving" && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="text-sm text-gray-500">Salvando vínculos…</span>
            </div>
          )}

          {/* Select step */}
          {!loading && step === "select" && (
            <>
              {/* Current assets */}
              {(currentAssets?.facebookPage || currentAssets?.instagramBusiness) && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-2">Ativos atuais de {clientName}</p>
                  <div className="space-y-1.5">
                    {currentAssets.facebookPage && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-gray-700 font-medium">{currentAssets.facebookPage.name ?? currentAssets.facebookPage.id}</span>
                        </div>
                        <button
                          onClick={() => void handleUnlink(currentAssets.facebookPage!.asset_record_id)}
                          disabled={unlinking}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          {unlinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Desvincular
                        </button>
                      </div>
                    )}
                    {currentAssets.instagramBusiness && (
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <AtSign className="w-3.5 h-3.5 text-pink-500" />
                          <span className="text-gray-700 font-medium">@{currentAssets.instagramBusiness.username ?? currentAssets.instagramBusiness.id}</span>
                        </div>
                        <button
                          onClick={() => void handleUnlink(currentAssets.instagramBusiness!.asset_record_id)}
                          disabled={unlinking}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                          {unlinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Desvincular
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Meta connection */}
              {pages.length === 0 && !loading && !error && (
                <div className="py-6 text-center space-y-2">
                  <Info className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-sm font-medium text-gray-600">Nenhuma Página encontrada</p>
                  <p className="text-xs text-gray-400">
                    Reconecte a conta Meta em{" "}
                    <a href="/admin/conexoes" className="text-indigo-600 hover:underline">Conexões</a>
                    {" "}e autorize o acesso a Páginas no fluxo OAuth.
                  </p>
                </div>
              )}

              {/* Page list */}
              {pages.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                    Selecione a Página Facebook do cliente
                  </p>
                  <div className="space-y-2 mb-5">
                    {pages.map((page) => {
                      const linked = isCurrentlyLinked(page.id);
                      const selected = selectedPageId === page.id;
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => setSelectedPageId(selected ? null : page.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${
                            selected
                              ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300"
                              : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {page.picture_url ? (
                              <img src={page.picture_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Globe className="w-4 h-4 text-blue-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{page.name}</p>
                              <p className="text-[10px] text-gray-400">
                                Página Facebook
                                {linked && <span className="ml-1.5 text-emerald-600 font-medium">· Já vinculado</span>}
                              </p>
                            </div>
                            {selected && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                          </div>

                          {/* Instagram Business */}
                          {page.instagram ? (
                            <div className={`mt-2 ml-10 flex items-center gap-2 text-xs ${selected ? "text-pink-700" : "text-gray-500"}`}>
                              <AtSign className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                              <span>
                                @{page.instagram.username ?? page.instagram.name ?? page.instagram.id}
                              </span>
                              <ChevronRight className="w-3 h-3 text-gray-300" />
                              <span className="text-[10px] text-gray-400">Instagram Business — será vinculado automaticamente</span>
                            </div>
                          ) : (
                            <p className="mt-1.5 ml-10 text-[10px] text-gray-400">
                              Esta página não possui Instagram Business vinculado.
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Ad account notice */}
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <p className="text-[10px] text-gray-400">
                      <span className="font-semibold text-gray-500">Conta de anúncio:</span>{" "}
                      Contas de anúncio ainda não estão disponíveis nesta conexão.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Confirm step */}
          {step === "confirm" && selectedPage && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 mb-3">Confirmar vínculo</p>
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden text-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-gray-500 text-xs font-medium">Cliente</span>
                  <span className="text-gray-800 font-semibold">{clientName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-500 text-xs font-medium">Página Facebook</span>
                  <span className="text-gray-800">{selectedPage.name}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-gray-500 text-xs font-medium">Instagram</span>
                  <span className="text-gray-800">
                    {selectedPage.instagram
                      ? `@${selectedPage.instagram.username ?? selectedPage.instagram.name}`
                      : <span className="text-gray-400">Não disponível</span>
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-gray-500 text-xs font-medium">Conta de anúncio</span>
                  <span className="text-gray-400 text-xs">Não vinculada</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && step !== "saving" && step !== "success" && (
          <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
            {step === "select" ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { if (selectedPage) setStep("confirm"); else setError("Selecione uma Página Facebook."); }}
                  disabled={!selectedPageId}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Continuar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep("select")}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => void handleSave()}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvar vínculo
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
