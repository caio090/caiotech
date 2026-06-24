import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ConviteClientContent } from "./_client-content";

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConvitePage({ params }: PageProps) {
  const { token } = await params;

  // Demo mode — show mock invite
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return (
      <ConviteClientContent
        token={token}
        invite={{
          id: "demo",
          email: null,
          name: null,
          role: "social_media",
          department: "Social Media",
          expires_at: null,
        }}
      />
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });

  // Read invite details (anonymous-callable RPC)
  let invite = null;
  try {
    const { data } = await supabase.rpc("get_invite_by_token", { p_token: token });
    if (data && Array.isArray(data) && data.length > 0) {
      invite = data[0] as {
        id: string;
        email: string | null;
        name: string | null;
        role: string;
        department: string | null;
        expires_at: string | null;
      };
    }
  } catch (err) {
    console.error("[convite] get_invite_by_token error:", err);
  }

  return <ConviteClientContent token={token} invite={invite} />;
}
