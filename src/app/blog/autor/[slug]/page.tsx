import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BlogAuthor, BlogListItem } from "@/lib/blog/types";

interface Props { params: Promise<{ slug: string }> }

async function getAuthor(slug: string): Promise<BlogAuthor | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from("blog_authors").select("*").eq("slug", slug).maybeSingle();
    return data as BlogAuthor | null;
  } catch { return null; }
}

async function getPostsByAuthor(authorId: string): Promise<BlogListItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, summary, cover_url, cover_alt, status, published_at, tags, category:blog_categories(slug, name, color)")
      .eq("author_id", authorId)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data ?? []) as unknown as BlogListItem[];
  } catch { return []; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return { title: "Autor não encontrado" };
  return {
    title: `${author.name} — Blog LOKAT OS`,
    description: author.bio ?? `Artigos de ${author.name} no blog da LOKAT OS.`,
  };
}

export default async function BlogAuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();
  const posts = await getPostsByAuthor(author.id);

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <PublicHeader />
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-16 pb-10">
        <nav style={{ marginBottom: "1.5rem" }}>
          <Link href="/blog" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#555566", textDecoration: "none" }}>← Blog</Link>
        </nav>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 4vw, 2.2rem)", fontWeight: 800, color: "#e8e8e8", marginBottom: ".5rem" }}>
          {author.name}
        </h1>
        {author.role && <p style={{ fontFamily: "'Space Mono', monospace", fontSize: ".62rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#7b6ef6", marginBottom: ".75rem" }}>{author.role}</p>}
        {author.bio && <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".9rem", color: "#555566", lineHeight: 1.65, maxWidth: "480px" }}>{author.bio}</p>}
      </section>
      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24">
        {posts.length === 0 ? (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566" }}>Nenhum artigo publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <article style={{ background: "#13131a", border: "1px solid #222230", padding: "1.5rem" }}>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".9rem", fontWeight: 700, color: "#e8e8e8", lineHeight: 1.3 }}>{post.title}</h2>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
