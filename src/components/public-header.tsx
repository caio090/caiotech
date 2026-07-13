"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { LAUNCH_MODE } from "@/lib/launch/config";

const navLinks = [
  { href: "/plataforma",  label: "Plataforma" },
  { href: "/diagnostico", label: "Diagnóstico" },
  { href: "/#rec-os",     label: "REC OS" },
  { href: "/blog",        label: "Blog" },
  { href: "/planos",      label: "Planos" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #222230" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-[52px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setOpen(false)}>
          <span className="text-sm font-bold tracking-[.15em] uppercase" style={{ color: "#e8e8e8", fontFamily: "'Space Mono', monospace" }}>
            LOKAT<span style={{ color: "#7b6ef6" }}>.</span>OS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("text-[.72rem] uppercase tracking-[.12em] transition-colors", pathname === link.href ? "text-[#7b6ef6]" : "text-[#555566] hover:text-[#e8e8e8]")}
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/rec"
            className="text-[.65rem] uppercase tracking-[.14em] transition-colors"
            style={{ fontFamily: "'Space Mono', monospace", color: "#c0392b", border: "1px solid #c0392b40", padding: ".22rem .55rem" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c0392b80")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#c0392b40")}
          >
            LOKAT.REC
          </Link>
          <Link href="/login" className="text-[.72rem] uppercase tracking-[.1em] transition-colors text-[#555566] hover:text-[#e8e8e8]" style={{ fontFamily: "'Space Mono', monospace" }}>
            Entrar
          </Link>
          <Link
            href={LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta"}
            className="text-[.7rem] uppercase tracking-[.12em] font-bold px-4 py-[.35rem] hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "#7b6ef6", color: "#fff", fontFamily: "'Space Mono', monospace" }}
          >
            {LAUNCH_MODE.publicSignupMode === "waitlist" ? "■ Entrar no beta" : "■ Começar"}
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href={LAUNCH_MODE.publicSignupMode === "waitlist" ? "/pre-acesso" : "/criar-conta"}
            className="text-[.65rem] uppercase tracking-[.1em] font-bold px-3 py-1.5 active:scale-95 transition-all"
            style={{ background: "#7b6ef6", color: "#fff", fontFamily: "'Space Mono', monospace" }}
          >
            {LAUNCH_MODE.publicSignupMode === "waitlist" ? "Beta" : "Começar"}
          </Link>
          <button onClick={() => setOpen((v) => !v)} className="p-2 transition-colors" style={{ color: "#555566" }} aria-label={open ? "Fechar" : "Menu"}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden shadow-lg" style={{ background: "#0a0a0c", borderTop: "1px solid #222230" }}>
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn("block text-[.72rem] uppercase tracking-[.12em] py-2 transition-colors", pathname === link.href ? "text-[#7b6ef6]" : "text-[#555566] hover:text-[#e8e8e8]")}
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 space-y-2" style={{ borderTop: "1px solid #222230" }}>
              <Link href="/rec" onClick={() => setOpen(false)} className="block text-[.68rem] uppercase tracking-[.14em] py-2 transition-colors" style={{ fontFamily: "'Space Mono', monospace", color: "#c0392b" }}>
                LOKAT.REC
              </Link>
              <Link href="/login" onClick={() => setOpen(false)} className="block text-[.72rem] uppercase tracking-[.1em] py-2 text-[#555566] hover:text-[#e8e8e8] transition-colors" style={{ fontFamily: "'Space Mono', monospace" }}>
                Entrar
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
