import type { MetadataRoute } from "next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.lokat.com.br";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL,                             lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
  { url: `${BASE_URL}/plataforma`,             lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${BASE_URL}/planos`,                 lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
  { url: `${BASE_URL}/diagnostico`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/diagnostico-marketing`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/rec`,                    lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/blog`,                   lastModified: new Date(), changeFrequency: "daily",   priority: 0.8 },
  { url: `${BASE_URL}/contato`,                lastModified: new Date(), changeFrequency: "yearly",  priority: 0.6 },
  { url: `${BASE_URL}/pre-acesso`,             lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/termos`,                 lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  { url: `${BASE_URL}/privacidade`,            lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts: MetadataRoute.Sitemap = [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (data) {
      for (const post of data) {
        posts.push({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // blog_posts table may not exist yet — graceful degradation
  }

  return [...STATIC_ROUTES, ...posts];
}
