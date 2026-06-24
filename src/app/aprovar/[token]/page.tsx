import { notFound } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ApprovalClientContent } from "./_client-content";
import { Settings } from "lucide-react";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default async function AprovarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Settings className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-lg font-black text-gray-900 mb-2">Supabase não configurado</h1>
          <p className="text-sm text-gray-500">Esta página requer integração com Supabase para funcionar.</p>
        </div>
      </div>
    );
  }

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON);

  const { data: approval } = await supabase
    .from("approvals")
    .select("id, content_id, client_id, public_token, status, client_comment, approved_at, content_items(id, title, type, channel, objective, caption, script, status, scheduled_date)")
    .eq("public_token", token)
    .maybeSingle();

  if (!approval) return notFound();

  const content = Array.isArray(approval.content_items)
    ? approval.content_items[0]
    : approval.content_items;

  if (!content) return notFound();

  return (
    <ApprovalClientContent
      token={token}
      approval={{
        id:             approval.id,
        public_token:   approval.public_token,
        status:         approval.status,
        client_comment: approval.client_comment,
        content_id:     approval.content_id,
      }}
      content={{
        title:          content.title,
        type:           content.type,
        channel:        content.channel,
        caption:        content.caption,
        script:         content.script,
        scheduled_date: content.scheduled_date,
      }}
    />
  );
}
