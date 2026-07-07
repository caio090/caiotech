import Link from "next/link";
import {
  Flag, Sparkles, CheckSquare, CalendarDays, Users, KanbanSquare,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VideoBackground } from "@/components/video-background";
import { SmartStartInput } from "@/components/smart-start-input";

const SHORTCUTS = [
  { href: "/admin/contentos/campanhas",  label: "Criar campanha",   icon: Flag },
  { href: "/admin/contentos",            label: "Abrir REC OS",     icon: Sparkles },
  { href: "/admin/contentos/aprovacoes", label: "Ver aprovações",   icon: CheckSquare },
  { href: "/admin/contentos/calendario", label: "Ver calendário",   icon: CalendarDays },
  { href: "/admin/clientes",             label: "Ver clientes",     icon: Users },
  { href: "/admin/operacional",          label: "Operacional",      icon: KanbanSquare },
];

// MOCK VISUAL — cards ilustrativos, sem dado real ainda. Fase futura conecta em dados reais (aprovações, tarefas etc.).
const RECENT_WORK = [
  { label: "Campanha — Verão 2026",       meta: "Cliente: Duh Lanches · em produção", icon: Flag },
  { label: "3 aprovações pendentes",      meta: "Aguardando revisão do cliente",       icon: CheckSquare },
  { label: "Calendário desta semana",     meta: "5 conteúdos agendados",               icon: CalendarDays },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function AdminInicioPage() {
  let firstName = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .maybeSingle();
        const fullName = profile?.name ?? user.email ?? "";
        firstName = fullName.split(/\s+/)[0] ?? "";
      }
    } catch {}
  }

  return (
    <div className="-m-4 md:-m-6 relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Vídeo cobre a página inteira (fixed) — topo e base ficam preenchidos ao rolar, sem bloco preto */}
      {/* z-index negativo: garante que o vídeo fica atrás da sidebar/header, que não são posicionados */}
      <div className="fixed inset-0 -z-10 bg-[#0a0a0c]">
        <VideoBackground
          src="/videos/gota-caindo.mp4"
          playbackRate={0.35}
          className="w-full h-full object-cover pointer-events-none select-none blur-[2px] scale-105"
        />
      </div>
      <div className="fixed inset-0 -z-10 bg-[#0a0a0c]/75 backdrop-blur-sm" />

      {/* Conteúdo — sobre o vídeo, sem cortar o fundo em nenhuma seção */}
      <div className="relative flex flex-col min-h-[calc(100vh-3.5rem)]">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-2xl mx-auto text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-sm md:text-base text-indigo-100/70 mt-3 mb-6">
              O que vamos criar ou organizar hoje?
            </p>

            <SmartStartInput />

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {SHORTCUTS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 text-xs font-medium px-3 py-2 rounded-xl transition-colors backdrop-blur-sm"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Continuar de onde parou — cards translúcidos, vídeo continua visível por trás */}
        <div className="px-4 md:px-6 pb-10">
          <h2 className="text-sm font-bold text-white mb-1">Continuar de onde parou</h2>
          <p className="text-xs text-indigo-100/50 mb-4">Prévia ilustrativa — conteúdo real chega na próxima fase.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {RECENT_WORK.map(({ label, meta, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-200" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{label}</p>
                  <p className="text-[11px] text-indigo-100/50 mt-0.5 truncate">{meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
