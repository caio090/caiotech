import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CLIENT_VISIBLE_STATUSES } from "@/lib/client-visibility";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

// GET /api/admin/clients/trash
// Retorna clientes ocultos: status fora dos visíveis, deleted_at/archived_at preenchidos, ou is_test=true
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "";
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Clientes que NÃO são visíveis: status fora dos visíveis OU deleted_at/archived_at preenchidos
    const notInList = CLIENT_VISIBLE_STATUSES.join(",");
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name, responsible_name, email, segment, status, deleted_at, archived_at, created_at")
      .or(`status.not.in.(${notInList}),deleted_at.not.is.null,archived_at.not.is.null`)
      .order("archived_at", { ascending: false, nullsFirst: false })
      .order("deleted_at",  { ascending: false, nullsFirst: false })
      .order("company_name");

    if (error) throw error;

    return NextResponse.json({ clients: data ?? [] });
  } catch {
    return NextResponse.json({ clients: [], error: "Erro ao carregar lixeira." });
  }
}
