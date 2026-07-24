import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { withMutationProtection } from "@/lib/workspaces/assert-not-preview";

// POST /api/team/invite/send-email
// Prepara envio de e-mail de convite.
// Se RESEND_API_KEY ou SMTP não estiver configurado, retorna fallback manual.
export const POST = withMutationProtection(async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const { invite_id, email, name, role, invite_url } = body as {
    invite_id?: string; email?: string; name?: string; role?: string; invite_url?: string;
  };

  if (!invite_id || !email || !invite_url) {
    return NextResponse.json({ error: "invite_id, email e invite_url são obrigatórios." }, { status: 400 });
  }

  // Verificar se admin está autenticado
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Apenas admins podem enviar convites." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Erro de autenticação." }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;

  // Se não houver provedor de e-mail configurado, retornar fallback manual
  if (!resendKey) {
    return NextResponse.json({
      sent: false,
      fallback: true,
      message: "Envio automático não configurado. Copie o link e envie manualmente.",
      invite_url,
    });
  }

  // Enviar via Resend
  try {
    const roleName = role ?? "colaborador";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "LOKAT OS <noreply@lokat.com.br>",
        to: [email],
        subject: `Você foi convidado para a LOKAT OS`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:8px;">Você foi convidado!</h2>
            <p style="color:#555;font-size:14px;">
              Olá${name ? `, ${name}` : ""}! Você recebeu um convite para acessar a <strong>LOKAT OS</strong> como <strong>${roleName}</strong>.
            </p>
            <p style="color:#555;font-size:14px;">Clique no botão abaixo para aceitar o convite e criar sua conta:</p>
            <a href="${invite_url}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;margin:16px 0;">
              Aceitar convite →
            </a>
            <p style="color:#999;font-size:12px;">O link é válido por 7 dias. Se não esperava este e-mail, ignore-o.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[invite/send-email] Resend error:", err);
      return NextResponse.json({ sent: false, fallback: true, message: "Erro ao enviar e-mail. Copie o link manualmente.", invite_url });
    }

    // Atualizar status do convite para "enviado"
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.from("team_invites").update({ status: "sent" }).eq("id", invite_id);
    } catch {}

    return NextResponse.json({ sent: true, message: "E-mail enviado com sucesso." });
  } catch (e) {
    console.error("[invite/send-email]", e);
    return NextResponse.json({ sent: false, fallback: true, message: "Erro inesperado. Copie o link manualmente.", invite_url });
  }
});
