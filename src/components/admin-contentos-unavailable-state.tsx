import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 4/5) — antes desta sprint,
 * `/admin/calendario` e `/admin/contentos` (o próprio REC OS) faziam
 * `if (ctx instanceof Response) redirect("/login")` sempre que
 * `requireAdminContentOSContext()` retornava QUALQUER falha — inclusive
 * 503 ("Serviço temporariamente indisponível", o estado real deste
 * ambiente local sem `SUPABASE_SERVICE_ROLE_KEY`) e 403 (sem permissão).
 * Um usuário admin/super_admin totalmente autenticado — a sessão já foi
 * validada pelo proxy antes de a requisição chegar aqui — era enviado ao
 * login como se a sessão tivesse expirado, quando na verdade o problema
 * era de configuração/permissão, não de autenticação.
 *
 * Esta tela substitui o redirect: só 401 ("Não autenticado") continua
 * indo para /login (esse sim é genuinamente "sem sessão"); 403/503
 * mostram este estado honesto, sem nunca mencionar service role, env ou
 * qualquer detalhe interno de backend.
 */
const COPY: Record<number, { title: string; description: string }> = {
  403: {
    title: "Sem permissão para este recurso.",
    description: "Sua conta não tem acesso a esta área agora. Se você acredita que isso é um engano, contate um administrador.",
  },
  503: {
    title: "Este recurso está temporariamente indisponível.",
    description: "Não foi possível carregar os dados agora. Tente novamente em instantes — sua sessão continua ativa.",
  },
};

export function AdminContentOSUnavailableState({
  status, retryHref, backHref = "/admin/dashboard",
}: {
  status: number;
  retryHref?: string;
  backHref?: string;
}) {
  const copy = COPY[status] ?? COPY[503];

  return (
    <div className="max-w-md mx-auto py-16 px-4 text-center" data-testid="admin-contentos-unavailable-state" data-status={status}>
      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
      </div>
      <h1 className="text-lg font-bold text-gray-900 mb-2">{copy.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{copy.description}</p>
      <div className="flex items-center justify-center gap-2">
        {retryHref && (
          <a
            href={retryHref}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </a>
        )}
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
