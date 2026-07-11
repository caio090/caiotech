"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MetaInsightsPanel } from "@/app/admin/contentos/insights/_meta-insights-panel";
import {
  ArrowLeft, AtSign, Calendar, CheckSquare,
  BarChart3, Clock, Zap, Building2, ChevronDown,
  TrendingUp, Users, Eye, Heart, MessageSquare,
  ExternalLink, Info,
} from "lucide-react";

interface ClientOption { id: string; company_name: string }

type TabKey = "overview" | "content" | "audience" | "engagement" | "insights" | "diagnostics";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",    label: "Visão geral"  },
  { key: "content",     label: "Conteúdos"    },
  { key: "audience",    label: "Público"       },
  { key: "engagement",  label: "Engajamento"   },
  { key: "insights",    label: "Insights"      },
  { key: "diagnostics", label: "Diagnóstico"   },
];

const CONTENT_FIELDS = [
  { label: "Conteúdos planejados",  icon: Calendar,    ready: false },
  { label: "Conteúdos publicados",  icon: AtSign,      ready: false },
  { label: "Conteúdos pendentes",   icon: Clock,       ready: false },
  { label: "Aprovações no período", icon: CheckSquare, ready: false },
  { label: "Top posts (alcance)",   icon: BarChart3,   ready: false },
  { label: "Taxa de entrega",       icon: Zap,         ready: false },
];

const AUDIENCE_FIELDS = [
  { label: "Seguidores totais",    icon: Users,          ready: false },
  { label: "Crescimento mensal",   icon: TrendingUp,     ready: false },
  { label: "Alcance orgânico",     icon: Eye,            ready: false },
];

const ENGAGEMENT_FIELDS = [
  { label: "Curtidas",             icon: Heart,          ready: false },
  { label: "Comentários",          icon: MessageSquare,  ready: false },
  { label: "Taxa de engajamento",  icon: Zap,            ready: false },
];

export default function RelatorioConteudoPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const [clients, setClients] = useState<ClientOption[]>([]);

  const clientId = searchParams.get("client") ?? "";
  const range    = searchParams.get("range")  ?? "7d";
  const activeTab = (searchParams.get("tab") as TabKey | null) ?? "overview";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") { p.delete(key); } else { p.set(key, value); }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, router, pathname],
  );

  const setActiveTab = (tab: TabKey) => updateParam("tab", tab === "overview" ? null : tab);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/clients");
        if (!r.ok) return;
        const d = await r.json() as { clients?: ClientOption[] };
        setClients(d.clients ?? []);
      } catch { /* silent */ }
    })();
  }, []);

  const recOsHref = `/admin/contentos/insights${clientId ? `?client=${clientId}&range=${range}` : ""}`;
  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div style={{ maxWidth: 1200, width: "100%" }}>
      <style>{`
        .content-report-tabs {
          display: flex; overflow-x: auto; overflow-y: hidden;
          scrollbar-width: none; -ms-overflow-style: none;
          border-bottom: 1px solid var(--lk-border); margin-bottom: 24px; gap: 2px;
        }
        .content-report-tabs::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>

      <PageHeader title="Relatório de Conteúdo" description="Performance editorial e Meta Insights por cliente">
        <Link
          href="/admin/relatorios"
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--lk-muted)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "7px 12px", textDecoration: "none" }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Dados & Insights
        </Link>
      </PageHeader>

      {/* Client selector + CTA */}
      <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <Building2 style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--lk-muted)", pointerEvents: "none" }} />
          <select
            value={clientId}
            onChange={(e) => updateParam("client", e.target.value || null)}
            style={{
              paddingLeft: 28, paddingRight: 28, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, background: "var(--lk-card)", color: "var(--lk-text)",
              border: "1px solid var(--lk-border)", borderRadius: 10, outline: "none", appearance: "none",
            }}
          >
            <option value="">Selecione um cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--lk-muted)", pointerEvents: "none" }} />
        </div>

        {clientId && (
          <Link
            href={recOsHref}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 11, color: "var(--lk-muted)",
              border: "1px solid var(--lk-border)", borderRadius: 8, padding: "5px 10px",
              textDecoration: "none",
            }}
          >
            <ExternalLink style={{ width: 11, height: 11 }} />
            Abrir no REC OS
          </Link>
        )}
      </div>

      {/* No client selected */}
      {!clientId && (
        <div style={{ padding: "56px 24px", textAlign: "center", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 18 }}>
          <Building2 style={{ width: 36, height: 36, color: "var(--lk-border)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lk-text)", marginBottom: 6 }}>Nenhum cliente selecionado</p>
          <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>Selecione um cliente acima para ver o relatório de conteúdo.</p>
        </div>
      )}

      {/* Tabs */}
      {clientId && (
        <>
          <div className="content-report-tabs">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? "var(--lk-accent)" : "var(--lk-muted)",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "10px 14px",
                  borderBottom: activeTab === tab.key ? "2px solid var(--lk-accent)" : "2px solid transparent",
                  marginBottom: -1, transition: "color 0.15s", flexShrink: 0, whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══ TAB: Visão geral ═══════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <BarChart3 size={14} style={{ color: "var(--lk-accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Meta Insights</span>
                </div>
                <p style={{ fontSize: 11, color: "var(--lk-muted)", marginBottom: 16 }}>
                  Dados de alcance, impressões e engajamento via Facebook/Instagram Business.
                </p>
                <MetaInsightsPanel clientId={clientId} mode="report" />
              </div>

              <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Campos editoriais</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", padding: "2px 8px", borderRadius: 6 }}>
                    Aguardando fonte
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  {CONTENT_FIELDS.map(({ label, icon: Icon }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--lk-border)", borderRadius: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={14} style={{ color: "var(--lk-muted)" }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 500, color: "var(--lk-muted)" }}>{label}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>Aguardando fonte</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Link href="/admin/contentos/aprovacoes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--lk-muted)", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "8px 14px", textDecoration: "none" }}>
                  <CheckSquare size={13} /> Aprovações
                </Link>
                <Link href="/admin/contentos/calendario" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--lk-muted)", background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "8px 14px", textDecoration: "none" }}>
                  <Calendar size={13} /> Calendário editorial
                </Link>
              </div>
            </div>
          )}

          {/* ══ TAB: Conteúdos ═════════════════════════════════════════════════ */}
          {activeTab === "content" && (
            <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <AtSign size={14} style={{ color: "var(--lk-muted)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Conteúdos do período</span>
              </div>
              <PendingFeature label="Planejados, publicados e pendentes por período" />
            </div>
          )}

          {/* ══ TAB: Público ═══════════════════════════════════════════════════ */}
          {activeTab === "audience" && (
            <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Users size={14} style={{ color: "var(--lk-muted)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Crescimento de audiência</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                {AUDIENCE_FIELDS.map(({ label, icon: Icon }) => (
                  <PlaceholderKpi key={label} label={label} icon={Icon} />
                ))}
              </div>
              <PendingFeature label="Demograficos, localização e horários de maior atividade" />
            </div>
          )}

          {/* ══ TAB: Engajamento ════════════════════════════════════════════════ */}
          {activeTab === "engagement" && (
            <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Heart size={14} style={{ color: "var(--lk-muted)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Taxa de engajamento</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 20 }}>
                {ENGAGEMENT_FIELDS.map(({ label, icon: Icon }) => (
                  <PlaceholderKpi key={label} label={label} icon={Icon} />
                ))}
              </div>
              <PendingFeature label="Top posts, análise de formato e melhores horários de publicação" />
            </div>
          )}

          {/* ══ TAB: Insights ══════════════════════════════════════════════════ */}
          {activeTab === "insights" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Zap size={14} style={{ color: "var(--lk-accent)" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Inteligência de marketing</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--lk-muted)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--lk-border)", padding: "1px 7px", borderRadius: 6 }}>Em desenvolvimento</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: TrendingUp, text: "Destaques do período: baseados em alcance, engajamento e publicações.", ok: false },
                    { icon: Info, text: "Alertas: quedas de engajamento, publicações abaixo da média.", ok: false },
                    { icon: Zap, text: "Oportunidades: horários de pico, formatos com melhor performance.", ok: false },
                    { icon: CheckSquare, text: "Recomendações: próximos passos baseados nos dados.", ok: false },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--lk-border)", borderRadius: 10 }}>
                      <Icon size={13} style={{ color: "var(--lk-muted)", flexShrink: 0, marginTop: 2 }} />
                      <p style={{ fontSize: 12, color: "var(--lk-muted)" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <MetaInsightsPanel clientId={clientId} mode="report" />
            </div>
          )}

          {/* ══ TAB: Diagnóstico ═══════════════════════════════════════════════ */}
          {activeTab === "diagnostics" && (
            <div style={{ background: "var(--lk-card)", border: "1px solid var(--lk-border)", borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Info size={14} style={{ color: "var(--lk-muted)" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--lk-text)" }}>Diagnóstico da integração</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontFamily: "'Space Mono', monospace", color: "var(--lk-muted)", lineHeight: 1.8 }}>
                <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Cliente:</span> {selectedClient?.company_name ?? clientId.slice(0, 8) + "…"}</p>
                <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Período:</span> {range}</p>
                <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Fonte Meta Insights:</span> Facebook/Instagram Business via API Graph</p>
                <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Conteúdo editorial:</span> Aguardando fonte de dados (Typebot / REC OS)</p>
                <p><span style={{ color: "var(--lk-text)", fontWeight: 600 }}>Inteligência:</span> Determinística — regras locais, sem chamadas externas de IA</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PendingFeature({ label }: { label: string }) {
  return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <Clock size={24} style={{ color: "var(--lk-border)", margin: "0 auto 10px" }} />
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--lk-muted)", marginBottom: 4 }}>Em desenvolvimento</p>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{label}</p>
    </div>
  );
}

function PlaceholderKpi({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--lk-border)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon size={13} style={{ color: "var(--lk-muted)" }} />
        <span style={{ fontSize: 11, color: "var(--lk-muted)" }}>{label}</span>
      </div>
      <div style={{ height: 20, width: "60%", borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}
