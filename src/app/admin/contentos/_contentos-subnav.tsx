"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ACTIVE_CLIENT_KEY } from "@/lib/active-client";

interface NavLink {
  href: string;
  label: string;
  badge?: string;
  badgeVariant?: "amber" | "zinc";
}

const BASE_LINKS: NavLink[] = [
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

function buildLinks(role: string): NavLink[] {
  const links = [...BASE_LINKS];
  if (role === "admin" || role === "super_admin") {
    links.push({
      href: "/admin/contentos/agendamento",
      label: "Agendamento",
      badge: "Não configurado",
      badgeVariant: "zinc",
    });
  }
  if (role === "super_admin") {
    links.push({
      href: "/admin/contentos/editor-os",
      label: "EditorOS",
      badge: "Avaliação",
      badgeVariant: "amber",
    });
  }
  return links;
}

interface ContentosSubNavProps {
  role?: string;
}

export function ContentosSubNav({ role = "" }: ContentosSubNavProps) {
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
    const urlClient = searchParams.get("client");
    if (urlClient) {
      localStorage.setItem(ACTIVE_CLIENT_KEY, urlClient);
      setClientId(urlClient);
      return;
    }
    setClientId(localStorage.getItem(ACTIVE_CLIENT_KEY) ?? "");
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const links = buildLinks(role);

  return (
    <nav ref={navRef} className="flex items-center gap-1 mb-6 bg-purple-50 border border-purple-100 rounded-xl p-1 overflow-x-auto w-full max-w-full scrollbar-none">
      {links.map(({ href, label, badge, badgeVariant }) => {
        const dest     = clientId ? `${href}?client=${clientId}` : href;
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={dest}
            ref={isActive ? activeRef : undefined}
            className={`relative flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              isActive
                ? "bg-purple-600 text-white shadow-sm"
                : "text-purple-700 hover:bg-purple-100"
            }`}
            style={isActive ? { boxShadow: "0 2px 8px rgba(124,58,237,0.35)" } : undefined}
          >
            {label}
            {badge && (
              <span
                className={`text-[10px] font-semibold rounded px-1 py-px leading-none ${
                  isActive
                    ? "bg-white/20 text-white"
                    : badgeVariant === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
