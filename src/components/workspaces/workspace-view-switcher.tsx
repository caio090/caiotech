"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, ChevronRight, X } from "lucide-react";
import { SURFACE_LABELS } from "@/config/workspace-capabilities";
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import type { WorkspaceOption } from "@/app/api/admin/workspaces/route";

type Step = "closed" | "surface" | "entity" | "agency_for_client" | "client_under_agency";

const PREVIEWABLE_SURFACES: Exclude<WorkspaceSurface, "super_admin">[] = ["agency", "agency_client", "direct_business"];

/**
 * "Visualizar como" — the second header control next to the bell (the
 * first, "Painel ADM", is just a Link back to /admin/dashboard, rendered by
 * the caller). Opens as a dropdown on desktop; the same markup works as a
 * bottom sheet on mobile via the parent's responsive classes — no separate
 * mobile-only implementation, matching Fase "Mobile" (não depender de hover).
 */
export function WorkspaceViewSwitcher() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [pendingSurface, setPendingSurface] = useState<WorkspaceSurface | null>(null);
  const [options, setOptions] = useState<WorkspaceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<WorkspaceOption | null>(null);

  useEffect(() => {
    if (step === "entity" && pendingSurface) {
      setLoading(true);
      fetch(`/api/admin/workspaces?surface=${pendingSurface}`)
        .then((r) => r.json())
        .then((b: { ok: boolean; options?: WorkspaceOption[] }) => setOptions(b.ok ? b.options ?? [] : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }
    if (step === "agency_for_client") {
      setLoading(true);
      fetch(`/api/admin/workspaces?surface=agency`)
        .then((r) => r.json())
        .then((b: { ok: boolean; options?: WorkspaceOption[] }) => setOptions(b.ok ? b.options ?? [] : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }
    if (step === "client_under_agency" && selectedAgency) {
      setLoading(true);
      fetch(`/api/admin/workspaces?surface=agency_client&agency_id=${selectedAgency.id}`)
        .then((r) => r.json())
        .then((b: { ok: boolean; options?: WorkspaceOption[] }) => setOptions(b.ok ? b.options ?? [] : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }
  }, [step, pendingSurface, selectedAgency]);

  function pickSurface(surface: WorkspaceSurface) {
    if (surface === "agency_client") { setStep("agency_for_client"); return; }
    setPendingSurface(surface);
    setStep("entity");
  }

  function pickAgency(agency: WorkspaceOption) {
    setSelectedAgency(agency);
    setStep("client_under_agency");
  }

  function enterPreview(opt: WorkspaceOption) {
    const surface = selectedAgency ? "agency_client" : pendingSurface;
    // Blueprints are fictional — there is no real row to validate server-side,
    // so they route to the read-only blueprint view instead of the real
    // preview resolver (resolveWorkspacePreview only ever validates real rows).
    if (opt.isBlueprint) {
      router.push(`/admin/visualizar?blueprint_surface=${surface}`);
    } else {
      router.push(`/admin/visualizar?preview_surface=${surface}&workspace_id=${opt.id}`);
    }
    close();
  }

  function close() {
    setStep("closed"); setOptions([]); setSelectedAgency(null); setPendingSurface(null);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setStep(step === "closed" ? "surface" : "closed")}
        className="p-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-indigo-600"
        title="Visualizar como outro painel"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden md:inline text-xs font-bold">Visualizar como</span>
      </button>

      {step !== "closed" && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-700">
              {step === "surface" && "Visualizar como"}
              {(step === "entity" || step === "agency_for_client") && "Selecione a entidade"}
              {step === "client_under_agency" && `Cliente de ${selectedAgency?.name}`}
            </p>
            <button onClick={close} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          {step === "surface" && (
            <div className="p-2">
              {PREVIEWABLE_SURFACES.map((s) => (
                <button
                  key={s}
                  onClick={() => pickSurface(s)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {SURFACE_LABELS[s]} <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {(step === "entity" || step === "agency_for_client" || step === "client_under_agency") && (
            <div className="max-h-64 overflow-y-auto p-2">
              {loading && <p className="text-xs text-gray-400 text-center py-4">Carregando…</p>}
              {!loading && options.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Nenhum registro encontrado.</p>
              )}
              {!loading && options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => (step === "agency_for_client" ? pickAgency(opt) : enterPreview(opt))}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="truncate">{opt.name}</span>
                  {opt.isBlueprint && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0 ml-1.5">Blueprint</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
