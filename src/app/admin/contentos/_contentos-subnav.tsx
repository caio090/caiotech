"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ACTIVE_CLIENT_KEY } from "@/lib/active-client";

interface NavLink {
  href: string;
  label: string;
}

const BASE_LINKS: NavLink[] = [
  { href: "/admin/contentos/home",       label: "Visão Geral" },
  { href: "/admin/contentos/campanhas",  label: "Campanhas" },
  { href: "/admin/contentos/criar",      label: "✦ Criar" },
  { href: "/admin/contentos/calendario", label: "Calendário" },
  { href: "/admin/contentos/resultados", label: "Resultados" },
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
    const urlClient = searchParams.get("client");
    if (urlClient) {
      localStorage.setItem(ACTIVE_CLIENT_KEY, urlClient);
      setClientId(urlClient);
      return;
    }
    setClientId(localStorage.getItem(ACTIVE_CLIENT_KEY) ?? "");
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Determine active base path (handles sub-routes like /resultados, /campanhas)
  function isActive(href: string): boolean {
    if (href === "/admin/contentos/home") return pathname === "/admin/contentos/home" || pathname === "/admin/contentos";
    return pathname.startsWith(href);
  }

  return (
    <nav ref={navRef} className="flex items-center gap-1 mb-6 bg-purple-50 border border-purple-100 rounded-xl p-1 overflow-x-auto w-full max-w-full scrollbar-none">
      {BASE_LINKS.map(({ href, label }) => {
        const dest   = clientId ? `${href}?client=${clientId}` : href;
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={dest}
            ref={active ? activeRef : undefined}
            className={`relative flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              active
                ? "bg-purple-600 text-white shadow-sm"
                : "text-purple-700 hover:bg-purple-100"
            }`}
            style={active ? { boxShadow: "0 2px 8px rgba(124,58,237,0.35)" } : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
