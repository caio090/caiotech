import { NextRequest, NextResponse } from "next/server";

// GET /api/meta/callback
// Recebe o callback OAuth do Meta após o usuário autorizar o app.
//
// Etapa atual: apenas valida se "code" chegou e retorna JSON temporário.
// Próxima etapa: trocar o "code" por access_token e salvar em meta_connections.
//
// ATENÇÃO: não salvar token ainda — aguardar tabela meta_connections
// ser criada no Supabase via docs/supabase/35-meta-connections.sql.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  // Usuário negou o acesso
  if (error) {
    return NextResponse.json(
      { ok: false, error, message: "Autorização negada pelo usuário." },
      { status: 400 }
    );
  }

  // Code não veio — parâmetro inesperado
  if (!code) {
    return NextResponse.json(
      { ok: false, message: "Parâmetro code ausente no callback." },
      { status: 400 }
    );
  }

  // TODO: quando a tabela meta_connections existir no Supabase,
  // chamar a API do Meta para trocar o code por um access_token
  // e salvar o registro em meta_connections.
  return NextResponse.json({
    ok: true,
    message: "Callback recebido com sucesso.",
    hasCode: true,
  });
}
