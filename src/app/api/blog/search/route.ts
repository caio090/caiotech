import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, summary, published_at, tags, category:blog_categories(slug, name, color)")
      .eq("status", "published")
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
      .order("published_at", { ascending: false })
      .limit(12);
    return NextResponse.json({ posts: data ?? [] });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
