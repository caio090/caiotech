"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { Search } from "lucide-react";
import type { BlogListItem } from "@/lib/blog/types";

export default function BlogBuscaPage() {
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/blog/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json() as { posts: BlogListItem[] };
        setResults(data.posts ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (query.length >= 3) handleSearch(query); }, 400);
    return () => clearTimeout(t);
  }, [query, handleSearch]);

  return (
    <div style={{ background: "#0a0a0c", minHeight: "100vh", color: "#e8e8e8" }}>
      <PublicHeader />
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-16 pb-24">
        <nav style={{ marginBottom: "1.5rem" }}>
          <Link href="/blog" style={{ fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", color: "#555566", textDecoration: "none" }}>← Blog</Link>
        </nav>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 4vw, 2.2rem)", fontWeight: 800, color: "#e8e8e8", marginBottom: "2rem" }}>
          Buscar artigos
        </h1>

        <div style={{ position: "relative", marginBottom: "2rem" }}>
          <Search style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#44445a", pointerEvents: "none" }} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar artigos..."
            aria-label="Buscar artigos"
            style={{ width: "100%", background: "#13131a", border: "1px solid #222230", color: "#e8e8e8", padding: ".85rem 1rem .85rem 2.75rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".9rem", outline: "none", borderRadius: 0 }}
          />
        </div>

        {loading && <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566", fontSize: ".85rem" }}>Buscando...</p>}

        {!loading && searched && results.length === 0 && (
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566", fontSize: ".85rem" }}>Nenhum resultado para &ldquo;{query}&rdquo;.</p>
        )}

        {!loading && results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {results.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                <article style={{ background: "#13131a", border: "1px solid #222230", padding: "1.25rem" }}>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".95rem", fontWeight: 700, color: "#e8e8e8", marginBottom: ".4rem" }}>{post.title}</h2>
                  {post.summary && <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#555566", lineHeight: 1.6 }}>{post.summary}</p>}
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
