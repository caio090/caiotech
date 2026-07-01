import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabaseClient,
  createRequiredSupabaseAdminClient,
  hasSupabaseServiceRoleKey,
} from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/admin/clients/[id]/hard-delete
// Apaga definitivamente um cliente. Apenas super_admin.
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clientId } = await params;

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role ?? "";
    if (role !== "super_admin") {
      return NextResponse.json({ error: "forbidden: apenas super_admin pode apagar definitivamente" }, { status: 403 });
    }

    // Tenta via RPC SECURITY DEFINER primeiro
    const rpcResult = await supabase.rpc("admin_hard_delete_client", { p_client_id: clientId });

    if (!rpcResult.error) {
      return NextResponse.json({ deleted: true });
    }

    // Fallback: service role
    if (hasSupabaseServiceRoleKey()) {
      const { error } = await createRequiredSupabaseAdminClient()
        .from("clients")
        .delete()
        .eq("id", clientId);

      if (!error) return NextResponse.json({ deleted: true });

      return NextResponse.json({ error: "Nao foi possivel apagar o cliente." }, { status: 500 });
    }

    return NextResponse.json({ error: "Nao foi possivel apagar. Rode SQL 55 no Supabase." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
