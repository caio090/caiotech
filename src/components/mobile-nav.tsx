"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { configs, SidebarVariant } from "@/components/app-sidebar";
import { MoreHorizontal, X } from "lucide-react";
import type { WorkspaceSurface } from "@/lib/workspaces/types";
import { SURFACE_BOTTOM_NAV_PRIMARY } from "@/lib/mobile-shell/types";

const accentColor: Record<SidebarVariant, string> = {
  admin:       "text-indigo-600",
  client:      "text-pink-500",
  contentos:   "text-purple-600",
  growth:      "text-emerald-600",
  financeiro:  "text-emerald-600",
  academy:     "text-amber-500",
  operacional: "text-slate-600",
};

const accentBg: Record<SidebarVariant, string> = {
  admin:       "bg-indigo-600",
  client:      "bg-pink-500",
  contentos:   "bg-purple-600",
  growth:      "bg-emerald-600",
  financeiro:  "bg-emerald-600",
  academy:     "bg-amber-500",
  operacional: "bg-slate-600",
};

// Admin: itens primários fixos no nav inferior
const ADMIN_PRIMARY = [
  "/admin/dashboard",
  "/admin/contentos",
  "/admin/operacional",
  "/admin/clientes",
];

interface MobileBottomNavProps {
  variant: SidebarVariant;
  badges?: Record<string, number>;
  /**
   * Fase 31 (Sprint REC OS 3.0.1): quando informado, os 4 itens fixos do
   * rodapé passam a ser os de `SURFACE_BOTTOM_NAV_PRIMARY[surface]` — nunca
   * concede acesso a uma rota nova: o resultado é sempre filtrado contra
   * `allItems` (o que a capability do usuário já libera para este
   * `variant`). Hoje só é passado quando a superfície é conhecida com
   * segurança (sessão real de super_admin, ou preview ativo do Super
   * Admin — que já resolve `surface` no servidor). Ausente, cai no
   * comportamento anterior (ADMIN_PRIMARY fixo) — nenhuma regressão.
   */
  surface?: WorkspaceSurface;
}

export function MobileBottomNav({ variant, badges, surface }: MobileBottomNavProps) {
  const pathname = usePathname();
  const color    = accentColor[variant];
  const bg       = accentBg[variant];
  const allItems = configs[variant].nav;
  const [showMais, setShowMais] = useState(false);

  const surfacePrimaryHrefs = surface ? SURFACE_BOTTOM_NAV_PRIMARY[surface] : null;
  const effectivePrimaryHrefs = surfacePrimaryHrefs
    ? allItems.filter((i) => surfacePrimaryHrefs.includes(i.href)).map((i) => i.href)
    : null;
  // Se a superfície não libera nenhum dos itens sugeridos para este
  // `variant` (ex.: capability ainda não concedida), cai no padrão antigo
  // em vez de mostrar um rodapé vazio.
  const usesSurfaceConfig = variant === "admin" && !!effectivePrimaryHrefs && effectivePrimaryHrefs.length > 0;

  const primaryItems = usesSurfaceConfig
    ? allItems.filter((i) => effectivePrimaryHrefs!.includes(i.href))
    : variant === "admin"
      ? allItems.filter((i) => ADMIN_PRIMARY.includes(i.href))
      : allItems.slice(0, 4);

  const secondaryItems = usesSurfaceConfig
    ? allItems.filter((i) => !effectivePrimaryHrefs!.includes(i.href))
    : variant === "admin"
      ? allItems.filter((i) => !ADMIN_PRIMARY.includes(i.href))
      : allItems.slice(4);

  const hasSecondary = secondaryItems.length > 0;

  useEffect(() => { setShowMais(false); }, [pathname]);

  const secondaryActive = secondaryItems.some(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/")
  );

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16">
          {primaryItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const badge  = badges?.[href];
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-w-0 transition-colors relative",
                  active ? color : "text-gray-400"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {badge && badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate px-0.5 max-w-full leading-tight">{label}</span>
                {active && <span className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full", bg)} />}
              </Link>
            );
          })}

          {hasSecondary && (
            <button
              onClick={() => setShowMais((v) => !v)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-w-0 transition-colors relative",
                (showMais || secondaryActive) ? color : "text-gray-400"
              )}
            >
              <MoreHorizontal className="w-5 h-5 flex-shrink-0" />
              <span className="text-[10px] font-medium leading-tight">Mais</span>
              {(showMais || secondaryActive) && (
                <span className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full", bg)} />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Drawer "Mais" */}
      {showMais && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setShowMais(false)}
          />
          <div
            className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 4rem)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">Mais módulos</p>
              <button onClick={() => setShowMais(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {secondaryItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                const badge  = badges?.[href];
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all",
                      active ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-gray-50"
                    )}
                  >
                    <div className="relative">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        active ? "bg-indigo-100" : "bg-white border border-gray-200"
                      )}>
                        <Icon className={cn("w-5 h-5", active ? color : "text-gray-500")} />
                      </div>
                      {badge && badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[11px] font-medium text-center leading-tight", active ? color : "text-gray-600")}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
