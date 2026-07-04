"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Tag, Zap } from "lucide-react";
import { PLANS, MIN_PUBLIC_PRICE, formatPrice } from "@/lib/billing/plans";
import { PublicHeader } from "@/components/public-header";

const S = {
  mono: { fontFamily: "'Space Mono', monospace" } as React.CSSProperties,
  grotesk: { fontFamily: "'Space Grotesk', sans-serif" } as React.CSSProperties,
  bg: "#0a0a0c",
  card: "#13131a",
  border: "#222230",
  text: "#e8e8e8",
  muted: "#555566",
  accent: "#7b6ef6",
};

const PLAN_COLORS: Record<string, string> = {
  comunidade: "#f59e0b",
  start:      "#7b6ef6",
  pro:        "#a855f7",
  agencia:    "#10b981",
};

interface CouponPreview {
  discountLabel: string;
  trialDays: number;
  finalPrice: string;
}

export default function PlanosPage() {
  const [couponCode, setCouponCode]     = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponMsg, setCouponMsg]       = useState("");
  const [couponOk, setCouponOk]         = useState<boolean | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);

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
    <div style={{ background: S.bg, color: S.text, minHeight: "100vh" }}>
      <PublicHeader />

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-10 text-center">
        <div style={{ ...S.mono, fontSize: ".58rem", letterSpacing: ".2em", textTransform: "uppercase", color: S.accent, marginBottom: "1.2rem", display: "inline-flex", alignItems: "center", gap: ".5rem", background: `${S.accent}10`, border: `1px solid ${S.accent}25`, padding: ".25rem .8rem" }}>
          <Zap style={{ width: "10px", height: "10px" }} /> Beta aberto
        </div>
        <h1 style={{ ...S.grotesk, fontSize: "clamp(1.8rem, 5vw, 3.5rem)", fontWeight: 700, color: S.text, lineHeight: 1.1, marginBottom: ".75rem" }}>
          Escolha como começar
        </h1>
        <p style={{ ...S.grotesk, color: S.muted, fontSize: "clamp(.85rem, 2.5vw, 1rem)", maxWidth: "480px", margin: "0 auto 1.5rem", lineHeight: 1.65 }}>
          {`A partir de R$ ${MIN_PUBLIC_PRICE}/mês. 14 dias de teste grátis. Sem cartão de crédito.`}
        </p>
        <p style={{ ...S.mono, fontSize: ".55rem", letterSpacing: ".12em", textTransform: "uppercase", color: S.muted }}>
          Preços em beta — podem mudar antes do lançamento oficial
        </p>
      </section>

      {/* ── Plans grid ── */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visiblePlans.map((plan) => {
            const color = PLAN_COLORS[plan.slug] ?? S.accent;
            const isOpen = expanded === plan.slug;
            return (
              <div
                key={plan.slug}
                style={{
                  background: plan.highlight ? `linear-gradient(160deg, #1a1428 0%, ${S.card} 100%)` : S.card,
                  border: `1px solid ${plan.highlight ? `${color}40` : S.border}`,
                  position: "relative",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", ...S.mono, fontSize: ".5rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#fff", background: color, padding: ".18rem .7rem", whiteSpace: "nowrap" }}>
                    {plan.badge}
                  </div>
                )}

                <div className="p-6 md:p-7">
                  {/* Header */}
                  <div style={{ marginBottom: "1.2rem" }}>
                    <div style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".16em", textTransform: "uppercase", color, marginBottom: ".4rem" }}>
                      {plan.slug}
                    </div>
                    <h2 style={{ ...S.grotesk, fontSize: "1.1rem", fontWeight: 700, color: S.text, lineHeight: 1.2, marginBottom: ".25rem" }}>
                      {plan.name}
                    </h2>
                    <p style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted, lineHeight: 1.5 }}>{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div style={{ marginBottom: "1.4rem", paddingBottom: "1.2rem", borderBottom: `1px solid ${S.border}` }}>
                    <div className="flex items-end gap-1">
                      <span style={{ ...S.grotesk, fontSize: "2.2rem", fontWeight: 700, color: S.text, lineHeight: 1 }}>
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted, marginBottom: ".3rem" }}>/mês</span>
                    </div>
                    {plan.trial_days > 0 && (
                      <p style={{ ...S.mono, fontSize: ".52rem", letterSpacing: ".1em", textTransform: "uppercase", color, marginTop: ".3rem" }}>
                        {plan.trial_days} dias grátis para testar
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    {plan.entitlements.slice(0, isOpen ? undefined : 5).map((e) => (
                      <div key={e} className="flex items-center gap-2 mb-2">
                        <CheckCircle2 style={{ width: "12px", height: "12px", color, flexShrink: 0 }} strokeWidth={2} />
                        <span style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted }}>
                          {e.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                    {plan.entitlements.length > 5 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : plan.slug)}
                        className="flex items-center gap-1 mt-1"
                        style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", color: S.muted, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <ChevronDown style={{ width: "10px", height: "10px", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                        {isOpen ? "Mostrar menos" : `+${plan.entitlements.length - 5} módulos`}
                      </button>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/criar-conta?plan=${plan.slug}${couponCode ? `&coupon=${couponCode}` : ""}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: ".85rem 1.5rem",
                      background: plan.highlight ? color : "transparent",
                      color: plan.highlight ? "#fff" : S.text,
                      border: `1px solid ${plan.highlight ? "transparent" : S.border}`,
                      ...S.mono,
                      fontSize: ".6rem",
                      letterSpacing: ".12em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      transition: "background .2s, border-color .2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!plan.highlight) { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}50`; }
                    }}
                    onMouseLeave={(e) => {
                      if (!plan.highlight) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = S.border; }
                    }}
                  >
                    {plan.trial_days > 0 ? `Começar ${plan.trial_days} dias grátis →` : "Entrar em contato →"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Coupon block ── */}
        <div className="mt-10" style={{ border: `1px solid ${S.border}`, background: S.card, padding: "1.5rem" }}>
          <div className="flex items-center gap-2 mb-3">
            <Tag style={{ width: "14px", height: "14px", color: S.accent }} />
            <span style={{ ...S.grotesk, fontSize: ".85rem", fontWeight: 700, color: S.text }}>Tem um cupom?</span>
          </div>
          <p style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted, marginBottom: "1rem" }}>
            Use seu cupom de beta, founders ou desconto especial no checkout.
          </p>
          <div className="flex gap-3 flex-col sm:flex-row">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponPreview(null); setCouponMsg(""); setCouponOk(null); }}
              onKeyDown={(e) => e.key === "Enter" && void handleValidateCoupon()}
              placeholder="BETA100 · FOUNDERS · TESTE14"
              style={{ flex: 1, background: "#0a0a0c", border: `1px solid ${S.border}`, color: S.text, padding: ".75rem 1rem", ...S.mono, fontSize: ".65rem", letterSpacing: ".1em", outline: "none" }}
            />
            <button
              onClick={() => void handleValidateCoupon()}
              disabled={couponLoading || !couponCode.trim()}
              style={{ ...S.mono, fontSize: ".6rem", letterSpacing: ".12em", textTransform: "uppercase", background: S.accent, color: "#fff", padding: ".75rem 1.5rem", border: "none", cursor: "pointer", opacity: couponLoading ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              {couponLoading ? "Validando…" : "Validar cupom"}
            </button>
          </div>
          {couponMsg && (
            <div style={{ marginTop: ".75rem", padding: ".6rem .9rem", background: couponOk ? "#10b98115" : "#e0635a15", border: `1px solid ${couponOk ? "#10b98130" : "#e0635a30"}` }}>
              <p style={{ ...S.grotesk, fontSize: ".75rem", color: couponOk ? "#10b981" : "#e0635a" }}>{couponMsg}</p>
              {couponOk && couponPreview && (
                <div className="flex gap-4 mt-1.5 flex-wrap">
                  <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#10b981" }}>
                    {couponPreview.discountLabel}
                  </span>
                  <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#10b981" }}>
                    {`Preço: ${couponPreview.finalPrice}/mês`}
                  </span>
                  <span style={{ ...S.mono, fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", color: "#10b981" }}>
                    {`Trial: ${couponPreview.trialDays} dias`}
                  </span>
                </div>
              )}
            </div>
          )}
          <p style={{ ...S.grotesk, fontSize: ".65rem", color: S.muted, marginTop: ".75rem" }}>
            O cupom será aplicado no cadastro. Planos anuais serão liberados no beta fechado.
          </p>
        </div>

        {/* ── FAQ section ── */}
        <div className="mt-10 grid md:grid-cols-2 gap-4">
          {[
            { q: "Preciso de cartão para testar?", a: "Não. O teste grátis de 14 dias não requer cartão de crédito." },
            { q: "Posso cancelar a qualquer momento?", a: "Sim. Nesta fase beta não há contrato de fidelidade." },
            { q: "O que acontece quando o trial acaba?", a: "Você escolhe um plano para continuar. Sem cobrança automática enquanto estamos no beta." },
            { q: "Meus dados ficam salvos?", a: "Sim. Ao assinar, todos os dados criados no trial são preservados." },
          ].map((item) => (
            <div key={item.q} style={{ border: `1px solid ${S.border}`, padding: "1.2rem" }}>
              <p style={{ ...S.grotesk, fontSize: ".82rem", fontWeight: 700, color: S.text, marginBottom: ".35rem" }}>{item.q}</p>
              <p style={{ ...S.grotesk, fontSize: ".72rem", color: S.muted, lineHeight: 1.6 }}>{item.a}</p>
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className="mt-10 text-center">
          <p style={{ ...S.grotesk, fontSize: ".85rem", color: S.muted, marginBottom: "1rem" }}>
            Ainda com dúvida? Comece pelo diagnóstico gratuito.
          </p>
          <Link
            href="/diagnostico"
            style={{ display: "inline-block", padding: ".85rem 2.5rem", background: S.accent, color: "#fff", ...S.mono, fontSize: ".68rem", letterSpacing: ".14em", textTransform: "uppercase", textDecoration: "none" }}
          >
            ■ Fazer diagnóstico grátis →
          </Link>
        </div>
      </section>
    </div>
  );
}
