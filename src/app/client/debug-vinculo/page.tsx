import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { resolveCurrentClient } from "@/lib/client/resolve-client";

export default async function DebugVinculoPage() {
  if (!isSupabaseConfigured) {
    return <pre className="p-4 text-sm">Supabase não configurado.</pre>;
  }

  const sessionClient = await createServerSupabaseClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) redirect("/login");

  // Diagnóstico extra com admin client (antes de rodar o resolver)
  let profileRaw: Record<string, unknown> | null = null;
  let clientsByEmail: Record<string, unknown>[] = [];
  // Convites enriquecidos com client_exists
  let invitesByEmail: (Record<string, unknown> & { client_exists: boolean; client_name: string | null })[] = [];
  let invitesByUserId: Record<string, unknown>[] = [];
  let adminQueryError: string | null = null;
  const hasAdmin = hasSupabaseServiceRoleKey();

  if (hasAdmin) {
    try {
      const admin = createSupabaseAdminClient();

      const { data: p } = await admin
        .from("profiles").select("id, email, role, account_type, client_id, name")
        .eq("id", user.id).maybeSingle();
      profileRaw = (p as Record<string, unknown>) ?? null;

      const { data: byEmail, error: beErr } = await admin
        .from("clients")
        .select("id, company_name, email, status, deleted_at, archived_at")
        .ilike("email", user.email ?? "");
      if (beErr) adminQueryError = (adminQueryError ?? "") + " clients.email:" + beErr.message;
      clientsByEmail = (byEmail ?? []) as Record<string, unknown>[];

      const { data: invEmail, error: ieErr } = await admin
        .from("client_invites")
        .select("id, client_id, email, status, accepted_by, accepted_at, created_at")
        .ilike("email", user.email ?? "")
        .order("created_at", { ascending: false })
        .limit(10);
      if (ieErr) adminQueryError = (adminQueryError ?? "") + " invites.email:" + ieErr.message;

      // Para cada convite, verificar se o client_id aponta para um cliente real
      const rawInvites = (invEmail ?? []) as (Record<string, unknown> & { client_id?: string })[];
      invitesByEmail = await Promise.all(
        rawInvites.map(async (inv) => {
          if (!inv.client_id) return { ...inv, client_exists: false, client_name: null };
          const { data: cli } = await admin
            .from("clients")
            .select("id, company_name, deleted_at, archived_at")
            .eq("id", inv.client_id)
            .maybeSingle();
          const exists = !!cli && !cli.deleted_at && !cli.archived_at;
          return {
            ...inv,
            client_exists: exists,
            client_name: (cli as Record<string, unknown> | null)?.company_name as string ?? null,
          };
        })
      );

      const { data: invUser } = await admin
        .from("client_invites")
        .select("id, client_id, email, status, accepted_by, accepted_at")
        .eq("accepted_by", user.id)
        .limit(10);
      invitesByUserId = (invUser ?? []) as Record<string, unknown>[];
    } catch (e) {
      adminQueryError = String(e);
    }
  }

  // Rodar resolver depois do diagnóstico inicial
  const resolved = await resolveCurrentClient();

  const debug = resolved?.debug;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Debug — Vínculo do Cliente</h1>
      <p className="text-xs text-gray-500 mb-2">
        Página temporária de diagnóstico. Não exibida no menu. Sem tokens ou chaves.
      </p>

      {/* Aviso de sessão — garante que o diagnóstico é para o usuário correto */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-bold text-blue-900">Sessão atual: {user.email}</p>
        <p className="text-xs text-blue-700 mt-0.5">
          Todo o diagnóstico abaixo é para este e-mail. Se precisar testar outro usuário, saia e entre com a conta correta.
        </p>
      </div>

      <div className="space-y-4">
        <Section title="Usuário autenticado">
          <Row label="user.id" value={user.id} />
          <Row label="user.email" value={user.email ?? "(vazio)"} />
          <Row label="hasAdminKey" value={String(hasAdmin)} highlight={!hasAdmin} />
        </Section>

        <Section title="profiles (via admin — ANTES do resolver)">
          {profileRaw ? (
            Object.entries(profileRaw).map(([k, v]) => (
              <Row key={k} label={k} value={v != null ? String(v) : "(null)"} highlight={k === "client_id" && !v} />
            ))
          ) : (
            <Row label="status" value="perfil NÃO encontrado" highlight />
          )}
        </Section>

        <Section title={`client_invites WHERE email ilike '${user.email}' (${invitesByEmail.length} resultado(s))`}>
          {invitesByEmail.length === 0 ? (
            <Row label="resultado" value="nenhum convite pelo email — gerar novo convite em /admin/clientes" highlight />
          ) : (
            invitesByEmail.map((inv, i) => {
              const isOrphan = !inv.client_exists;
              return (
                <div key={i} className={`mb-3 pb-3 border-b border-gray-100 ${isOrphan ? "bg-red-50 rounded-lg p-2" : ""}`}>
                  {isOrphan && (
                    <p className="text-xs font-bold text-red-700 mb-1">
                      ⚠ Convite ÓRFÃO — aponta para cliente que não existe mais.
                      O resolver vai pular este convite. Gere um novo em /admin/clientes.
                    </p>
                  )}
                  <Row label="id" value={String(inv.id ?? "(null)")} />
                  <Row label="client_id" value={String(inv.client_id ?? "(null)")} />
                  <Row label="client_exists" value={String(inv.client_exists)} highlight={!inv.client_exists} />
                  <Row label="client_name" value={inv.client_name ?? "(null — cliente não encontrado)"} highlight={!inv.client_name} />
                  <Row label="status" value={String(inv.status ?? "(null)")} highlight={inv.status === "pending" && !inv.client_exists} />
                  <Row label="accepted_by" value={String(inv.accepted_by ?? "(null)")} />
                  <Row label="accepted_at" value={String(inv.accepted_at ?? "(null)")} />
                  <Row label="created_at" value={String(inv.created_at ?? "(null)")} />
                </div>
              );
            })
          )}
        </Section>

        <Section title={`clients WHERE email ilike '${user.email}' (${clientsByEmail.length} resultado(s))`}>
          {clientsByEmail.length === 0 ? (
            <Row label="resultado" value="0 resultados — campo clients.email pode estar vazio" highlight />
          ) : (
            clientsByEmail.map((c, i) => (
              <div key={i} className="mb-2 border-b border-gray-100 pb-2">
                {Object.entries(c).map(([k, v]) => (
                  <Row key={k} label={k} value={v != null ? String(v) : "(null)"} />
                ))}
              </div>
            ))
          )}
        </Section>

        <Section title={`client_invites WHERE accepted_by = '${user.id}' (${invitesByUserId.length} resultado(s))`}>
          {invitesByUserId.length === 0 ? (
            <Row label="resultado" value="nenhum convite aceito por este user.id" />
          ) : (
            invitesByUserId.map((inv, i) => (
              <div key={i} className="mb-2 border-b border-gray-100 pb-2">
                {Object.entries(inv).map(([k, v]) => (
                  <Row key={k} label={k} value={v != null ? String(v) : "(null)"} />
                ))}
              </div>
            ))
          )}
        </Section>

        <Section title="Resultado do resolver (APÓS auto-claim se aplicável)">
          <Row label="source" value={resolved?.source ?? "(null — resolver retornou null)"} highlight={!resolved || resolved.source === "not_found"} />
          <Row label="clientId" value={resolved?.clientId ?? "(null)"} highlight={!resolved?.clientId} />
          <Row label="clientName" value={String((resolved?.client as Record<string, unknown> | null)?.company_name ?? "(null)")} highlight={!resolved?.client} />
          {debug && (
            <>
              <Row label="inviteClaimedId" value={debug.inviteClaimedId ?? "(não houve auto-claim)"} />
              <Row label="profileRepairedWith" value={debug.profileRepairedWith ?? "(não reparado)"} highlight={!debug.profileRepairedWith && resolved?.source !== "profile_client_id"} />
              <Row label="profileCreated" value={String(debug.profileCreated)} />
              <Row label="triedSources" value={JSON.stringify(debug.triedSources)} />
              <Row label="errors" value={debug.errors.length === 0 ? "(nenhum)" : JSON.stringify(debug.errors)} highlight={debug.errors.length > 0} />
            </>
          )}
        </Section>

        {adminQueryError && (
          <Section title="Erro nas queries admin">
            <Row label="error" value={adminQueryError} highlight />
          </Section>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">JSON completo</summary>
          <pre className="mt-2 text-[11px] bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto">
            {JSON.stringify({
              user: { id: user.id, email: user.email },
              hasAdminKey: hasAdmin,
              adminQueryError,
              profileFromAdmin: profileRaw,
              clientsByEmailMatch: clientsByEmail,
              invitesByEmailMatch: invitesByEmail,
              invitesByUserIdMatch: invitesByUserId,
              resolverResult: {
                source: resolved?.source,
                clientId: resolved?.clientId,
                clientName: (resolved?.client as Record<string, unknown> | null)?.company_name ?? null,
                debug: resolved?.debug,
              },
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-700 font-mono">{title}</h2>
      </div>
      <div className="px-4 py-3 space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="font-mono text-gray-400 w-44 flex-shrink-0">{label}</span>
      <span className={`font-mono break-all ${highlight ? "text-red-600 font-semibold" : "text-gray-800"}`}>
        {value}
      </span>
    </div>
  );
}
