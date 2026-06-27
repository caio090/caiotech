import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ClientInviteContent } from "./_client-content";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ClienteConvitePage({ params }: PageProps) {
  const { token } = await params;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <ClientInviteContent
        token={token}
        invite={{
          id: "demo",
          client_id: "demo",
          company_name: "Empresa Demo",
          email: "cliente@demo.com",
          status: "pending",
          expires_at: null,
        }}
      />
    );
  }

  const cookieStore = await cookies();
  const supabase    = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  let invite = null;
  try {
    const { data } = await supabase.rpc("get_client_invite_by_token", { p_token: token });
    if (data && Array.isArray(data) && data.length > 0) {
      invite = data[0] as {
        id: string;
        client_id: string;
        company_name: string | null;
        email: string | null;
        status: string;
        expires_at: string | null;
      };
    }
  } catch {
    // RPC can fail if SQL 42 not yet run — shows invalid state
  }

  return <ClientInviteContent token={token} invite={invite} />;
}
