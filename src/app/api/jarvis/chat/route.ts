import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";
import { createServerSupabaseClient, createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { resolveCompanyContext } from "@/lib/company-context/resolve";
import { getProjectProjections } from "@/lib/project-projection/adapters";
import { getWorkItemProjections } from "@/lib/work-item-projection/adapters";
import { buildCompanyCentralView } from "@/lib/company-central/builder";
import { officeCalendarHealth } from "@/lib/business-office/source-health";
import { getBusinessOfficeFeed } from "@/lib/business-office/data";
import { isJarvisConfigured, streamJarvisChat } from "@/lib/jarvis/client";
import { buildJarvisContextText } from "@/lib/jarvis/context-builder";
import { buildJarvisSystemInstructions } from "@/lib/jarvis/instructions";
import { validateReportAttachment, buildReportContentParts } from "@/lib/jarvis/report";
import { logJarvisRequest, sanitizeError } from "@/lib/jarvis/safety";
import { tryAcquireJarvisSlot, releaseJarvisSlot, MAX_MESSAGE_CHARS, MAX_HISTORY_MESSAGES } from "@/lib/jarvis/cost-controls";
import type { JarvisChatRequestBody } from "@/lib/jarvis/types";

/**
 * Sprint MVP Experience Completion V0.1 (Parte D3/D6, Fase 48-49) —
 * Jarvis chat. Authenticated, streaming, one-active-request-per-user,
 * Company sempre revalidada server-side (nunca confia em companyId
 * enviado pelo browser sem revalidação -- resolveCompanyContext() já faz
 * exatamente essa checagem para toda a plataforma).
 */
export const POST = withMutationProtection(async function POST(request: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  if (!isJarvisConfigured()) {
    return NextResponse.json({ ok: false, reason: "ai_not_configured", message: "Jarvis está temporariamente indisponível." }, { status: 503 });
  }

  let body: JarvisChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: "message_too_long" }, { status: 400 });

  const resolution = await resolveCompanyContext(body.companyId ?? null);
  if (!resolution.valid || !resolution.context) {
    return NextResponse.json({ error: "company_required", reason: resolution.reason }, { status: 403 });
  }
  const context = resolution.context;

  if (!tryAcquireJarvisSlot(user.id)) {
    return NextResponse.json({ error: "request_in_progress" }, { status: 429 });
  }

  let attachmentParts: ReturnType<typeof buildReportContentParts> | undefined;
  if (body.attachment) {
    const validation = validateReportAttachment(body.attachment);
    if (!validation.valid) {
      releaseJarvisSlot(user.id);
      return NextResponse.json({ error: "invalid_attachment", reason: validation.reason }, { status: 400 });
    }
    attachmentParts = buildReportContentParts(body.attachment);
  }

  const history = (body.history ?? []).slice(-MAX_HISTORY_MESSAGES);

  let contextText: string;
  try {
    if (!hasSupabaseServiceRoleKey()) {
      contextText = `Empresa atual: ${context.companyName ?? "não identificada"}\nNão foi possível carregar dados operacionais agora (fonte indisponível) -- responda com base só no que o usuário perguntar, deixando claro que não tem acesso aos números agora.`;
    } else {
      const adminDb = createSupabaseAdminClient();
      const [officeResult, projects] = await Promise.all([
        getBusinessOfficeFeed(adminDb, { clientId: context.companyId }),
        getProjectProjections(adminDb, context.companyId),
      ]);
      const workItems = await getWorkItemProjections(adminDb, context.companyId);
      const view = buildCompanyCentralView(
        { companyId: context.companyId, companyName: context.companyName, surface: context.surface },
        projects, workItems, new Date().toISOString(),
      );
      contextText = buildJarvisContextText({
        companyName: context.companyName,
        surface: context.surface,
        route: body.route ?? "/admin",
        office: {
          todayCount: view.workSummary.todayCount,
          overdueCount: view.workSummary.overdueCount,
          approvalsCount: view.workSummary.approvalsCount,
          calendarAvailable: officeCalendarHealth(officeResult.sourceErrors) !== "unavailable",
        },
        activeProjects: view.activeProjects,
        attentionItems: view.attention,
      });
    }
  } catch {
    releaseJarvisSlot(user.id);
    return NextResponse.json({ error: "context_build_failed" }, { status: 500 });
  }

  const systemInstructions = buildJarvisSystemInstructions(contextText);
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const abortController = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const encoder = new TextEncoder();
      try {
        for await (const delta of streamJarvisChat({
          systemInstructions, history, message, attachmentParts, signal: abortController.signal,
        })) {
          streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        }
        streamController.enqueue(encoder.encode("data: [DONE]\n\n"));
        logJarvisRequest({ requestId, mode: "chat", durationMs: Date.now() - startedAt, status: "ok" });
      } catch (error) {
        const sanitized = sanitizeError(error);
        streamController.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: sanitized })}\n\n`));
        logJarvisRequest({ requestId, mode: "chat", durationMs: Date.now() - startedAt, status: "error", error: sanitized });
      } finally {
        releaseJarvisSlot(user.id);
        streamController.close();
      }
    },
    cancel() {
      abortController.abort();
      releaseJarvisSlot(user.id);
    },
  });

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
});
