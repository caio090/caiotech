import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";

/**
 * Sprint MVP Dogfood Final — Company Context Transversal (Fase 4/5).
 * Wrapper HTTP fino sobre o resolver já existente -- NUNCA um segundo
 * resolver (Fase 3). Único propósito: dar à shell global (client component,
 * sem acesso a Server Components) uma forma de saber o nome real da Company
 * ativa a partir do `?client=` da URL corrente, sem duplicar a lógica de
 * precedência/autorização que já vive em resolveCompanyContext().
 */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("client");
  const resolution = await resolveCompanyContext(companyId);
  if (!resolution.valid || !resolution.context) {
    return NextResponse.json({ valid: false, reason: resolution.reason ?? "company_required" });
  }
  return NextResponse.json({
    valid: true,
    companyId: resolution.context.companyId,
    companyName: resolution.context.companyName,
  });
}
