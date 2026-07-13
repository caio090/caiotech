"use client";
import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { PlusCircle, Edit2, Eye, Archive, Search, Filter } from "lucide-react";
import type { BlogPost, BlogPostStatus } from "@/lib/blog/types";

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft:     "Rascunho",
  research:  "Pesquisa",
  review:    "Revisão",
  approved:  "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
  archived:  "Arquivado",
};

const STATUS_COLORS: Record<BlogPostStatus, string> = {
  draft:     "#888",
  research:  "#3b82f6",
  review:    "#f59e0b",
  approved:  "#10b981",
  scheduled: "#a855f7",
  published: "#7b6ef6",
  archived:  "#555566",
};

type AdminBlogTab = "posts" | "new" | "categories";

export default function AdminBlogPage() {
  const [tab, setTab]       = useState<AdminBlogTab>("posts");
  const [posts, setPosts]   = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BlogPostStatus | "all">("all");
  const [search, setSearch] = useState("");
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("blog_posts")
      .select("*, author:blog_authors(name), category:blog_categories(name, color)")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (search.trim())          query = query.ilike("title", `%${search.trim()}%`);

    const { data } = await query;
    setPosts((data ?? []) as BlogPost[]);
    setLoading(false);
  }, [supabase, statusFilter, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleStatusChange = async (postId: string, newStatus: BlogPostStatus) => {
    if (newStatus === "published") {
      const post = posts.find((p) => p.id === postId);
      if (post?.status !== "approved") {
        alert("Apenas artigos com status 'Aprovado' podem ser publicados.");
        return;
      }
    }
    await supabase
      .from("blog_posts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", postId);
    fetchPosts();
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0c", color: "#e8e8e8" }}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#e8e8e8", marginBottom: ".25rem" }}>
              Blog
            </h1>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", color: "#555566" }}>
              Gerenciar artigos · Fluxo: rascunho → pesquisa → revisão → aprovado → publicado
            </p>
          </div>
          <button
            onClick={() => setTab("new")}
            className="flex items-center gap-2"
            style={{ background: "#7b6ef6", color: "#fff", padding: ".6rem 1.25rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700 }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Novo artigo
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ borderBottom: "1px solid #222230" }}>
          {(["posts", "categories"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ padding: ".6rem 1.25rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", background: "transparent", border: "none", cursor: "pointer", color: tab === t ? "#7b6ef6" : "#555566", borderBottom: tab === t ? "2px solid #7b6ef6" : "2px solid transparent", fontWeight: tab === t ? 700 : 400 }}
            >
              {t === "posts" ? "Artigos" : "Categorias"}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: ".75rem", top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#44445a" }} aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  style={{ background: "#13131a", border: "1px solid #222230", color: "#e8e8e8", padding: ".5rem .75rem .5rem 2.25rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", outline: "none", width: 200 }}
                  aria-label="Buscar artigos"
                />
              </div>
              <div style={{ position: "relative" }}>
                <Filter style={{ position: "absolute", left: ".75rem", top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#44445a" }} aria-hidden="true" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as BlogPostStatus | "all")}
                  style={{ background: "#13131a", border: "1px solid #222230", color: "#e8e8e8", padding: ".5rem .75rem .5rem 2.25rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", outline: "none", appearance: "none", paddingRight: "1.5rem", cursor: "pointer" }}
                  aria-label="Filtrar por status"
                >
                  <option value="all">Todos os status</option>
                  {(Object.keys(STATUS_LABELS) as BlogPostStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Posts table */}
            {loading ? (
              <p style={{ color: "#44445a", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".85rem" }}>Carregando...</p>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", border: "1px solid #222230", background: "#13131a" }}>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566", marginBottom: "1rem" }}>Nenhum artigo encontrado.</p>
                <button onClick={() => setTab("new")} style={{ background: "#7b6ef6", color: "#fff", padding: ".6rem 1.25rem", fontFamily: "'Space Mono', monospace", fontSize: ".62rem", letterSpacing: ".1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>
                  Criar primeiro artigo
                </button>
              </div>
            ) : (
              <div style={{ border: "1px solid #222230", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #222230" }}>
                      {["Título", "Categoria", "Autor", "Status", "Atualizado", "Ações"].map((h) => (
                        <th key={h} style={{ padding: ".75rem 1rem", textAlign: "left", fontFamily: "'Space Mono', monospace", fontSize: ".55rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#44445a" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} style={{ borderBottom: "1px solid #1a1a26" }}>
                        <td style={{ padding: ".75rem 1rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".82rem", color: "#e8e8e8", maxWidth: 280 }}>
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</span>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: ".55rem", color: "#44445a" }}>/blog/{post.slug}</span>
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#888" }}>
                          {post.category?.name ?? "—"}
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".78rem", color: "#888" }}>
                          {post.author?.name ?? "—"}
                        </td>
                        <td style={{ padding: ".75rem 1rem" }}>
                          <select
                            value={post.status}
                            onChange={(e) => handleStatusChange(post.id, e.target.value as BlogPostStatus)}
                            style={{ background: `${STATUS_COLORS[post.status]}15`, border: `1px solid ${STATUS_COLORS[post.status]}40`, color: STATUS_COLORS[post.status], padding: ".2rem .5rem", fontFamily: "'Space Mono', monospace", fontSize: ".55rem", letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer", outline: "none" }}
                            aria-label={`Status do artigo ${post.title}`}
                          >
                            {(Object.keys(STATUS_LABELS) as BlogPostStatus[]).map((s) => (
                              <option key={s} value={s} style={{ background: "#13131a", color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: ".75rem 1rem", fontFamily: "'Space Mono', monospace", fontSize: ".58rem", color: "#44445a" }}>
                          {new Date(post.updated_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td style={{ padding: ".75rem 1rem" }}>
                          <div className="flex items-center gap-2">
                            {post.status === "published" && (
                              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver publicado">
                                <Eye className="w-3.5 h-3.5" style={{ color: "#555566" }} />
                              </a>
                            )}
                            <button aria-label="Editar" onClick={() => alert("Editor em breve.")}>
                              <Edit2 className="w-3.5 h-3.5" style={{ color: "#555566" }} />
                            </button>
                            {post.status !== "archived" && (
                              <button aria-label="Arquivar" onClick={() => handleStatusChange(post.id, "archived")}>
                                <Archive className="w-3.5 h-3.5" style={{ color: "#555566" }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "new" && <NewPostForm onCancel={() => setTab("posts")} onSaved={() => { setTab("posts"); fetchPosts(); }} />}

        {tab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}

function NewPostForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    primary_keyword: "",
    intent: "informational",
    content_type: "article",
  });

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("blog_posts").insert({
        title: form.title.trim(),
        slug: form.slug.trim(),
        summary: form.summary.trim() || null,
        status: "draft",
        tags: [],
        cta_type: "diagnostic",
        cover_generation_status: "none",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) { alert(`Erro: ${error.message}`); setSaving(false); return; }
      onSaved();
    } catch (err) {
      alert(String(err));
      setSaving(false);
    }
  };

  const makeSlug = (title: string) =>
    title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "#e8e8e8", marginBottom: "1.5rem" }}>
        Novo artigo — Rascunho inicial
      </h2>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".8rem", color: "#555566", marginBottom: "2rem", background: "#13131a", border: "1px solid #222230", padding: ".75rem 1rem" }}>
        ⚠ Artigos criados como <strong style={{ color: "#f59e0b" }}>rascunho</strong>. Nenhum artigo é publicado sem passar pela aprovação formal.
      </p>
      {[
        { label: "Título*", field: "title",           placeholder: "Título do artigo" },
        { label: "Slug*",   field: "slug",            placeholder: "url-do-artigo" },
        { label: "Resumo",  field: "summary",         placeholder: "Breve descrição (max 200 chars)" },
        { label: "Palavra-chave principal", field: "primary_keyword", placeholder: "ex: marketing digital" },
      ].map(({ label, field, placeholder }) => (
        <div key={field} style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontFamily: "'Space Mono', monospace", fontSize: ".6rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#555566", marginBottom: ".4rem" }}>{label}</label>
          <input
            type="text"
            value={form[field as keyof typeof form]}
            onChange={(e) => {
              const v = e.target.value;
              setForm((f) => ({
                ...f,
                [field]: v,
                ...(field === "title" && !f.slug ? { slug: makeSlug(v) } : {}),
              }));
            }}
            placeholder={placeholder}
            style={{ width: "100%", background: "#13131a", border: "1px solid #222230", color: "#e8e8e8", padding: ".65rem .85rem", fontFamily: "'Space Grotesk', sans-serif", fontSize: ".85rem", outline: "none" }}
          />
        </div>
      ))}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.slug.trim()} style={{ background: "#7b6ef6", color: "#fff", padding: ".65rem 1.5rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", border: "none", cursor: "pointer", fontWeight: 700, opacity: saving ? .6 : 1 }}>
          {saving ? "Salvando..." : "Criar rascunho"}
        </button>
        <button onClick={onCancel} style={{ background: "transparent", color: "#555566", padding: ".65rem 1.25rem", fontFamily: "'Space Mono', monospace", fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", border: "1px solid #222230", cursor: "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CategoriesTab() {
  return (
    <div>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#555566", fontSize: ".88rem", marginBottom: "1.5rem" }}>
        As categorias abaixo são definidas em <code style={{ color: "#7b6ef6" }}>src/lib/blog/types.ts</code> e espelham a SQL 78 (pendente). Após a SQL ser executada, esta aba permitirá gerenciamento direto.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { name: "Marketing", color: "#7b6ef6" }, { name: "Tecnologia", color: "#3b82f6" },
          { name: "IA", color: "#a855f7" }, { name: "Gestão", color: "#10b981" },
          { name: "Vendas", color: "#f59e0b" }, { name: "CRM", color: "#ef4444" },
          { name: "Automação", color: "#06b6d4" }, { name: "Conteúdo", color: "#ec4899" },
          { name: "Audiovisual", color: "#c0392b" }, { name: "Redes Sociais", color: "#7b6ef6" },
          { name: "Negócios Locais", color: "#0ea5e9" }, { name: "E-commerce", color: "#84cc16" },
          { name: "Cardápio Digital", color: "#f97316" }, { name: "WhatsApp", color: "#25d366" },
          { name: "Dados e Insights", color: "#6366f1" },
        ].map((cat) => (
          <div key={cat.name} style={{ background: "#13131a", border: `1px solid ${cat.color}25`, padding: ".75rem 1rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: ".82rem", color: "#e8e8e8" }}>{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

