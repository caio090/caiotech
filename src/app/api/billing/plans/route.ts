// GET /api/billing/plans
// Fonte canônica de planos. Lê do banco (billing_plans). Fallback: plans.ts hardcoded.
// Todas as telas devem consumir este endpoint — /planos, landing, onboarding, checkout.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";

interface BillingPlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  trial_days: number;
  status: string;
  entitlements: string[];
  limits: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const includeInternal = url.searchParams.get("internal") === "true";

  try {
    // Tenta buscar do banco (fonte canônica)
    let db;
    if (hasSupabaseServiceRoleKey()) {
      try { db = createSupabaseAdminClient(); } catch { /* fallthrough */ }
    }
    if (!db) {
      try { db = await createServerSupabaseClient(); } catch { /* fallthrough */ }
    }

    if (db) {
      const query = db
        .from("billing_plans")
        .select("id, slug, name, description, price_monthly, price_yearly, currency, trial_days, status, entitlements, limits, metadata")
        .order("price_monthly", { ascending: true, nullsFirst: true });

      if (!includeInternal) {
        query.in("status", ["active", "beta"]);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          ok: true,
          source: "database",
          plans: (data as BillingPlanRow[]).map((p) => ({
            slug: p.slug,
            name: p.name,
            description: p.description ?? "",
            price_monthly: p.price_monthly ?? 0,
            price_yearly: p.price_yearly ?? null,
            trial_days: p.trial_days,
            currency: p.currency,
            status: p.status,
            entitlements: Array.isArray(p.entitlements) ? p.entitlements : [],
            limits: p.limits ?? {},
            metadata: p.metadata ?? {},
          })),
        });
      }

      // Se tabela não existe (SQL 68 pendente), cai no fallback
    }
  } catch { /* fallthrough to hardcoded fallback */ }

  // Fallback: planos hardcoded de plans.ts
  const filtered = includeInternal
    ? PLANS
    : PLANS.filter((p) => p.status === "active" || p.status === "beta");

  return NextResponse.json({
    ok: true,
    source: "fallback",
    plans: filtered.map((p) => ({
      slug: p.slug,
      name: p.name,
      description: p.description,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly ?? null,
      trial_days: p.trial_days,
      currency: p.currency,
      status: p.status,
      entitlements: p.entitlements,
      limits: p.limits,
      metadata: {},
    })),
    notice: "SQL 68 pendente — usando planos locais como fallback.",
  });
}
