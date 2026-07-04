"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useOnboardingStore,
  getOnboarding,
  getObjetivoPrincipal,
  getObjetivosSecundarios,
  getTomDeVoz,
} from "@/lib/onboarding-store";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";

const objetivoLabel: Record<string, string> = {
  vender:      "Vender mais 💰",
  leads:       "Gerar leads 🎯",
  autoridade:  "Construir autoridade 🏆",
  engajamento: "Aumentar engajamento ❤️",
  marketing:   "Organizar marketing 📊",
  atendimento: "Melhorar atendimento 💬",
};

const tonLabel: Record<string, string> = {
  profissional: "Profissional 💼",
  direto:       "Direto ⚡",
  acolhedor:    "Acolhedor 🤗",
  educativo:    "Educativo 📚",
  popular:      "Popular 🎉",
  sofisticado:  "Sofisticado ✨",
  divertido:    "Divertido 😄",
  tecnico:      "Técnico 🔧",
  tradicional:  "Tradicional 🏛️",
};

const formalidadeLabel: Record<string, string> = {
  muito_informal: "Muito informal",
  informal:       "Informal",
  neutro:         "Neutro",
  formal:         "Formal",
  muito_formal:   "Muito formal",
};

const ctaLabel: Record<string, string> = {
  urgencia:  "Urgência 🔥",
  convite:   "Convite 🤝",
  pergunta:  "Pergunta ❓",
  beneficio: "Benefício 🎯",
};

function Chip({ label, color = "gray" }: { label: string; color?: "indigo" | "purple" | "gray" | "emerald" }) {
  const cls = {
    indigo:  "bg-indigo-100 text-indigo-700",
    purple:  "bg-purple-100 text-purple-700",
    gray:    "bg-gray-100 text-gray-600",
    emerald: "bg-emerald-100 text-emerald-700",
  }[color];
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>;
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-gray-600 leading-relaxed">
        <span className="font-semibold text-gray-700">{label}: </span>
        {value}
      </p>
    </div>
  );
}

export default function OnboardingConclusaoPage() {
  const router = useRouter();
  const data = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  const brandName = data.marca?.nome || data.cliente?.empresa || "Minha Marca";
  const brandInitial = brandName[0]?.toUpperCase() ?? "M";

  async function handleFinish() {
    setSaving(true);

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const stored = getOnboarding();

        // Resolve client_id: localStorage primeiro, senão busca/cria no DB
        let clientId = typeof window !== "undefined"
          ? localStorage.getItem("lokat_client_id")
          : null;

        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!clientId) {
          const user = authUser;
          if (user) {
            // Tenta encontrar client já existente
            const { data: existing } = await supabase
              .from("clients")
              .select("id")
              .eq("owner_id", user.id)
              .maybeSingle();

            if (existing) {
              clientId = existing.id;
              localStorage.setItem("lokat_client_id", existing.id);
              console.log("[conclusao] client_id recuperado do DB:", clientId);
            } else {
              // Usa RPC (SECURITY DEFINER) para criar o client sem depender de sessão ativa
              const { data: newId, error: createErr } = await supabase.rpc(
                "create_client_on_signup",
                {
                  p_user_id:      user.id,
                  p_company_name: stored.marca?.nome || stored.cliente?.empresa || stored.cliente?.nome || "Minha Empresa",
                  p_responsible:  stored.cliente?.nome || null,
                  p_email:        user.email ?? null,
                }
              );
              if (createErr) {
                console.error("[conclusao] Erro ao criar client via RPC:", JSON.stringify(createErr));
              } else if (newId) {
                clientId = newId as string;
                localStorage.setItem("lokat_client_id", clientId);
                console.log("[conclusao] client criado via RPC:", clientId);
              }
            }
          }
        }

        if (clientId) {
          const principal    = getObjetivoPrincipal(stored);
          const secundarios  = getObjetivosSecundarios(stored);
          const tomDeVoz     = getTomDeVoz(stored);

          const { error: onbErr } = await supabase.from("onboarding_profiles").upsert({
            client_id:            clientId,
            objective_primary:    principal || null,
            objective_secondary:  secundarios.length > 0 ? secundarios : null,
            brand_name:           stored.marca?.nome || null,
            country:              stored.marca?.pais || null,
            state:                stored.marca?.estado || null,
            city:                 stored.marca?.cidade || null,
            segment:              stored.marca?.segmento || null,
            description:          stored.marca?.descricao || null,
            products_services:    stored.marca?.produtos || null,
            instagram:            stored.marca?.instagram || null,
            whatsapp:             stored.marca?.whatsapp || null,
            website:              stored.marca?.site || null,
            ideal_customer:       stored.publico?.clienteIdeal || null,
            age_range:            stored.publico?.faixaEtaria || null,
            audience_location:    stored.publico?.localizacao || null,
            pains:                stored.publico?.dores || null,
            desires:              stored.publico?.desejos || null,
            objections:           stored.publico?.objecoes || null,
            contact_behavior:     stored.publico?.contato || null,
            canva_link:           stored.identidade?.canva || null,
            drive_link:           stored.identidade?.drive || null,
            visual_style:         stored.identidade?.estilo || null,
            tone_of_voice:        tomDeVoz.length > 0 ? tomDeVoz : null,
            words_use:            stored.estilo?.palavrasUsa || null,
            words_avoid:          stored.estilo?.palavrasEvita || null,
            formality_level:      stored.estilo?.formalidade || null,
            cta_style:            stored.estilo?.ctaEstilo || null,
            approval_responsible: stored.operacao?.responsavel || null,
            approval_phone:       stored.operacao?.whatsapp || null,
            best_contact_time:    stored.operacao?.horario || null,
            content_frequency:    stored.operacao?.frequencia || null,
            social_channels:      (stored.operacao?.redes ?? []).length > 0 ? stored.operacao?.redes : null,
            uses_canva:           stored.operacao?.usaCanva ?? false,
            uses_meta_business:   stored.operacao?.usaMeta ?? false,
            uses_drive:           stored.operacao?.usaDrive ?? false,
            uses_paid_traffic:    stored.operacao?.usaTrafego ?? false,
            has_internal_team:    stored.operacao?.equipeInterna ?? false,
            completed:            true,
          }, { onConflict: "client_id" });

          if (onbErr) console.error("[conclusao] Erro no upsert de onboarding_profiles:", JSON.stringify(onbErr));

          const { error: statusErr } = await supabase
            .from("clients")
            .update({ status: "ativo" })
            .eq("id", clientId);
          if (statusErr) console.error("[conclusao] Erro ao atualizar clients.status:", JSON.stringify(statusErr));

          await supabase.from("activity_logs").insert({
            user_id:     authUser?.id ?? null,
            client_id:   clientId,
            action:      "onboarding_completed",
            entity_type: "onboarding_profiles",
            metadata:    { brand_name: stored.marca?.nome, segment: stored.marca?.segmento },
          });
        }
      } catch (e) {
        console.error("[conclusao] Erro ao salvar no Supabase:", e);
        // Não bloqueia o redirect — salvo no localStorage de qualquer forma
      }
    }

    // Redirecionar conforme tipo de conta escolhido no onboarding
    let destination = "/client/home";
    try {
      const accountType = sessionStorage.getItem("lokat_account_type");
      if (accountType === "agencia" || accountType === "agency") {
        destination = "/agency/home";
      }
    } catch {}
    router.push(destination);
  }

  const principal = getObjetivoPrincipal(data);
  const secundarios = getObjetivosSecundarios(data);
  const tomDeVoz = getTomDeVoz(data);
  const formalidade = data.estilo?.formalidade;
  const ctaEstilo = data.estilo?.ctaEstilo;
  const palavrasUsa = data.estilo?.palavrasUsa;
  const palavrasEvita = data.estilo?.palavrasEvita;

  const redes = data.operacao?.redes ?? [];
  const usaCanva = data.operacao?.usaCanva;
  const usaMeta = data.operacao?.usaMeta;

  return (
    <div>
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Marca configurada!</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Tudo pronto. Nossa equipe vai analisar as informações e preparar tudo para você.
        </p>
      </div>

      {/* Brand card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 space-y-5">

        {/* Brand header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-700 text-xl font-black flex-shrink-0">
            {brandInitial}
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">{brandName}</h2>
            {data.marca?.segmento && (
              <p className="text-xs text-gray-400">
                {data.marca.segmento}
                {data.marca.cidade ? ` · ${data.marca.cidade}${data.marca.estado ? `, ${data.marca.estado}` : ""}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Objetivo */}
        {(principal || secundarios.length > 0) && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Objetivo</p>
            <div className="flex flex-wrap gap-1.5">
              {principal && (
                <span className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-full font-medium">
                  {objetivoLabel[principal] ?? principal}
                </span>
              )}
              {secundarios.map((s) => (
                <Chip key={s} label={objetivoLabel[s] ?? s} color="indigo" />
              ))}
            </div>
          </div>
        )}

        {/* Público */}
        {(data.publico?.clienteIdeal || data.publico?.faixaEtaria) && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Público-alvo</p>
            <div className="space-y-1.5">
              <Row label="Perfil ideal" value={data.publico?.clienteIdeal} />
              <Row label="Faixa etária" value={data.publico?.faixaEtaria} />
              <Row label="Localização" value={data.publico?.localizacao} />
            </div>
          </div>
        )}

        {/* Tom de voz & estilo */}
        {(tomDeVoz.length > 0 || formalidade || ctaEstilo) && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tom de voz & Estilo</p>
            {tomDeVoz.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tomDeVoz.map((t) => (
                  <Chip key={t} label={tonLabel[t] ?? t} color="purple" />
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {formalidade && <Row label="Formalidade" value={formalidadeLabel[formalidade] ?? formalidade} />}
              {ctaEstilo && <Row label="Estilo de CTA" value={ctaLabel[ctaEstilo] ?? ctaEstilo} />}
              {palavrasUsa && <Row label="Usa" value={palavrasUsa} />}
              {palavrasEvita && <Row label="Evita" value={palavrasEvita} />}
            </div>
          </div>
        )}

        {/* Canais */}
        {redes.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Canais</p>
            <div className="flex flex-wrap gap-1.5">
              {redes.map((r) => <Chip key={r} label={r} color="gray" />)}
            </div>
          </div>
        )}

        {/* Ferramentas */}
        {(usaCanva || usaMeta) && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ferramentas</p>
            <div className="flex flex-wrap gap-1.5">
              {usaCanva && <Chip label="Canva" color="emerald" />}
              {usaMeta && <Chip label="Meta Business Suite" color="emerald" />}
              {data.operacao?.usaDrive && <Chip label="Google Drive" color="emerald" />}
              {data.operacao?.usaTrafego && <Chip label="Tráfego Pago" color="emerald" />}
            </div>
          </div>
        )}

        {/* Operação */}
        {data.operacao?.responsavel && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Operação</p>
            <div className="space-y-1.5">
              <Row label="Responsável" value={data.operacao?.responsavel} />
              <Row label="Frequência" value={data.operacao?.frequencia} />
              <Row label="Horário de contato" value={data.operacao?.horario} />
              {data.operacao?.equipeInterna && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-gray-600">Possui equipe interna de marketing</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* What happens next */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
        <h3 className="text-xs font-bold text-indigo-700 mb-2.5">O que acontece agora?</h3>
        <ul className="space-y-2">
          {[
            "Nossa equipe vai analisar sua marca em até 24h",
            "Você vai receber o primeiro calendário de conteúdo",
            "Um responsável vai entrar em contato pelo WhatsApp",
            "Seu painel já está disponível para acompanhar tudo",
          ].map((item, i) => (
            <li key={i} className="text-xs text-indigo-600 flex items-start gap-2">
              <span className="font-bold text-indigo-400 flex-shrink-0">{i + 1}.</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleFinish}
        disabled={saving}
        className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
          : <><span>Ir para meu painel</span><ArrowRight className="w-4 h-4" /></>
        }
      </button>
    </div>
  );
}
