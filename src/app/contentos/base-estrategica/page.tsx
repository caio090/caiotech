import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BookOpen } from "lucide-react";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

export default async function ContentosBaseEstrategicaPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;

  let brandName     = "";
  let segment       = "";
  let city          = "";
  let instagram     = "";
  let toneOfVoice   = "";
  let objectives    = "";
  let channels      = "";
  let companyName   = "";

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return renderEmpty(companyName);

      // Determine client id: owner-client or staff with active client
      let clientId: string | null = null;
      const { data: clientRow } = await supabase
        .from("clients").select("id, company_name").eq("owner_id", user.id).maybeSingle();

      if (clientRow) {
        clientId    = clientRow.id;
        companyName = clientRow.company_name ?? "";
      } else if (activeClientId) {
        clientId = activeClientId;
        const { data: cRow } = await supabase
          .from("clients").select("company_name").eq("id", activeClientId).maybeSingle();
        companyName = cRow?.company_name ?? "";
      }

      if (clientId) {
        const { data: profile } = await supabase
          .from("onboarding_profiles")
          .select("*")
          .eq("client_id", clientId)
          .maybeSingle();

        if (profile) {
          brandName   = profile.brand_name ?? profile.company_name ?? companyName;
          segment     = profile.segment ?? profile.niche ?? "";
          city        = profile.city ?? "";
          instagram   = profile.instagram ?? "";
          toneOfVoice = profile.tone_of_voice ?? profile.comunicacao ?? "";
          objectives  = Array.isArray(profile.objectives)
            ? profile.objectives.join(", ")
            : (profile.objectives ?? profile.goal ?? "");
          channels    = Array.isArray(profile.channels)
            ? profile.channels.join(", ")
            : (profile.channels ?? "");
        }
      }
    } catch {}
  }

  const hasBrand = brandName || segment || city || instagram;
  const hasPositioning = toneOfVoice || objectives || channels;

  return (
    <>
      <PageHeader
        title="Base Estratégica"
        description={companyName ? `Identidade e posicionamento de ${companyName}` : "Identidade e posicionamento da marca"}
      />

      {!hasBrand && !hasPositioning ? (
        renderEmpty(companyName)
      ) : (
        <div className="space-y-5">
          {hasBrand && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Identidade da marca</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Row label="Nome da marca" value={brandName} />
                <Row label="Segmento"      value={segment} />
                <Row label="Cidade"        value={city} />
                <Row label="Instagram"     value={instagram} />
              </div>
            </div>
          )}

          {hasPositioning && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Posicionamento</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Row label="Tom de voz"   value={toneOfVoice} />
                <Row label="Objetivos"    value={objectives} />
                <Row label="Canais"       value={channels} />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Documento de marca",
              "Personas",
              "Calendário editorial",
              "Guia de tom de voz",
              "Manual do Instagram",
              "Análise de concorrentes",
            ].map((doc) => (
              <div key={doc} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-xs text-gray-500">{doc}</span>
                </div>
                <span className="text-[9px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded-full border border-gray-100">Em breve</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function renderEmpty(companyName: string) {
  return (
    <>
      <PageHeader
        title="Base Estratégica"
        description={companyName ? `Identidade e posicionamento de ${companyName}` : "Identidade e posicionamento da marca"}
      />
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma base estratégica encontrada</p>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          As informações de posicionamento, identidade e tom de voz da marca serão exibidas aqui após o onboarding.
        </p>
      </div>
    </>
  );
}
