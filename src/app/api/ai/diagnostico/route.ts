import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

// ── POST /api/ai/diagnostico ─────────────────────────────────
// Gera um diagnóstico de marca com IA.
// Chave OPENAI_API_KEY nunca é exposta ao cliente.
export const POST = withMutationProtection(async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "IA não configurada." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const { marca, objetivo, publico, tom, redes } = body as {
    marca?: string; objetivo?: string; publico?: string; tom?: string; redes?: string[];
  };

  if (!marca) {
    return NextResponse.json({ error: "Campo 'marca' obrigatório." }, { status: 400 });
  }

  const prompt = `
Você é um estrategista de conteúdo e branding especialista em agências digitais.
Com base nos dados abaixo, gere um diagnóstico estratégico de marca conciso (máximo 5 parágrafos).

Marca: ${marca}
Objetivo principal: ${objetivo ?? "não informado"}
Público-alvo: ${publico ?? "não informado"}
Tom de voz: ${tom ?? "não informado"}
Redes sociais: ${redes?.join(", ") ?? "não informado"}

O diagnóstico deve conter:
1. Posicionamento atual e potencial
2. Tom de voz recomendado
3. Canais prioritários
4. Principal oportunidade de conteúdo
5. Um alerta estratégico ou gap identificado

Responda em português brasileiro, de forma direta e profissional.
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ai/diagnostico] OpenAI error:", errText);
      return NextResponse.json({ error: "Erro ao processar com IA." }, { status: 502 });
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const result = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[ai/diagnostico]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
