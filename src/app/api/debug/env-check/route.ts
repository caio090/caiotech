import { NextResponse } from "next/server";
import { requireDebugAdmin } from "../_require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    const denied = await requireDebugAdmin();
    if (denied) return denied;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
        runtime: process.env.VERCEL_REGION ?? "unknown",
        supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        supabaseAnonConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        supabaseServiceRoleConfigured: serviceKey.length > 0,
        serviceRoleKeyLengthGreaterThanZero: serviceKey.length > 0,
        serviceRoleKeyLooksLikeJwt: serviceKey.split(".").length === 3,
        nodeEnv: process.env.NODE_ENV ?? "unknown",
        vercelEnv: process.env.VERCEL_ENV ?? "unknown",
  });
}
