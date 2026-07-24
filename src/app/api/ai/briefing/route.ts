import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

// ── POST /api/ai/briefing ────────────────────────────────────
// Gera um briefing de conteúdo com IA.
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

  const { formato, objetivo, canal, tom, marca, tema } = body as {
    formato?: string; objetivo?: string; canal?: string; tom?: string; marca?: string; tema?: string;
  };

  const prompt = `
Você é um redator criativo especialista em social media e marketing de conteúdo.
Gere um briefing de conteúdo completo com base nos dados abaixo.

Marca: ${marca ?? "não informado"}
Formato: ${formato ?? "não informado"}
Canal: ${canal ?? "não informado"}
Objetivo: ${objetivo ?? "não informado"}
Tom de voz: ${tom ?? "não informado"}
Tema/assunto: ${tema ?? "não informado"}

O briefing deve conter:
- Headline principal (título chamativo)
- Texto de apoio (1-2 frases)
- Legenda para redes sociais (até 150 caracteres + hashtags)
- CTA (call to action) sugerido
- Elementos visuais recomendados
- Observações para o designer/videomaker

Responda em português brasileiro.
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao processar com IA." }, { status: 502 });
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const result = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[ai/briefing]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
