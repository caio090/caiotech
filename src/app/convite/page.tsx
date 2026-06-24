"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, UserRoundPlus, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function extractToken(input: string): string | null {
  const trimmed = input.trim();
  // Full URL containing /convite/UUID
  const urlMatch = trimmed.match(/\/convite\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (urlMatch) return urlMatch[1];
  // Bare UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export default function ConviteSemTokenPage() {
  const router = useRouter();
  const [code,   setCode]   = useState("");
  const [error,  setError]  = useState("");
  const [active, setActive] = useState<"convite" | "solicitar" | null>(null);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const token = extractToken(code);
    if (!token) {
      setError("Código inválido. Certifique-se de colar o link completo ou o código UUID recebido.");
      return;
    }
    router.push(`/convite/${token}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-black">L</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Entrar na equipe</h1>
          <p className="text-sm text-gray-500 mt-1">Como você deseja prosseguir?</p>
        </div>

        {/* Option cards */}
        <div className="space-y-3 mb-6">
          {/* Option A — Tenho convite */}
          <div className={cn(
            "bg-white border-2 rounded-2xl overflow-hidden transition-all",
            active === "convite" ? "border-emerald-400" : "border-gray-100 hover:border-emerald-200"
          )}>
            <button
              type="button"
              onClick={() => setActive(active === "convite" ? null : "convite")}
              className="w-full flex items-center gap-4 px-5 py-4 text-left"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                active === "convite" ? "bg-emerald-100" : "bg-gray-100"
              )}>
                <KeyRound className={cn("w-5 h-5 transition-colors", active === "convite" ? "text-emerald-600" : "text-gray-400")} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Tenho um convite</p>
                <p className="text-xs text-gray-500 mt-0.5">Use o link ou código enviado pelo administrador.</p>
              </div>
              <ArrowRight className={cn("w-4 h-4 flex-shrink-0 transition-all", active === "convite" ? "text-emerald-500 rotate-90" : "text-gray-300")} />
            </button>

            {active === "convite" && (
              <form onSubmit={handleContinue} className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cole aqui o link ou código do convite
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(""); }}
                    placeholder="https://… ou cole o código UUID"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-400 transition-colors"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  Continuar com convite
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Option B — Solicitar acesso */}
          <Link
            href="/equipe/solicitar-acesso"
            className={cn(
              "bg-white border-2 border-gray-100 rounded-2xl flex items-center gap-4 px-5 py-4",
              "hover:border-indigo-200 transition-all group"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center flex-shrink-0 transition-colors">
              <UserRoundPlus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Solicitar entrada na equipe</p>
              <p className="text-xs text-gray-500 mt-0.5">Preencha seus dados para o administrador avaliar.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">
          Já tem conta?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
