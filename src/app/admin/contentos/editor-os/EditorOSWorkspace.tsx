"use client";

import { useState } from "react";
import { ArrowLeft, Monitor, Layers, FlaskConical, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { DESIGN_FORMATS, type DesignFormat, type DesignFormatSpec } from "@/lib/providers/shared/types";

interface Client {
  id: string;
  company_name: string;
  segment: string | null;
}

interface EditorOSWorkspaceProps {
  client: Client | null;
  brandName: string | null;
  socialChannels: string[] | null;
  campaignId: string | null;
  contentId: string | null;
  briefingId: string | null;
}

export default function EditorOSWorkspace({
  client,
  brandName,
  socialChannels,
}: EditorOSWorkspaceProps) {
  const [selectedFormat, setSelectedFormat] = useState<DesignFormat | null>(null);
  const [projectCreated, setProjectCreated] = useState(false);
  const [mockProjectId] = useState(() => `mock_${Date.now().toString().slice(-8)}`);

  const backHref = client
    ? `/admin/contentos/home?client=${client.id}`
    : "/admin/contentos/selecionar-cliente";

  function handleFormatSelect(format: DesignFormatSpec) {
    setSelectedFormat(format.id);
    setProjectCreated(false);
  }

  function handleCreateMockProject() {
    if (!selectedFormat) return;
    setProjectCreated(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="mx-auto max-w-screen-xl flex items-center gap-4">
          <Link
            href={backHref}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao REC OS
          </Link>
          <div className="h-4 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-sm">EditorOS</span>
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5">
              em avaliação
            </span>
          </div>
          {client && (
            <>
              <div className="h-4 w-px bg-zinc-700" />
              <span className="text-sm text-zinc-400">
                {brandName ?? client.company_name}
              </span>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-6 py-8 flex gap-6">
        {/* Sidebar — Brand Context */}
        <aside className="w-64 shrink-0 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              Contexto de marca
            </h2>
            {client ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500">Empresa</p>
                  <p className="text-sm font-medium text-zinc-100">{client.company_name}</p>
                </div>
                {brandName && brandName !== client.company_name && (
                  <div>
                    <p className="text-xs text-zinc-500">Marca</p>
                    <p className="text-sm text-zinc-200">{brandName}</p>
                  </div>
                )}
                {client.segment && (
                  <div>
                    <p className="text-xs text-zinc-500">Segmento</p>
                    <p className="text-sm text-zinc-300">{client.segment}</p>
                  </div>
                )}
                {socialChannels && socialChannels.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Canais</p>
                    <div className="flex flex-wrap gap-1">
                      {socialChannels.map((ch) => (
                        <span
                          key={ch}
                          className="text-xs bg-zinc-800 text-zinc-300 rounded px-2 py-0.5"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-600">Cores e fontes disponíveis após motor aprovado</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Selecione um cliente para carregar o contexto de marca.
              </p>
            )}
          </div>

          {/* Provider status */}
          <div className="rounded-xl border border-amber-800/40 bg-amber-900/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-amber-300">Motor em avaliação</p>
            </div>
            <p className="text-xs text-amber-400/70">
              Nenhum motor de design foi licenciado. Este ambiente é para avaliação de arquitetura.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Format selector */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Selecionar formato
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {DESIGN_FORMATS.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                const aspectH = Math.round((fmt.height / fmt.width) * 48);
                return (
                  <button
                    key={fmt.id}
                    onClick={() => handleFormatSelect(fmt)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/60 ring-1 ring-indigo-500/40"
                        : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <div
                        className={`rounded border ${
                          isSelected ? "border-indigo-400 bg-indigo-900/40" : "border-zinc-700 bg-zinc-800"
                        }`}
                        style={{
                          width: 48,
                          height: Math.min(aspectH, 72),
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium text-zinc-200">{fmt.label}</p>
                    <p className="text-xs text-zinc-500">{fmt.ratio}</p>
                    <p className="text-xs text-zinc-600">
                      {fmt.width}×{fmt.height}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Canvas area */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">
              Canvas
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
              {selectedFormat ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
                  {projectCreated ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-200">Projeto criado (mock)</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Formato:{" "}
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.label} —{" "}
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.width}×
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.height}
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">
                          ID: {mockProjectId}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-4 py-2 transition-colors border border-zinc-700"
                          onClick={() => setProjectCreated(false)}
                        >
                          Novo projeto
                        </button>
                        <button className="text-xs bg-zinc-800 text-zinc-600 rounded-lg px-4 py-2 border border-zinc-700 cursor-not-allowed opacity-50">
                          Salvar rascunho (motor pendente)
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-zinc-300">
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.label}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.width}×
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.height} —{" "}
                          {DESIGN_FORMATS.find((f) => f.id === selectedFormat)?.ratio}
                        </p>
                      </div>
                      <button
                        onClick={handleCreateMockProject}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-5 py-2 transition-colors font-medium"
                      >
                        Criar projeto (avaliação)
                      </button>
                      <p className="text-xs text-zinc-600 max-w-xs text-center">
                        Motor de design em avaliação. O projeto será criado em memória apenas — sem
                        persistência real.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-8 gap-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                    <Layers className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">Selecione um formato para começar</p>
                </div>
              )}
            </div>
          </section>

          {/* Notice */}
          <div className="rounded-xl border border-amber-800/30 bg-amber-950/20 p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-300">EditorOS em avaliação de motor</p>
              <p className="text-xs text-amber-400/70">
                Nenhum motor de design foi licenciado. LidoJS está bloqueado por ausência de licença.
                CE.SDK requer contrato com img.ly. Esta tela valida a arquitetura e o fluxo de contexto de
                marca — não representa um editor funcional.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
