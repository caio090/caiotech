import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import type { BlogListItem } from "@/lib/blog/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return { title: "Categoria não encontrada" };
  return {
    title: `${cat.name} — Blog LOKAT OS`,
    description: cat.description ?? `Artigos sobre ${cat.name} no blog da LOKAT OS.`,
    alternates: { canonical: `https://www.lokat.com.br/blog/categoria/${slug}` },
  };
}

async function getPostsByCategory(categorySlug: string): Promise<BlogListItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        id, slug, title, summary, cover_url, cover_alt, status, published_at, tags,
        author:blog_authors(name, avatar_url),
        category:blog_categories!inner(slug, name, color)
      `)
      .eq("status", "published")
      .eq("category.slug", categorySlug)
      .order("published_at", { ascending: false })
      .limit(24);
    return (data ?? []) as unknown as BlogListItem[];
  } catch {
    return [];
  }
}

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = BLOG_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();

  const posts = await getPostsByCategory(slug);

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <PublicHeader />
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-16 pb-10">
        <nav style={{ marginBottom: "1.5rem" }}>
          <Link href="/blog" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#555566", textDecoration: "none" }}>← Blog</Link>
        </nav>
        <div style={{ display: "inline-block", fontFamily: "'Space Mono', monospace", fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: cat.color ?? "#7b6ef6", border: `1px solid ${cat.color ?? "#7b6ef6"}30`, padding: ".2rem .75rem", marginBottom: "1rem" }}>
          {cat.name}
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 800, color: "#e8e8e8", marginBottom: ".5rem" }}>
          {cat.name}
        </h1>
        {cat.description && (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".9rem", color: "#555566", maxWidth: "480px", lineHeight: 1.6 }}>{cat.description}</p>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24">
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", border: "1px solid #222230", background: "#13131a" }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566", fontSize: ".9rem" }}>
              Nenhum artigo publicado nesta categoria ainda.
            </p>
            <Link href="/blog" style={{ display: "inline-block", marginTop: "1.25rem", fontFamily: "'Space Mono', monospace", fontSize: ".62rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#7b6ef6", textDecoration: "none" }}>
              ← Ver todos os artigos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <article style={{ background: "#13131a", border: "1px solid #222230", padding: "1.5rem", height: "100%" }}>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", fontWeight: 700, color: "#e8e8e8", lineHeight: 1.35, marginBottom: ".6rem" }}>
                    {post.title}
                  </h2>
                  {post.summary && (
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#555566", lineHeight: 1.6 }}>
                      {post.summary}
                    </p>
                  )}
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
