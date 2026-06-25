import { NextResponse } from "next/server";

// GET /api/ai/status
// Retorna se a chave OpenAI está configurada — NUNCA retorna o valor da chave.
export async function GET() {
  const configured = !!(process.env.OPENAI_API_KEY?.trim());
  const env = process.env.NODE_ENV ?? "development";

  return NextResponse.json({
    openaiConfigured: configured,
    environment: env === "production" ? "production" : "development",
  });
}
