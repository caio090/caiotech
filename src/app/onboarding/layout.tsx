"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const steps = [
  { path: "/onboarding/tipo",      label: "Tipo de conta" },
  { path: "/onboarding/cliente",   label: "Cadastro" },
  { path: "/onboarding/objetivo",  label: "Objetivo" },
  { path: "/onboarding/marca",     label: "Marca" },
  { path: "/onboarding/publico",   label: "Público" },
  { path: "/onboarding/identidade",label: "Identidade" },
  { path: "/onboarding/estilo",    label: "Tom de voz" },
  { path: "/onboarding/operacao",  label: "Operação" },
  { path: "/onboarding/conclusao", label: "Conclusão" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentIndex = steps.findIndex((s) => s.path === pathname);
  const step = currentIndex + 1;
  const total = steps.length;
  const pct = Math.round((step / total) * 100);
  const stepLabel = steps[currentIndex]?.label ?? "";
  const prevPath = currentIndex > 0 ? steps[currentIndex - 1].path : "/criar-conta";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with progress */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-black">L</div>
                <span className="text-sm font-bold text-gray-800">LOKAT OS</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Etapa <span className="font-bold text-gray-700">{step}</span> de {total}
              </span>
              {currentIndex > 0 && (
                <Link href={prevPath} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  ← Voltar
                </Link>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Step labels strip */}
          <div className="hidden sm:flex mt-3 gap-0">
            {steps.map((s, i) => (
              <div
                key={s.path}
                className={cn(
                  "flex-1 text-[9px] text-center font-medium truncate",
                  i < currentIndex ? "text-indigo-400" : i === currentIndex ? "text-indigo-600" : "text-gray-300"
                )}
              >
                {i < currentIndex ? "✓" : i + 1}. {s.label}
              </div>
            ))}
          </div>
          {/* Mobile: just show current step name */}
          <div className="sm:hidden flex items-center justify-between mt-1.5">
            <span className="text-xs font-semibold text-indigo-600">{stepLabel}</span>
            <span className="text-xs text-gray-400">{pct}% concluído</span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
