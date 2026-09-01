import { NextRequest, NextResponse } from "next/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { executeStudioSkill } from "@/lib/rec-os/studio/execute";
import type { StudioBriefInput, StudioSkillExecutionRequest, StudioSkillExecutionResult } from "@/lib/rec-os/studio";

/**
 * Sprint REC OS Studio Foundation V0.2 — POST /api/studio/skills/execute
 * ÚNICA rota canônica de execução do Studio (Fase 10): nenhuma rota por
 * skill (nunca /api/vidigal, /api/openai/vidigal, /api/generate-png).
 * Uma skill nova se registra em registry.ts + execute.ts -- nunca uma
 * nova rota.
 *
 * Esta rota chama um provider de IA externo (custo real por chamada
 * quando configurado) -- mesmo raciocínio de
 * src/app/api/meu-negocio/ai/analyze/route.ts: bloqueada durante
 * Workspace Preview ANTES de gastar qualquer request/limite/chamada.
 *
 * Autenticação + autorização Company-scoped: resolveCompanyContext()
 * (único ponto canônico, nunca um segundo resolver/permission engine).
 * O executor só recebe o companyId JÁ RESOLVIDO/autorizado -- nunca o
 * valor bruto enviado pelo cliente.
 */
export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_FREEFORM_BRIEF_CHARS = 4000;

interface ExecuteBody {
  skillId: string;
  input: StudioBriefInput;
}

function parseBody(raw: unknown): ExecuteBody | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const skillId = typeof body.skillId === "string" ? body.skillId.trim() : "";
  if (!skillId) return null;
  const input = body.input && typeof body.input === "object" ? (body.input as StudioBriefInput) : {};
  return { skillId, input };
}

function statusCodeFor(result: StudioSkillExecutionResult): number {
  if (result.status === "completed") return 200;
  switch (result.error?.code) {
    case "STUDIO_SKILL_NOT_FOUND": return 404;
    case "STUDIO_SKILL_INVALID_INPUT": return 400;
    case "STUDIO_AI_PROVIDER_UNAVAILABLE": return 503;
    case "STUDIO_SKILL_RUNTIME_UNAVAILABLE": return 503;
    case "STUDIO_SKILL_OUTPUT_INVALID": return 502;
    default: return 500;
  }
}

export const POST = withMutationProtection(async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parseBody(rawBody);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "skillId obrigatório." }, { status: 400 });
  }
  if (parsed.input.freeformBrief && parsed.input.freeformBrief.length > MAX_FREEFORM_BRIEF_CHARS) {
    return NextResponse.json({ ok: false, error: `Briefing livre excede ${MAX_FREEFORM_BRIEF_CHARS} caracteres.`, code: "STUDIO_SKILL_INVALID_INPUT" }, { status: 400 });
  }

  // Único resolver de Company canônico -- nunca um segundo permission
  // engine para o Studio (Fase 4). companyId do body é só o "pedido";
  // o valor confiável é resolution.context.companyId, já autorizado.
  const resolution = await resolveCompanyContext(parsed.input.companyId ?? null);
  if (!resolution.valid || !resolution.context) {
    const unauthorized = resolution.reason === "role_not_supported";
    return NextResponse.json(
      {
        ok: false,
        error: unauthorized ? "Sem permissão para executar esta skill nesta Company." : "Contexto de Company necessário para executar esta skill.",
        code: unauthorized ? "STUDIO_COMPANY_CONTEXT_UNAUTHORIZED" : "STUDIO_COMPANY_CONTEXT_REQUIRED",
      },
      { status: unauthorized ? 403 : 401 },
    );
  }

  const bucketKey = `${resolution.context.companyId}|${resolution.context.workspaceId ?? "none"}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);
  if (bucket && bucket.resetAt > now && bucket.count >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ ok: false, error: "Limite temporário atingido. Tente novamente em um minuto." }, { status: 429 });
  }
  buckets.set(bucketKey, !bucket || bucket.resetAt <= now ? { count: 1, resetAt: now + WINDOW_MS } : { ...bucket, count: bucket.count + 1 });

  const executionRequest: StudioSkillExecutionRequest = {
    skillId: parsed.skillId,
    input: parsed.input,
    context: { company: { id: resolution.context.companyId, name: resolution.context.companyName } },
  };

  let result: StudioSkillExecutionResult;
  try {
    result = await executeStudioSkill(executionRequest);
  } catch (error) {
    console.error("[api/studio/skills/execute] falha inesperada", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ ok: false, error: "Não foi possível executar a skill no momento." }, { status: 500 });
  }

  return NextResponse.json({ ok: result.status === "completed", result }, { status: statusCodeFor(result) });
});
