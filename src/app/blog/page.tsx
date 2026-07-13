import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { BLOG_CATEGORIES } from "@/lib/blog/types";
import type { BlogListItem } from "@/lib/blog/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Blog — Conteúdo sobre marketing, gestão e tecnologia",
  description:
    "Artigos, guias e análises sobre marketing, gestão, inteligência artificial, dados e ferramentas para negócios e agências.",
  alternates: { canonical: "https://www.lokat.com.br/blog" },
  openGraph: {
    title: "Blog LOKAT OS",
    description: "Conteúdo sobre marketing, gestão e tecnologia para agências e negócios.",
    url: "https://www.lokat.com.br/blog",
    type: "website",
  },
};

async function getPosts(): Promise<BlogListItem[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        id, slug, title, summary, cover_url, cover_alt, status,
        published_at, tags,
        author:blog_authors(name, avatar_url),
        category:blog_categories(slug, name, color)
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(24);
    return (data ?? []) as unknown as BlogListItem[];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <PublicHeader />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pt-16 pb-10">
        <div className="mb-2" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#7b6ef6" }}>
          Blog LOKAT OS
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.8rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: ".75rem", color: "#e8e8e8" }}>
          Conteúdo sobre marketing,<br className="hidden md:block" /> gestão e tecnologia.
        </h1>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", color: "#555566", maxWidth: "520px", lineHeight: 1.65 }}>
          Artigos, guias e análises para agências, empresas e profissionais que querem tomar melhores decisões com dados e clareza.
        </p>
      </section>

      {/* Category pills */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-8">
        <div className="flex flex-wrap gap-2">
          <Link href="/blog" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#7b6ef6", border: "1px solid #7b6ef630", padding: ".25rem .75rem", textDecoration: "none", background: "#7b6ef610" }}>
            Todos
          </Link>
          {BLOG_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog/categoria/${cat.slug}`}
              style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: cat.color ?? "#888", border: `1px solid ${cat.color ?? "#888"}30`, padding: ".25rem .75rem", textDecoration: "none" }}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Posts grid or empty state */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <BlogFooterCta />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center py-24"
      style={{ border: "1px solid #222230", background: "#13131a", padding: "4rem 2rem" }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: "#555566", marginBottom: "1rem" }}>
        Em preparação
      </div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.4rem", fontWeight: 700, color: "#e8e8e8", marginBottom: ".75rem" }}>
        Conteúdos em preparação
      </h2>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".88rem", color: "#555566", maxWidth: "380px", margin: "0 auto 2rem", lineHeight: 1.65 }}>
        Nossa equipe editorial está preparando artigos sobre marketing, gestão, IA e tecnologia para negócios. Em breve.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/diagnostico"
          style={{ background: "#7b6ef6", color: "#fff", padding: ".75rem 1.5rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}
        >
          Fazer diagnóstico gratuito
        </Link>
        <Link
          href="/pre-acesso"
          style={{ background: "transparent", color: "#e8e8e8", padding: ".75rem 1.5rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", border: "1px solid #222230" }}
        >
          Entrar na lista beta
        </Link>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: BlogListItem }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
      <article
        className="lk-card-hover-dark h-full"
        style={{ background: "#13131a", border: "1px solid #222230", padding: "1.5rem", display: "flex", flexDirection: "column", height: "100%" }}
      >
        {post.category && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: ".52rem", letterSpacing: ".14em", textTransform: "uppercase", color: post.category.color ?? "#7b6ef6", marginBottom: ".75rem" }}>
            {post.category.name}
          </div>
        )}
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", fontWeight: 700, color: "#e8e8e8", lineHeight: 1.35, marginBottom: ".6rem", flex: 1 }}>
          {post.title}
        </h2>
        {post.summary && (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#555566", lineHeight: 1.6, marginBottom: "1rem" }}>
            {post.summary}
          </p>
        )}
        <div style={{ borderTop: "1px solid #222230", paddingTop: ".75rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {post.author && (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".72rem", color: "#888" }}>
              {post.author.name}
            </span>
          )}
          {post.published_at && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: ".58rem", color: "#44445a" }}>
              {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}

function BlogFooterCta() {
  return (
    <section style={{ background: "#13131a", borderTop: "1px solid #222230", padding: "4rem 2rem", textAlign: "center" }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: ".58rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#7b6ef6", marginBottom: "1rem" }}>
        LOKAT OS
      </p>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 700, color: "#e8e8e8", marginBottom: ".75rem" }}>
        Organize marketing, operação e resultados.
      </h2>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".85rem", color: "#555566", marginBottom: "1.5rem" }}>
        Diagnóstico gratuito · 14 dias de teste · sem cartão.
      </p>
      <Link
        href="/diagnostico"
        style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".85rem 2rem", fontFamily: "'Space Mono', monospace", fontSize: ".68rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}
      >
        Fazer diagnóstico →
      </Link>
    </section>
  );
}
