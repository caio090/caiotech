"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Cable, ArrowUpRight, AtSign, UtensilsCrossed, Loader2 } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string | null;
}

type MetaHubItem = {
  client_id: string;
  facebook_page_name: string | null;
  instagram_username: string | null;
  meta_status: "complete" | "partial" | "not_connected";
};
type MetaHubAssetsResponse = { ok: boolean; items?: MetaHubItem[] };

type OlaClickStatusResponse = {
  ok: boolean;
  connected?: boolean;
  connection?: { connection_name: string | null; status: string; last_sync_at: string | null } | null;
  reason?: string;
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" /> {label}
    </span>
  );
}

/**
 * REC OS Context Foundation V1 — espelha o status já real de
 * /api/meta/hub-assets e /api/olaclick/status (as mesmas APIs que
 * /admin/conexoes usa), nunca lê/duplica token. Só nomes/status já
 * persistidos -- nunca chama a Graph API/OlaClick diretamente daqui.
 */
export function RecOsConnectionsContent({ companyId, companyName }: Props) {
  const [meta, setMeta] = useState<MetaHubItem | null | undefined>(undefined);
  const [olaclick, setOlaclick] = useState<OlaClickStatusResponse | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meta/hub-assets")
      .then((r) => r.json())
      .then((data: MetaHubAssetsResponse) => {
        if (cancelled) return;
        const item = data.ok ? (data.items ?? []).find((i) => i.client_id === companyId) ?? null : null;
        setMeta(item);
      })
      .catch(() => { if (!cancelled) setMeta(null); });

    fetch(`/api/olaclick/status?client_id=${encodeURIComponent(companyId)}`)
      .then((r) => r.json())
      .then((data: OlaClickStatusResponse) => { if (!cancelled) setOlaclick(data); })
      .catch(() => { if (!cancelled) setOlaclick({ ok: false }); });

    return () => { cancelled = true; };
  }, [companyId]);

  const loading = meta === undefined || olaclick === undefined;
  const metaConnected = meta?.meta_status === "complete" || meta?.meta_status === "partial";
  const olaclickConnected = !!olaclick?.connected;

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Conexões — REC OS</h1>
          <p className="text-xs text-gray-400">
            Status das integrações usadas pelo REC OS para {companyName ?? "esta empresa"}.
          </p>
        </div>
        <Link
          href={`/admin/conexoes?client=${companyId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
          data-testid="rec-os-connections-manage-cta"
        >
          Gerenciar integração <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando status das conexões...
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3" data-testid="rec-os-connections-grid">
          <div className="bg-white rounded-2xl border border-gray-100 p-4" data-testid="rec-os-connection-meta">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                <AtSign className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-sm font-bold text-gray-800">Meta / Instagram</p>
            </div>
            <StatusPill ok={metaConnected} label={metaConnected ? "Conectado" : "Não conectado"} />
            {meta?.facebook_page_name && (
              <p className="text-xs text-gray-500 mt-2 truncate">Página: {meta.facebook_page_name}</p>
            )}
            {meta?.instagram_username && (
              <p className="text-xs text-gray-500 truncate">Instagram: @{meta.instagram_username}</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4" data-testid="rec-os-connection-olaclick">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-sm font-bold text-gray-800">Cardápio Digital (OlaClick)</p>
            </div>
            <StatusPill ok={olaclickConnected} label={olaclickConnected ? "Conectado" : "Não conectado"} />
            {olaclick?.connection?.connection_name && (
              <p className="text-xs text-gray-500 mt-2 truncate">{olaclick.connection.connection_name}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-1">
        <Cable className="w-3.5 h-3.5" />
        Configuração avançada, tokens e outras integrações continuam em{" "}
        <Link href={`/admin/conexoes?client=${companyId}`} className="font-bold text-gray-500 hover:text-gray-700">
          Conexões
        </Link>.
      </div>
    </div>
  );
}
