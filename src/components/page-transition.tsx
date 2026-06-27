"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * PageTransition — wrapper de animação de página para o layout público.
 *
 * Como funciona com Next.js App Router:
 * - O Next.js faz a navegação client-side (sem reload).
 * - Swup foi instalado mas conflita com <Link> do Next.js no App Router
 *   (ambos interceptam cliques em <a>).
 * - Solução: usamos as convenções CSS do Swup (classes e atributos)
 *   mas acionadas via usePathname — o Next.js roteia, nós animamos.
 *
 * Fluxo:
 *   rota muda → adiciona [data-page-leaving] → 300ms depois troca conteúdo
 *   → adiciona [data-page-entering] → remove ao final da animação
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const prevPath = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    if (timerRef.current) clearTimeout(timerRef.current);

    setPhase("leaving");

    timerRef.current = setTimeout(() => {
      setDisplayChildren(children);
      setPhase("entering");

      timerRef.current = setTimeout(() => {
        setPhase("idle");
      }, 400);
    }, 280);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, children]);

  // Sync children when idle (mesma rota, conteúdo atualizado)
  useEffect(() => {
    if (phase === "idle") setDisplayChildren(children);
  }, [children, phase]);

  return (
    <div
      id="swup"
      data-page-phase={phase}
      className="page-transition-wrapper"
    >
      {displayChildren}
    </div>
  );
}
