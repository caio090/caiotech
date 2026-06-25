import { NextResponse } from "next/server";

// GET /api/payments/gateway/status
// Retorna se o gateway está configurado. Nunca expõe a chave.
export async function GET() {
  const apiKey = process.env.ASAAS_API_KEY;
  const environment = process.env.ASAAS_ENVIRONMENT ?? "sandbox";

  return NextResponse.json({
    provider: "asaas",
    configured: !!apiKey,
    environment: apiKey ? environment : null,
  });
}
