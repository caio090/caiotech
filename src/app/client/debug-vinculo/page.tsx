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

  // Resolver completo
  const resolved = await resolveCurrentClient();

  // Diagnóstico extra com admin client
  let profileRaw: Record<string, unknown> | null = null;
  let clientsByEmail: Record<string, unknown>[] = [];
  let invitesByEmail: Record<string, unknown>[] = [];
  let invitesByUserId: Record<string, unknown>[] = [];
  let adminError: string | null = null;
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
      if (beErr) adminError = beErr.message;
      clientsByEmail = (byEmail ?? []) as Record<string, unknown>[];

      const { data: invEmail } = await admin
        .from("client_invites")
        .select("id, client_id, email, status, accepted_by, accepted_at, created_at")
        .ilike("email", user.email ?? "")
        .limit(10);
      invitesByEmail = (invEmail ?? []) as Record<string, unknown>[];

      const { data: invUser } = await admin
        .from("client_invites")
        .select("id, client_id, email, status, accepted_by, accepted_at")
        .eq("accepted_by", user.id)
        .limit(10);
      invitesByUserId = (invUser ?? []) as Record<string, unknown>[];
    } catch (e) {
      adminError = String(e);
    }
  }

  const diag = {
    user: { id: user.id, email: user.email },
    hasAdminKey: hasAdmin,
    adminQueryError: adminError,
    profileFromAdmin: profileRaw,
    clientsByEmailMatch: clientsByEmail,
    invitesByEmailMatch: invitesByEmail,
    invitesByUserIdMatch: invitesByUserId,
    resolverResult: {
      source: resolved?.source ?? "null (resolver returned null)",
      clientId: resolved?.clientId ?? null,
      clientName: (resolved?.client as Record<string, unknown> | null)?.company_name ?? null,
      debug: resolved?.debug ?? null,
    },
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-lg font-bold text-gray-900 mb-1">Debug — Vínculo do Cliente</h1>
      <p className="text-xs text-gray-500 mb-4">
        Página temporária de diagnóstico. Não exibida no menu. Sem tokens ou chaves.
      </p>

      <div className="space-y-4">
        <Section title="Usuário autenticado">
          <Row label="user.id" value={user.id} />
          <Row label="user.email" value={user.email ?? "(vazio)"} />
          <Row label="hasAdminKey" value={String(hasAdmin)} highlight={!hasAdmin} />
        </Section>

        <Section title="profiles (via admin)">
          {profileRaw ? (
            Object.entries(profileRaw).map(([k, v]) => (
              <Row key={k} label={k} value={String(v ?? "(null)")} highlight={k === "client_id" && !v} />
            ))
          ) : (
            <Row label="status" value="perfil não encontrado" highlight />
          )}
        </Section>

        <Section title={`clients WHERE email ilike '${user.email}' (${clientsByEmail.length} resultado(s))`}>
          {clientsByEmail.length === 0 ? (
            <Row label="resultado" value="NENHUM — o campo clients.email pode estar vazio ou diferente" highlight />
          ) : (
            clientsByEmail.map((c, i) => (
              <div key={i} className="mb-2 border-b border-gray-100 pb-2">
                {Object.entries(c).map(([k, v]) => (
                  <Row key={k} label={k} value={String(v ?? "(null)")} highlight={k === "email" && !v} />
                ))}
              </div>
            ))
          )}
        </Section>

        <Section title={`client_invites WHERE email ilike '${user.email}' (${invitesByEmail.length} resultado(s))`}>
          {invitesByEmail.length === 0 ? (
            <Row label="resultado" value="nenhum convite pelo email" />
          ) : (
            invitesByEmail.map((inv, i) => (
              <div key={i} className="mb-2 border-b border-gray-100 pb-2">
                {Object.entries(inv).map(([k, v]) => (
                  <Row key={k} label={k} value={String(v ?? "(null)")} />
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
                  <Row key={k} label={k} value={String(v ?? "(null)")} />
                ))}
              </div>
            ))
          )}
        </Section>

        <Section title="Resultado do resolver">
          <Row label="source" value={diag.resolverResult.source} highlight={diag.resolverResult.source === "not_found"} />
          <Row label="clientId" value={diag.resolverResult.clientId ?? "(null)"} highlight={!diag.resolverResult.clientId} />
          <Row label="clientName" value={String(diag.resolverResult.clientName ?? "(null)")} highlight={!diag.resolverResult.clientName} />
        </Section>

        {diag.resolverResult.debug && (
          <Section title="debug.triedSources + errors">
            <Row label="triedSources" value={JSON.stringify((diag.resolverResult.debug as unknown as { triedSources: string[] }).triedSources)} />
            <Row label="errors" value={JSON.stringify((diag.resolverResult.debug as unknown as { errors: string[] }).errors)} highlight={(diag.resolverResult.debug as unknown as { errors: string[] }).errors.length > 0} />
          </Section>
        )}

        {adminError && (
          <Section title="Erro nas queries admin">
            <Row label="error" value={adminError} highlight />
          </Section>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">JSON completo</summary>
          <pre className="mt-2 text-[11px] bg-gray-900 text-green-400 p-4 rounded-xl overflow-auto">
            {JSON.stringify(diag, null, 2)}
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
      <span className="font-mono text-gray-400 w-40 flex-shrink-0">{label}</span>
      <span className={`font-mono ${highlight ? "text-red-600 font-semibold" : "text-gray-800"}`}>
        {value}
      </span>
    </div>
  );
}
