"use client";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  Users, Flame, Thermometer, Snowflake, Clock, MessageSquare,
  Globe, AtSign, Plus, Bot, ChevronRight, Lock,
  AlertTriangle, TrendingUp, Filter, ListOrdered,
} from "lucide-react";
import Link from "next/link";

type LeadStatus = "novo" | "em_atendimento" | "aguardando_resposta" | "no_vacuo" | "qualificado" | "perdido" | "convertido";
type LeadTemp   = "quente" | "morno" | "frio";
type LeadOrigin = "Instagram" | "WhatsApp" | "Site" | "Meta Ads" | "Google" | "Indicação" | "Manual" | "Outro";

interface Lead {
  id: string;
  name: string;
  company?: string;
  origin: LeadOrigin;
  status: LeadStatus;
  temp: LeadTemp;
  lastContact: string;
  responsible?: string;
  nextAction?: string;
  tags: string[];
  campaign?: string;
  hoursWithoutReply?: number;
}

const DEMO_LEADS: Lead[] = [
  { id: "l1", name: "Ana Souza",    company: "Clínica Bem Estar",  origin: "Instagram",  status: "no_vacuo",          temp: "quente", lastContact: "3 dias",  responsible: "Admin", nextAction: "Ligar hoje",        tags: ["lead quente", "clínica"],  campaign: "Campanha Antes e Depois",  hoursWithoutReply: 72  },
  { id: "l2", name: "Bruno Lima",   company: "Restaurante Sabor",  origin: "WhatsApp",   status: "em_atendimento",    temp: "quente", lastContact: "2h",      responsible: "Admin", nextAction: "Enviar proposta",   tags: ["delivery"],                 campaign: undefined,                   hoursWithoutReply: 2   },
  { id: "l3", name: "Carla Mendes", company: "Moda Chic",          origin: "Meta Ads",   status: "novo",              temp: "morno",  lastContact: "30min",   responsible: undefined, nextAction: "Qualificar",      tags: ["moda", "novo"],             campaign: "Black Friday",             hoursWithoutReply: 0   },
  { id: "l4", name: "Diego Torres", company: undefined,             origin: "Site",       status: "qualificado",       temp: "quente", lastContact: "1h",      responsible: "Admin", nextAction: "Agendar demo",      tags: ["SaaS", "decisor"],          campaign: undefined,                   hoursWithoutReply: 1   },
  { id: "l5", name: "Elisa Gomes",  company: "Doces da Elisa",     origin: "Indicação",  status: "aguardando_resposta", temp: "morno", lastContact: "1 dia",  responsible: "Admin", nextAction: "Follow-up amanhã",  tags: ["confeitaria"],              campaign: undefined,                   hoursWithoutReply: 24  },
  { id: "l6", name: "Felipe Costa", company: "Academia Força",     origin: "Google",     status: "no_vacuo",          temp: "frio",   lastContact: "7 dias",  responsible: undefined, nextAction: "Reativar",        tags: ["academia", "frio"],         campaign: "Google Ads fitness",       hoursWithoutReply: 168 },
];

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  novo:                { label: "Novo",               color: "text-blue-700",    bg: "bg-blue-50 border-blue-100"    },
  em_atendimento:      { label: "Em atendimento",     color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-100" },
  aguardando_resposta: { label: "Aguardando resposta",color: "text-amber-700",   bg: "bg-amber-50 border-amber-100"  },
  no_vacuo:            { label: "No vácuo",            color: "text-red-700",     bg: "bg-red-50 border-red-100"      },
  qualificado:         { label: "Qualificado",         color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100"},
  perdido:             { label: "Perdido",             color: "text-gray-500",    bg: "bg-gray-50 border-gray-100"   },
  convertido:          { label: "Convertido",          color: "text-purple-700",  bg: "bg-purple-50 border-purple-100"},
};

const TEMP_CONFIG: Record<LeadTemp, { icon: typeof Flame; color: string }> = {
  quente: { icon: Flame,       color: "text-red-500"   },
  morno:  { icon: Thermometer, color: "text-amber-500" },
  frio:   { icon: Snowflake,   color: "text-blue-400"  },
};

const ORIGIN_ICON: Record<LeadOrigin, typeof Globe> = {
  Instagram: AtSign, WhatsApp: MessageSquare, Site: Globe, "Meta Ads": TrendingUp,
  Google: Globe, Indicação: Users, Manual: Users, Outro: Globe,
};

export default function AdminLeadsPage() {
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "todos">("todos");
  const [filterTemp,   setFilterTemp]   = useState<LeadTemp | "todas">("todas");
  const [showAgentInfo, setShowAgentInfo] = useState(false);

  const leads = DEMO_LEADS.filter((l) => {
    if (filterStatus !== "todos" && l.status !== filterStatus) return false;
    if (filterTemp   !== "todas" && l.temp   !== filterTemp)   return false;
    return true;
  });

  const noVacuo = DEMO_LEADS.filter((l) => l.status === "no_vacuo").length;
  const quentes = DEMO_LEADS.filter((l) => l.temp === "quente").length;
  const novos   = DEMO_LEADS.filter((l) => l.status === "novo").length;

  return (
    <div>
      <PageHeader title="CRM" description="Gestão de leads, pipeline e relacionamento com prospects">
        <button className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Novo lead
        </button>
      </PageHeader>

      {/* Aviso de dados demo */}
      <div className="mb-5 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Dados de exemplo — estrutura preparada para leads reais. Integração com WhatsApp, Instagram e Meta Ads em breve.</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "No vácuo",     value: noVacuo, icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",    border: noVacuo > 0 ? "border-red-200" : "border-gray-100" },
          { label: "Quentes",      value: quentes, icon: Flame,         color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
          { label: "Novos",        value: novos,   icon: Users,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100" },
          { label: "Total",        value: DEMO_LEADS.length, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${border}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
            </div>
            <div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Waitlist shortcut */}
      <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <ListOrdered className="w-4 h-4 text-indigo-500" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Lista de Espera — Waitlist</p>
            <p className="text-[10px] text-gray-400">Leads captados pelo site, modal e /pre-acesso · entrada no CRM</p>
          </div>
        </div>
        <Link
          href="/admin/super/waitlist"
          className="flex-shrink-0 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors"
        >
          Ver waitlist →
        </Link>
      </div>

      {/* Agente IA */}
      <div className="mb-6 bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Agente IA de Leads</p>
              <p className="text-[10px] text-gray-400">Qualificação, follow-up e alertas automáticos</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
            <Lock className="w-2.5 h-2.5" /> Desativado
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAgentInfo(true)}
            className="text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Saber mais
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl cursor-not-allowed opacity-60">
            <Lock className="w-3 h-3" /> Ativar agente — plano superior
          </button>
        </div>
        {showAgentInfo && (
          <div className="mt-3 p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs text-violet-700 space-y-1">
            <p className="font-bold text-violet-800 mb-1">O que o Agente IA fará quando ativado:</p>
            {[
              "Qualificar leads automaticamente com base em respostas",
              "Alertar quando um lead ficar sem resposta por X horas",
              "Sugerir mensagem de follow-up personalizada",
              "Registrar temperatura e próxima ação",
              "Encaminhar para humano quando necessário",
            ].map((item, i) => (
              <p key={i} className="flex items-center gap-1.5"><ChevronRight className="w-3 h-3" />{item}</p>
            ))}
            <p className="text-[10px] text-violet-500 mt-2">Disponível em plano superior. Fale com a LOKAT para ativar.</p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <Filter className="w-3 h-3" /> Filtros:
        </div>
        {(["todos", "novo", "em_atendimento", "aguardando_resposta", "no_vacuo", "qualificado"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${filterStatus === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
          >
            {s === "todos" ? "Todos" : STATUS_CONFIG[s as LeadStatus]?.label ?? s}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(["todas", "quente", "morno", "frio"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterTemp(t)}
            className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${filterTemp === t ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
          >
            {t === "todas" ? "Todas temp." : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Lista de leads */}
      <div className="space-y-2">
        {leads.map((lead) => {
          const status      = STATUS_CONFIG[lead.status];
          const tempCfg     = TEMP_CONFIG[lead.temp];
          const OriginIcon  = ORIGIN_ICON[lead.origin];
          const TempIcon    = tempCfg.icon;
          const isVacuo     = lead.status === "no_vacuo";

          return (
            <div
              key={lead.id}
              className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-all hover:shadow-sm ${isVacuo ? "border-red-100 bg-red-50/30" : "border-gray-100"}`}
            >
              {/* Temp icon */}
              <div className="flex-shrink-0 mt-0.5">
                <TempIcon className={`w-4 h-4 ${tempCfg.color}`} strokeWidth={1.5} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{lead.name}</p>
                    {lead.company && <p className="text-[10px] text-gray-400">{lead.company}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isVacuo && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                        No vácuo
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <OriginIcon className="w-3 h-3" strokeWidth={1.5} />{lead.origin}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Clock className="w-3 h-3" />{lead.lastContact}
                  </span>
                  {lead.responsible && (
                    <span className="text-[10px] text-gray-400">👤 {lead.responsible}</span>
                  )}
                  {lead.campaign && (
                    <span className="text-[10px] text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                      🎯 {lead.campaign}
                    </span>
                  )}
                </div>

                {lead.nextAction && (
                  <p className="mt-1.5 text-[10px] font-medium text-gray-600 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-indigo-400" />{lead.nextAction}
                  </p>
                )}

                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {lead.tags.map((tag) => (
                      <span key={tag} className="text-[9px] bg-gray-50 border border-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {leads.length === 0 && (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-10 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum lead encontrado com esses filtros.</p>
          </div>
        )}
      </div>

      {/* Conversas / Chat — bloco preparado */}
      <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-bold text-gray-800">Conversas</p>
          </div>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Em breve</span>
        </div>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Nenhuma conversa conectada ainda. Quando WhatsApp, Instagram Direct ou formulário forem integrados,
          os atendimentos aparecerão aqui em tempo real.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Agente IA",            value: "Desativado" },
            { label: "Respostas automáticas", value: "Desativado" },
            { label: "Modo atual",            value: "Manual" },
            { label: "Última sync",           value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-gray-600 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl cursor-not-allowed">
            <Lock className="w-3 h-3" /> Conectar WhatsApp
          </button>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl cursor-not-allowed">
            <Lock className="w-3 h-3" /> Conectar Instagram Direct
          </button>
        </div>
      </div>
    </div>
  );
}
