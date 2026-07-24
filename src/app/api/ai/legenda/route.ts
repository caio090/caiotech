import { NextRequest, NextResponse } from "next/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

// ── POST /api/ai/legenda ─────────────────────────────────────
// Gera legendas/copies para redes sociais com IA.
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

  const { tema, canal, tom, objetivo, marca, formato } = body as {
    tema?: string; canal?: string; tom?: string; objetivo?: string; marca?: string; formato?: string;
  };

  const prompt = `
Você é um redator especialista em copy para redes sociais.
Gere 3 opções de legenda para o seguinte conteúdo:

Marca: ${marca ?? "não informado"}
Tema: ${tema ?? "não informado"}
Canal: ${canal ?? "Instagram"}
Formato: ${formato ?? "post"}
Objetivo: ${objetivo ?? "engajamento"}
Tom de voz: ${tom ?? "profissional"}

Para cada opção:
- Versão curta (até 80 caracteres + emojis se combinar)
- Versão completa (até 200 caracteres + hashtags)
- Sugestão de CTA

Separe as 3 opções claramente com "--- OPÇÃO 1 ---", "--- OPÇÃO 2 ---", "--- OPÇÃO 3 ---".
Responda em português brasileiro.
`.trim();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao processar com IA." }, { status: 502 });
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const result = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ result });
  } catch (e) {
    console.error("[ai/legenda]", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
});
