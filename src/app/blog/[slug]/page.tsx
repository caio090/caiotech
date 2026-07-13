import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:blog_authors(*),
        category:blog_categories(*),
        sources:blog_sources(*)
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data as BlogPost | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Artigo não encontrado" };

  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.summary ?? "";
  const url = `https://www.lokat.com.br/blog/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: post.author ? [post.author.name] : undefined,
      images: post.cover_url ? [{ url: post.cover_url, alt: post.cover_alt ?? title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.summary ?? "",
    "url": `https://www.lokat.com.br/blog/${slug}`,
    "datePublished": post.published_at ?? post.created_at,
    "dateModified": post.updated_at,
    "author": post.author ? {
      "@type": "Person",
      "name": post.author.name,
    } : undefined,
    "publisher": {
      "@type": "Organization",
      "name": "LOKAT OS",
      "url": "https://www.lokat.com.br",
    },
    "image": post.cover_url ?? undefined,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Blog", "item": "https://www.lokat.com.br/blog" },
        { "@type": "ListItem", "position": 2, "name": post.title, "item": `https://www.lokat.com.br/blog/${slug}` },
      ],
    },
  };

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicHeader />

      <article className="max-w-3xl mx-auto px-4 md:px-8 py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: "2rem" }}>
          <ol style={{ display: "flex", gap: ".5rem", listStyle: "none", padding: 0, margin: 0 }}>
            <li><Link href="/blog" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#555566", textDecoration: "none" }}>Blog</Link></li>
            <li style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", color: "#333340" }}>/</li>
            {post.category && (
              <>
                <li><Link href={`/blog/categoria/${post.category.slug}`} style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#555566", textDecoration: "none" }}>{post.category.name}</Link></li>
                <li style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", color: "#333340" }}>/</li>
              </>
            )}
            <li aria-current="page" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{post.title}</li>
          </ol>
        </nav>

        {/* Category */}
        {post.category && (
          <Link href={`/blog/categoria/${post.category.slug}`} style={{ display: "inline-block", fontFamily: "'Space Mono', monospace", fontSize: ".58rem", letterSpacing: ".14em", textTransform: "uppercase", color: post.category.color ?? "#7b6ef6", border: `1px solid ${post.category.color ?? "#7b6ef6"}30`, padding: ".2rem .6rem", textDecoration: "none", marginBottom: "1.25rem" }}>
            {post.category.name}
          </Link>
        )}

        {/* Title */}
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 5vw, 2.8rem)", fontWeight: 800, lineHeight: 1.1, color: "#e8e8e8", marginBottom: "1rem", textWrap: "balance" } as React.CSSProperties}>
          {post.title}
        </h1>

        {/* Meta */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid #222230" }}>
          {post.author && (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", color: "#888" }}>
              Por {post.author.name}
            </span>
          )}
          {post.published_at && (
            <time dateTime={post.published_at} style={{ fontFamily: "'Space Mono', monospace", fontSize: ".65rem", color: "#44445a" }}>
              {new Date(post.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </time>
          )}
        </div>

        {/* Summary */}
        {post.summary && (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", color: "#888899", lineHeight: 1.7, marginBottom: "2rem", borderLeft: "3px solid #7b6ef6", paddingLeft: "1.25rem" }}>
            {post.summary}
          </p>
        )}

        {/* Cover */}
        {post.cover_url && (
          <div style={{ marginBottom: "2rem", borderRadius: 8, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_url} alt={post.cover_alt ?? post.title} style={{ width: "100%", height: "auto", maxHeight: 420, objectFit: "cover" }} loading="lazy" />
          </div>
        )}

        {/* Content */}
        {post.content ? (
          <div
            className="blog-content"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".97rem", lineHeight: 1.8, color: "#bbbbc8" }}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#44445a", fontStyle: "italic" }}>Conteúdo em preparação.</p>
        )}

        {/* Sources */}
        {post.sources && post.sources.length > 0 && (
          <section style={{ marginTop: "3rem", borderTop: "1px solid #222230", paddingTop: "1.5rem" }}>
            <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".18em", textTransform: "uppercase", color: "#44445a", marginBottom: "1rem" }}>Fontes</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: ".5rem" }}>
              {post.sources.map((s, i) => (
                <li key={s.id} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", color: "#555566" }}>
                  {i + 1}. {s.title}
                  {s.url && <> — <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7b6ef6", textDecoration: "none" }}>{s.url}</a></>}
                  {s.author && <> · {s.author}</>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        {post.cta_type !== "none" && (
          <div style={{ marginTop: "3rem", background: "#13131a", border: "1px solid #222230", padding: "2rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".88rem", color: "#888899", marginBottom: "1rem" }}>
              {post.cta_label ?? "Organize marketing, operação e resultados com a LOKAT OS."}
            </p>
            <Link
              href={post.cta_href ?? "/diagnostico"}
              style={{ display: "inline-block", background: "#7b6ef6", color: "#fff", padding: ".75rem 1.75rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", textDecoration: "none", fontWeight: 700 }}
            >
              {post.cta_type === "diagnostic" ? "Fazer diagnóstico gratuito" : post.cta_label ?? "Saiba mais"}
            </Link>
          </div>
        )}
      </article>
    </div>
  );
}
