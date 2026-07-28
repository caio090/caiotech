import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { buildBusinessInsightSnapshot, localDeterministicExplanation, validateInsightMetricReferences } from "@/lib/business-command-center/calculations";
import { OpenAIBusinessInsightProvider } from "@/lib/business-command-center/ai";

export const dynamic = "force-dynamic";
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_INPUT = 500; const WINDOW_MS = 60_000; const MAX_REQUESTS = 8; const TIMEOUT_MS = 15_000;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sessão necessária." }, { status: 401 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 }); }
  const question = typeof body === "object" && body !== null && "question" in body ? String((body as { question: unknown }).question).trim() : "";
  if (!question || question.length > MAX_INPUT) return NextResponse.json({ ok: false, error: `Pergunta obrigatória, com até ${MAX_INPUT} caracteres.` }, { status: 400 });
  const now = Date.now(); const bucket = buckets.get(user.id); if (bucket && bucket.resetAt > now && bucket.count >= MAX_REQUESTS) return NextResponse.json({ ok: false, error: "Limite temporário atingido. Tente novamente em um minuto." }, { status: 429 });
  buckets.set(user.id, !bucket || bucket.resetAt <= now ? { count: 1, resetAt: now + WINDOW_MS } : { ...bucket, count: bucket.count + 1 });
  const apiKey = process.env.OPENAI_API_KEY; const model = process.env.OPENAI_MODEL_MEUNEGOCIO;
  if (!apiKey || !model) return NextResponse.json({ ok: false, configured: false, message: "Assistente IA ainda não configurado. Configure OPENAI_API_KEY e OPENAI_MODEL_MEUNEGOCIO no servidor.", fallback: localDeterministicExplanation() });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try { const snapshot = buildBusinessInsightSnapshot(question); const response = await new OpenAIBusinessInsightProvider(model, apiKey).analyze(snapshot, controller.signal); if (!validateInsightMetricReferences(response)) return NextResponse.json({ ok: false, error: "A análise referenciou um indicador inexistente e foi rejeitada com segurança.", fallback: localDeterministicExplanation() }, { status: 422 }); return NextResponse.json({ ok: true, response }); }
  catch (error) { const timedOut = error instanceof Error && error.name === "AbortError"; console.warn("[meu-negocio/ai] análise indisponível", { timedOut }); return NextResponse.json({ ok: false, error: timedOut ? "A análise excedeu o tempo limite." : "Assistente indisponível no momento.", fallback: localDeterministicExplanation() }, { status: timedOut ? 504 : 502 }); }
  finally { clearTimeout(timer); }
}

