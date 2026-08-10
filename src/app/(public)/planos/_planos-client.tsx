"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Tag, ChevronRight, Zap, MessageCircle } from "lucide-react";
import { PLANS, MIN_PUBLIC_PRICE, formatPrice } from "@/lib/billing/plans";
import { LAUNCH_MODE } from "@/lib/launch/config";

const ENTITLEMENT_LABELS: Record<string, string> = {
  dashboard_basic:      "Painel inicial",
  data_sources_manual:  "Relatórios por arquivo ou planilha",
  digital_menu:         "Conexão com cardápio digital",
  meta_connection:      "Meta/Instagram conectado",
  meta_insights:        "Insights de Meta em tempo real",
  whatsapp_placeholder: "WhatsApp (em preparação)",
  whatsapp_connection:  "Integração WhatsApp",
  approvals:            "Aprovações por link",
  ai_search:            "Busca com IA no painel",
  contentos:            "REC OS — conteúdo e campanhas",
  commercial_crm:       "CRM e operação comercial",
  multi_client:         "Múltiplos clientes",
  team_members:         "Equipe e colaboradores",
  advanced_reports:     "Relatórios avançados",
};

const PLAN_COLORS: Record<string, string> = {
  comunidade: "#f59e0b",
  start:      "#7b6ef6",
  pro:        "#a855f7",
  agencia:    "#10b981",
};

const PLAN_DESC: Record<string, string> = {
  comunidade: "Para quem quer organizar o básico antes de escalar.",
  start:      "Para negócios que querem organizar marketing e resultados.",
  pro:        "Para quem quer crescer com dados reais e equipe.",
  agencia:    "Para agências que querem operar múltiplos clientes.",
};

interface CouponPreview {
  discountLabel: string;
  trialDays: number;
  finalPrice: string;
}

export default function PlanosClient() {
  const [couponCode, setCouponCode]       = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponMsg, setCouponMsg]         = useState("");
  const [couponOk, setCouponOk]           = useState<boolean | null>(null);
  const [expanded, setExpanded]           = useState<string | null>(null);

  async function handleValidateCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg("");
    setCouponPreview(null);
    try {
      const res = await fetch("/api/billing/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json() as { ok: boolean; message?: string; preview?: CouponPreview };
      setCouponOk(data.ok);
      setCouponMsg(data.message ?? "");
      if (data.ok && data.preview) setCouponPreview(data.preview);
    } catch {
      setCouponOk(false);
      setCouponMsg("Erro ao validar cupom. Tente novamente.");
    } finally {
      setCouponLoading(false);
    }
  }

  const visiblePlans = PLANS.filter((p) => p.status !== "coming_soon");

  return (
    <div className="bg-gray-50 min-h-screen">

      {/* ── Hero ── */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-14 pb-10 text-center">
        {LAUNCH_MODE.publicSignupMode === "waitlist" && (
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 mb-6 text-xs font-semibold" style={{ fontFamily: "'Space Mono', monospace" }}>
            <Zap className="w-3.5 h-3.5" />
            Acesso beta — por convite
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Escolha como começar
        </h1>
        <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto leading-relaxed mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {`A partir de R$ ${MIN_PUBLIC_PRICE}/mês · 14 dias grátis · Sem cartão de crédito`}
        </p>
        {LAUNCH_MODE.publicSignupMode === "waitlist" && (
          <p className="text-gray-400 text-xs mt-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Durante o beta, os acessos são liberados por convite ou lista de espera.
          </p>
        )}
      </section>

      {/* ── Plans grid ── */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visiblePlans.map((plan) => {
            const color   = PLAN_COLORS[plan.slug] ?? "#7b6ef6";
            const isOpen  = expanded === plan.slug;
            const planDesc = PLAN_DESC[plan.slug] ?? plan.tagline;

            return (
              <div
                key={plan.slug}
                className={`bg-white rounded-2xl border transition-shadow hover:shadow-md ${plan.highlight ? "shadow-md ring-1" : "shadow-sm border-gray-100"}`}
                style={plan.highlight ? { borderColor: `${color}30`, outline: `1px solid ${color}25` } : {}}
              >
                {plan.badge && (
                  <div
                    className="text-center py-1.5 rounded-t-2xl text-[10px] font-bold uppercase tracking-widest text-white"
                    style={{ background: color, fontFamily: "'Space Mono', monospace" }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div className="p-6">
                  {/* Plan name + desc */}
                  <div className="mb-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color, fontFamily: "'Space Mono', monospace" }}>
                      {plan.slug}
                    </div>
                    <h2 className="text-lg font-black text-gray-900 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {plan.name}
                    </h2>
                    <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {planDesc}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-5 pb-4 border-b border-gray-100">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span className="text-xs text-gray-400 mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>/mês</span>
                    </div>
                    {plan.trial_days > 0 && (
                      <p className="text-[11px] font-semibold mt-1" style={{ color, fontFamily: "'Space Mono', monospace" }}>
                        {plan.trial_days} dias grátis para testar
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="mb-5 space-y-2">
                    {plan.entitlements.slice(0, isOpen ? undefined : 5).map((e) => (
                      <div key={e} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} strokeWidth={2} />
                        <span className="text-xs text-gray-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {ENTITLEMENT_LABELS[e] ?? e.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                    {plan.entitlements.length > 5 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : plan.slug)}
                        className="flex items-center gap-1 mt-1 text-gray-400 hover:text-gray-600 transition-colors"
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: ".55rem", letterSpacing: ".08em", textTransform: "uppercase" }}
                      >
                        <ChevronDown className="w-3 h-3" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                        {isOpen ? "Mostrar menos" : `+${plan.entitlements.length - 5} módulos`}
                      </button>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href={LAUNCH_MODE.publicSignupMode === "waitlist"
                      ? "/pre-acesso"
                      : `/criar-conta?plan=${plan.slug}${couponCode ? `&coupon=${couponCode}` : ""}`}
                    className="block w-full text-center text-xs font-bold rounded-xl py-3 transition-all active:scale-[.98]"
                    style={{
                      background: plan.highlight ? color : "transparent",
                      color: plan.highlight ? "#fff" : color,
                      border: `1.5px solid ${color}`,
                      fontFamily: "'Space Grotesk', sans-serif",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!plan.highlight) e.currentTarget.style.background = `${color}12`;
                    }}
                    onMouseLeave={(e) => {
                      if (!plan.highlight) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {LAUNCH_MODE.publicSignupMode === "waitlist"
                      ? "Solicitar acesso beta →"
                      : plan.trial_days > 0 ? `Começar ${plan.trial_days} dias grátis →` : "Entrar em contato →"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Coupon — discrete accordion ── */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => { /* toggle handled by CouponAccordion */ }}
          >
          </button>
          <CouponAccordion
            couponCode={couponCode}
            setCouponCode={setCouponCode}
            couponLoading={couponLoading}
            couponMsg={couponMsg}
            couponOk={couponOk}
            couponPreview={couponPreview}
            setCouponPreview={setCouponPreview}
            setCouponMsg={setCouponMsg}
            setCouponOk={setCouponOk}
            handleValidateCoupon={handleValidateCoupon}
          />
        </div>

        {/* ── FAQ ── */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          {[
            { q: "Preciso de cartão para testar?",        a: "Não. O teste de 14 dias não exige cartão de crédito." },
            { q: "Posso cancelar a qualquer momento?",     a: "Sim. Na fase beta não há contrato de fidelidade." },
            { q: "O que acontece quando o trial acaba?",   a: "Você escolhe um plano para continuar. Sem cobrança automática enquanto estamos em beta." },
            { q: "Meus dados ficam salvos?",               a: "Sim. Ao assinar, todos os dados do trial são preservados." },
          ].map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-bold text-sm text-gray-900 mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.q}</p>
              <p className="text-xs text-gray-500 leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom CTAs ── */}
        <div className="mt-10 text-center space-y-3">
          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Ainda com dúvida? Comece pelo diagnóstico gratuito.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/diagnostico"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 active:scale-[.98] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Fazer diagnóstico grátis →
            </Link>
            <a
              href="https://wa.me/5589994584163?text=Ol%C3%A1%2C+vim+pelo+site+da+Lokat+e+quero+conhecer+a+proposta+para+meu+neg%C3%B3cio."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 text-sm font-bold px-6 py-3 rounded-xl border border-gray-200 hover:border-green-300 hover:text-green-700 active:scale-[.98] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <MessageCircle className="w-4 h-4" />
              Falar com a Lokat
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Discrete coupon accordion ─────────────────────────────────────────────────

interface CouponAccordionProps {
  couponCode: string;
  setCouponCode: (v: string) => void;
  couponLoading: boolean;
  couponMsg: string;
  couponOk: boolean | null;
  couponPreview: { discountLabel: string; trialDays: number; finalPrice: string } | null;
  setCouponPreview: (v: { discountLabel: string; trialDays: number; finalPrice: string } | null) => void;
  setCouponMsg: (v: string) => void;
  setCouponOk: (v: boolean | null) => void;
  handleValidateCoupon: () => Promise<void>;
}

function CouponAccordion({ couponCode, setCouponCode, couponLoading, couponMsg, couponOk, couponPreview, setCouponPreview, setCouponMsg, setCouponOk, handleValidateCoupon }: CouponAccordionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        style={{ background: "transparent", cursor: "pointer" }}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tenho um cupom</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            O cupom será aplicado no cadastro. Você pode inserir também na tela de criação de conta.
          </p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponPreview(null); setCouponMsg(""); setCouponOk(null); }}
              onKeyDown={(e) => e.key === "Enter" && void handleValidateCoupon()}
              placeholder="Digite seu cupom"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
            <button
              onClick={() => void handleValidateCoupon()}
              disabled={couponLoading || !couponCode.trim()}
              className="text-xs font-bold uppercase tracking-wide bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}
            >
              {couponLoading ? "Validando…" : "Validar"}
            </button>
          </div>
          {couponMsg && (
            <div className={`mt-3 px-3 py-2.5 rounded-xl text-xs ${couponOk ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {couponMsg}
              {couponOk && couponPreview && (
                <div className="flex gap-3 mt-1 flex-wrap text-[11px] font-semibold">
                  <span>{couponPreview.discountLabel}</span>
                  <span>Preço: {couponPreview.finalPrice}/mês</span>
                  <span>Trial: {couponPreview.trialDays} dias</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
