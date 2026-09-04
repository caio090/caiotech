"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

interface NavLink {
  href: string;
  label: string;
  /** Whether ?client=<id> should be appended when a client is active. */
  acceptsClient: boolean;
}

// Sprint 4.0A.1 — single navigation for the REC OS shell. Replaces the old
// 5-item subnav (which still had "Campanhas" as a top-level item and no
// Radar/Produção/Aprovações/Conexões) so pages like Aprovações stop showing
// a competing menu next to the unified one.
//
// REC OS Context Foundation V1 — "Calendário" e "Conexões" passam a apontar
// para views contextuais DENTRO do REC OS (/admin/contentos/calendario,
// /admin/contentos/conexoes) em vez de saltar para /admin/calendario e
// /admin/conexoes -- espelhar, não duplicar (ambas reaproveitam a mesma
// fonte/API real, só renderizam dentro do módulo). Company Central e o
// Calendário/Central de Integrações globais continuam existindo e
// alcançáveis por CTA secundário dentro de cada view.
const BASE_LINKS: NavLink[] = [
  { href: "/admin/contentos",            label: "Visão Geral", acceptsClient: true },
  { href: "/admin/contentos/radar",      label: "Radar",       acceptsClient: true },
  { href: "/admin/contentos/criar",      label: "✦ Criar",     acceptsClient: true },
  { href: "/admin/contentos/visual",     label: "Studio",      acceptsClient: true },
  { href: "/admin/contentos/producao",   label: "Produção",    acceptsClient: true },
  { href: "/admin/contentos/aprovacoes", label: "Aprovações",  acceptsClient: true },
  { href: "/admin/contentos/roadmap",    label: "Roadmap",     acceptsClient: true },
  { href: "/admin/contentos/mapa-cliente", label: "Mapa do Cliente", acceptsClient: true },
  { href: "/admin/contentos/calendario", label: "Calendário",  acceptsClient: true },
  { href: "/admin/contentos/resultados", label: "Resultados",  acceptsClient: true },
  { href: "/admin/contentos/conexoes",   label: "Conexões",    acceptsClient: true },
];

export function ContentosSubNav({ initialClientId }: { initialClientId?: string }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const navRef    = useRef<HTMLElement>(null);

  // Client is read straight from the URL/prop — no localStorage fallback
  // (Sprint 4.0A.1): this nav renders on pages that either always carry a
  // client (aprovacoes/producao/resultados/criar all redirect otherwise) or
  // legitimately have none (the Hub in "todos os clientes" view).
  const clientId = searchParams.get("client") ?? initialClientId ?? "";

  useEffect(() => {
    if (activeRef.current && navRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === "/admin/contentos") return pathname === "/admin/contentos";
    return pathname.startsWith(href);
  }

  return (
    <nav ref={navRef} className="flex items-center gap-1 mb-6 bg-purple-50 border border-purple-100 rounded-xl p-1 overflow-x-auto w-full max-w-full scrollbar-none">
      {BASE_LINKS.map(({ href, label, acceptsClient }) => {
        // REC OS Context Foundation V1 — Calendário e Conexões agora vivem
        // dentro do próprio REC OS (/admin/contentos/*), então seguem o
        // mesmo `?client=` de qualquer outro item da nav. O helper que
        // construía a navegação de saída para a rota global antiga não é
        // mais necessário aqui (continua em uso por quem de fato sai do
        // módulo, ex. Roadmap/Mapa do Cliente).
        const dest = acceptsClient && clientId ? `${href}?client=${clientId}` : href;
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
