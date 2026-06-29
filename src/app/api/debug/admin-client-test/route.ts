import { NextResponse } from "next/server";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const serviceRoleConfigured = hasSupabaseServiceRoleKey();

    if (!serviceRoleConfigured) {
          return NextResponse.json({
                  ok: false,
                  serviceRoleConfigured: false,
                  canReadClientsWithServiceRole: false,
                  error: "SUPABASE_SERVICE_ROLE_KEY ausente no ambiente de producao.",
                });
        }

    try {
          const db = createSupabaseAdminClient();
          const { data, error } = await db
            .from("clients")
            .select("id")
            .limit(1);

          if (error) {
                  return NextResponse.json({
                            ok: false,
                            serviceRoleConfigured: true,
                            canReadClientsWithServiceRole: false,
                            error: error.message ?? "Erro desconhecido ao consultar clients.",
                          });
                }

          return NextResponse.json({
                  ok: true,
                  serviceRoleConfigured: true,
                  canReadClientsWithServiceRole: true,
                  error: null,
                });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro interno.";
          return NextResponse.json({
                  ok: false,
                  serviceRoleConfigured: true,
                  canReadClientsWithServiceRole: false,
                  error: message,
                });
        }
  }
