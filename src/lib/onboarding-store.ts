import { useSyncExternalStore } from "react";

export interface OnboardingCliente {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  empresa: string;
}

export interface OnboardingObjetivo {
  principal: string;
  secundarios: string[];
}

export interface OnboardingMarca {
  nome: string;
  pais: string;
  estado: string;
  cidade: string;
  segmento: string;
  descricao: string;
  produtos: string;
  instagram: string;
  whatsapp: string;
  site: string;
}

export interface OnboardingPublico {
  clienteIdeal: string;
  faixaEtaria: string;
  localizacao: string;
  dores: string;
  desejos: string;
  objecoes: string;
  contato: string;
}

export interface OnboardingIdentidade {
  logoName: string;
  cores: string;
  referencias: string;
  canva: string;
  drive: string;
  estilo: string;
}

export interface OnboardingEstilo {
  tomDeVoz: string[];
  palavrasUsa: string;
  palavrasEvita: string;
  formalidade: string;
  ctaEstilo: string;
}

export interface OnboardingOperacao {
  responsavel: string;
  whatsapp: string;
  horario: string;
  frequencia: string;
  redes: string[];
  usaCanva: boolean;
  usaMeta: boolean;
  usaDrive: boolean;
  usaTrafego: boolean;
  equipeInterna: boolean;
}

export interface OnboardingState {
  tipo?: string;
  cliente?: OnboardingCliente;
  objetivo?: OnboardingObjetivo;
  /** @deprecated use objetivo.principal + objetivo.secundarios */
  objetivos?: string[];
  marca?: OnboardingMarca;
  publico?: OnboardingPublico;
  identidade?: OnboardingIdentidade;
  estilo?: OnboardingEstilo;
  /** @deprecated use estilo.tomDeVoz */
  tomDeVoz?: string[];
  operacao?: OnboardingOperacao;
}

const KEY = "lokat_onboarding";

export function saveOnboarding(data: Partial<OnboardingState>): void {
  const current = getOnboarding();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...data }));
  _snapJson = "";
}

export function getOnboarding(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as OnboardingState;
  } catch {
    return {};
  }
}

export function clearOnboarding(): void {
  localStorage.removeItem(KEY);
  _snapJson = "";
}

/** Convenience: returns tone-of-voice list regardless of which schema version was saved. */
export function getTomDeVoz(data: OnboardingState): string[] {
  return data.estilo?.tomDeVoz ?? data.tomDeVoz ?? [];
}

/** Convenience: returns objectives regardless of schema version. */
export function getObjetivoPrincipal(data: OnboardingState): string {
  return data.objetivo?.principal ?? data.objetivos?.[0] ?? "";
}

export function getObjetivosSecundarios(data: OnboardingState): string[] {
  if (data.objetivo) return data.objetivo.secundarios;
  return (data.objetivos ?? []).slice(1);
}

let _snap: OnboardingState = {};
let _snapJson = "";

function _clientSnapshot(): OnboardingState {
  const j = localStorage.getItem(KEY) ?? "{}";
  if (j !== _snapJson) {
    _snapJson = j;
    try { _snap = JSON.parse(j) as OnboardingState; } catch { _snap = {}; }
  }
  return _snap;
}

export function useOnboardingStore(): OnboardingState {
  return useSyncExternalStore(
    () => () => {},
    _clientSnapshot,
    () => ({}) as OnboardingState
  );
}
