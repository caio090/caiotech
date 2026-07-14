import Link from "next/link";
import {
  Flag, Sparkles, CheckSquare, CalendarDays, Users, KanbanSquare, Target, Activity,
  Layers, CalendarClock,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VideoBackground } from "@/components/video-background";
import { SmartStartInput } from "@/components/smart-start-input";

const BASE_SHORTCUTS = [
  { href: "/admin/leads",               label: "CRM",              icon: Target },
  { href: "/admin/contentos",           label: "Abrir REC OS",     icon: Sparkles },
  { href: "/admin/contentos/campanhas", label: "Nova campanha",    icon: Flag },
  { href: "/admin/clientes",            label: "Clientes",         icon: Users },
  { href: "/admin/operacional",         label: "Operacional",      icon: KanbanSquare },
  { href: "/admin/contentos/aprovacoes",label: "Aprovações",       icon: CheckSquare },
  { href: "/admin/status",              label: "Status V1",        icon: Activity },
  { href: "/admin/contentos/calendario",label: "Calendário",       icon: CalendarDays },
];

// MOCK VISUAL — cards ilustrativos, sem dado real ainda.
const RECENT_WORK = [
  { label: "Leads com atenção",        meta: "Leads novos aguardando contato",    icon: Target },
  { label: "Aprovações pendentes",     meta: "Aguardando revisão do cliente",     icon: CheckSquare },
  { label: "Calendário desta semana",  meta: "Conteúdos agendados para a semana", icon: CalendarDays },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function AdminInicioPage() {
  let firstName = "";
  let role = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, role")
          .eq("id", user.id)
          .maybeSingle();
        const fullName = profile?.name ?? user.email ?? "";
        firstName = fullName.split(/\s+/)[0] ?? "";
        role = profile?.role ?? "";
      }
    } catch {}
  }

  const isSuperAdmin = role === "super_admin";
  const isAdmin      = role === "admin" || role === "super_admin";

  // Build shortcuts — add tool shortcuts for eligible roles
  const shortcuts = [...BASE_SHORTCUTS];
  if (isAdmin) {
    shortcuts.push({
      href: `/admin/contentos/agendamento`,
      label: "Agendamento",
      icon: CalendarClock,
    });
  }
  if (isSuperAdmin) {
    shortcuts.push({
      href: `/admin/contentos/editor-os`,
      label: "EditorOS Beta",
      icon: Layers,
    });
  }

  return (
    <div className="-m-4 md:-m-6 relative min-h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#0a0a0c]">
        <VideoBackground
          src="/videos/gota-caindo.mp4"
          playbackRate={0.35}
          className="w-full h-full object-cover pointer-events-none select-none blur-[2px] scale-105"
        />
      </div>
      <div className="fixed inset-0 -z-10 bg-[#0a0a0c]/75 backdrop-blur-sm" />

      <div className="relative flex flex-col min-h-[calc(100vh-3.5rem)]">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-2xl mx-auto text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="text-sm md:text-base text-indigo-100/70 mt-3 mb-6">
              Central inteligente — Marketing, CRM e conteúdo em um só lugar.
            </p>

            <SmartStartInput />

            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {shortcuts.map(({ href, label, icon: Icon }) => {
                const isEditorOS  = label === "EditorOS Beta";
                const isAgendamento = label === "Agendamento";
                return (
                  <Link
                    key={href + label}
                    href={href}
                    className={`flex items-center gap-1.5 border text-white/90 text-xs font-medium px-3 py-2 rounded-xl transition-colors backdrop-blur-sm ${
                      isEditorOS
                        ? "bg-indigo-600/20 hover:bg-indigo-600/35 border-indigo-500/30"
                        : isAgendamento
                        ? "bg-white/10 hover:bg-white/20 border-white/15"
                        : "bg-white/10 hover:bg-white/20 border-white/15"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {isEditorOS && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 rounded px-1 py-px leading-none">
                        Avaliação
                      </span>
                    )}
                    {isAgendamento && (
                      <span className="text-[9px] bg-zinc-700/60 text-zinc-400 rounded px-1 py-px leading-none">
                        Não configurado
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

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
