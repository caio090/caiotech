"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ACTIVE_CLIENT_KEY } from "@/lib/active-client";

const LINKS = [
  { href: "/admin/contentos/home",             label: "Visão Geral" },
  { href: "/admin/contentos/criar",            label: "✦ Criar" },
  { href: "/admin/contentos/base-estrategica", label: "Base Estratégica" },
  { href: "/admin/contentos/campanhas",        label: "Campanhas" },
  { href: "/admin/contentos/calendario",       label: "Calendário" },
  { href: "/admin/contentos/producao",         label: "Produção" },
  { href: "/admin/contentos/distribuicao",     label: "Distribuição" },
  { href: "/admin/contentos/insights",         label: "Insights" },
  { href: "/admin/contentos/radar",            label: "⟡ Radar" },
  { href: "/admin/contentos/visual",           label: "✦ Visual" },
  { href: "/admin/contentos/aprovacoes",       label: "Aprovações" },
  { href: "/admin/contentos/relatorios",       label: "Relatórios" },
];

export function ContentosSubNav() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const activeRef = useRef<HTMLAnchorElement>(null);
  const navRef    = useRef<HTMLElement>(null);

  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [pathname]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Priority 1: ?client= from URL (admin navigation via query params)
    const urlClient = searchParams.get("client");
    if (urlClient) {
      localStorage.setItem(ACTIVE_CLIENT_KEY, urlClient);
      setClientId(urlClient);
      return;
    }
    // Priority 2: localStorage (staff navigation)
    setClientId(localStorage.getItem(ACTIVE_CLIENT_KEY) ?? "");
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <nav ref={navRef} className="flex items-center gap-1 mb-6 bg-purple-50 border border-purple-100 rounded-xl p-1 overflow-x-auto w-full max-w-full scrollbar-none">
      {LINKS.map(({ href, label }) => {
        const dest     = clientId ? `${href}?client=${clientId}` : href;
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={dest}
            ref={isActive ? activeRef : undefined}
            className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              isActive
                ? "bg-purple-600 text-white shadow-sm"
                : "text-purple-700 hover:bg-purple-100"
            }`}
            style={isActive ? { boxShadow: "0 2px 8px rgba(124,58,237,0.35)" } : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
