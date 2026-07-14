import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveOlaClickBaseUrl } from "@/lib/olaclick";
import { getActiveDigitalMenuConnection } from "@/lib/digital-menu/server";

export const dynamic    = "force-dynamic";
export const revalidate = 0;

// ── Safe field description (NO values, NO PII) ────────────────────────────────

type FieldKind = "string" | "number" | "boolean" | "array" | "object" | "null" | "undefined";

function describeFields(obj: Record<string, unknown>, prefix = ""): Record<string, FieldKind> {
  const result: Record<string, FieldKind> = {};
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v === null)                result[path] = "null";
    else if (v === undefined)      result[path] = "undefined";
    else if (Array.isArray(v))     result[path] = "array";
    else if (typeof v === "object") result[path] = "object";
    else                           result[path] = typeof v as FieldKind;
  }
  return result;
}

function sniffPaymentCandidates(order: Record<string, unknown>) {
  const singleKeys = [
    "payment_method", "paymentMethod", "payment_type", "paymentType",
    "forma_pagamento", "metodo_pagamento", "payment",
  ];
  const arrayKeys  = ["payments", "payment_methods", "paymentMethods"];

  const found: {
    key: string;
    valueType: string;
    presentInOrder: boolean;
    arrayLength?: number;
    nestedKeys?: string[];
  }[] = [];

  for (const k of singleKeys) {
    if (k in order) {
      const v = order[k];
      found.push({
        key: k,
        valueType: v === null ? "null" : Array.isArray(v) ? "array" : typeof v,
        presentInOrder: true,
        nestedKeys: v && typeof v === "object" && !Array.isArray(v)
          ? Object.keys(v as object)
          : undefined,
      });
    }
  }

  for (const k of arrayKeys) {
    if (k in order) {
      const v = order[k];
      if (Array.isArray(v)) {
        found.push({
          key: k,
          valueType: "array",
          presentInOrder: true,
          arrayLength: v.length,
          nestedKeys: v.length > 0 && v[0] && typeof v[0] === "object"
            ? Object.keys(v[0] as object)
            : undefined,
        });
      }
    }
  }

  return found;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clientId = req.nextUrl.searchParams.get("client_id");
    if (!clientId) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    // Get OlaClick connection
    const lookup = await getActiveDigitalMenuConnection(supabase, clientId);
    if (!lookup.connection) {
      return NextResponse.json({ error: "Nenhuma conexão OlaClick ativa para este cliente" }, { status: 404 });
    }

    const conn    = lookup.connection;
    const baseUrl = resolveOlaClickBaseUrl({ api_base_url: conn.api_base_url });
    const token   = conn.access_token ?? "";

    if (!token) {
      return NextResponse.json({ error: "Token de API não encontrado na conexão" }, { status: 422 });
    }

    // Fetch one sample order (today or recent)
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().split("T")[0];

    const url = new URL(`${baseUrl}/v1/orders`);
    url.searchParams.set("filter[start_date]", weekAgo);
    url.searchParams.set("filter[end_date]",   today);
    url.searchParams.set("page",  "1");
    url.searchParams.set("limit", "5");

    let sampleOrders: Record<string, unknown>[] = [];
    let fetchError: string | null = null;
    let httpStatus: number | null = null;

    try {
      const resp = await fetch(url.toString(), {
        headers: { "Authorization": `Bearer ${token}`, "accept": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });

      httpStatus = resp.status;

      if (resp.ok) {
        const body = await resp.json() as unknown;
        if (Array.isArray(body)) {
          sampleOrders = (body as Record<string, unknown>[]).slice(0, 5);
        } else if (body && typeof body === "object") {
          const b = body as Record<string, unknown>;
          for (const k of ["data", "orders", "items", "results", "records"]) {
            if (Array.isArray(b[k])) {
              sampleOrders = (b[k] as Record<string, unknown>[]).slice(0, 5);
              break;
            }
          }
        }
      } else {
        fetchError = `HTTP ${resp.status}`;
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : String(e);
    }

    if (sampleOrders.length === 0) {
      return NextResponse.json({
        ok: false,
        clientId,
        httpStatus,
        fetchError,
        message: "Nenhum pedido retornado no período. Diagnóstico de campos de pagamento não disponível.",
        paymentCandidates: [],
        sampleFieldSchema: null,
      });
    }

    // Analyze all sample orders — field names only, NEVER values
    const allCandidates: Record<string, unknown>[] = [];
    const fieldSchemas: Record<string, FieldKind>[] = [];

    for (const order of sampleOrders) {
      const candidates = sniffPaymentCandidates(order);
      allCandidates.push(...candidates);
      fieldSchemas.push(describeFields(order));
    }

    // Aggregate: which payment keys appear in how many orders
    const keyCounts: Record<string, number> = {};
    for (const c of allCandidates) {
      const k = c.key as string;
      keyCounts[k] = (keyCounts[k] ?? 0) + 1;
    }

    // Deduplicated sample of candidates from first order
    const sampleCandidates = sniffPaymentCandidates(sampleOrders[0]);

    // Top-level field names from first order (no values)
    const topLevelFields = Object.keys(sampleOrders[0]).sort();

    return NextResponse.json({
      ok: true,
      clientId,
      httpStatus,
      sampleOrderCount:  sampleOrders.length,
      topLevelFields,
      paymentKeyCounts:  keyCounts,
      samplePaymentCandidates: sampleCandidates,
      sampleFieldSchema: fieldSchemas[0] ?? null,
      note: "Este endpoint retorna apenas nomes e tipos de campos — nunca valores, PII ou dados brutos.",
    });
  } catch (e) {
    console.error("[payment-methods/diagnostics]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
