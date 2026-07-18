import { useSyncExternalStore } from "react";

export type CanvaStatus = "tem_conta" | "tem_equipe" | "nao_usa" | "nao_sei";

export interface CanvaConfig {
  status: CanvaStatus | null;
  link: string;
  templates: string;
  responsavel: string;
  email: string;
  observacoes: string;
  solicitado: boolean;
}

const EMPTY: CanvaConfig = {
  status: null,
  link: "",
  templates: "",
  responsavel: "",
  email: "",
  observacoes: "",
  solicitado: false,
};

const KEY = "lokat_canva";

export function saveCanva(data: Partial<CanvaConfig>): void {
  const current = getCanva();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...data }));
  _snapJson = "";
}

export function getCanva(): CanvaConfig {
  if (typeof window === "undefined") return EMPTY;
  try {
    return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<CanvaConfig>) };
  } catch {
    return EMPTY;
  }
}

export function clearCanva(): void {
  localStorage.removeItem(KEY);
  _snapJson = "";
}

let _snap: CanvaConfig = EMPTY;
let _snapJson = "";

function _clientSnapshot(): CanvaConfig {
  const j = localStorage.getItem(KEY) ?? "{}";
  if (j !== _snapJson) {
    _snapJson = j;
    try { _snap = { ...EMPTY, ...(JSON.parse(j) as Partial<CanvaConfig>) }; } catch { _snap = EMPTY; }
  }
  return _snap;
}

const noopSubscribe = () => () => {};
const getCanvaServerSnapshot = () => EMPTY;

export function useCanvaStore(): CanvaConfig {
  return useSyncExternalStore(
    noopSubscribe,
    _clientSnapshot,
    getCanvaServerSnapshot
  );
}
