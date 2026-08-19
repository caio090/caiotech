import fs from "node:fs";
import path from "node:path";
import {
  type LktActivityEvent,
  validateLktActivityEvent,
  sortLktActivityDesc,
  getLatestLktMovement,
} from "./types";

const ACTIVITY_FILE = path.join(process.cwd(), "src", "lib", "lkt-activity", "activity.json");

/**
 * Leitura pura de arquivo -- nenhuma chamada de rede/banco. Server-only por
 * convenção (usa `fs`/`process.cwd()`), chamado a partir de Server
 * Components (src/app/admin/status/page.tsx) do mesmo jeito que
 * getDeploymentInfo(). Eventos inválidos são descartados silenciosamente
 * (nunca derrubam a página de Status), mas nunca aparecem na lista --
 * "status não pode mentir" também vale para o próprio mecanismo de status.
 */
export function getLktActivity(): LktActivityEvent[] {
  let raw: string;
  try {
    raw = fs.readFileSync(ACTIVITY_FILE, "utf8");
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid: LktActivityEvent[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Partial<LktActivityEvent>;
    if (!candidate.id || !candidate.timestamp) continue;
    const result = validateLktActivityEvent(candidate);
    if (result.valid) valid.push(candidate as LktActivityEvent);
  }

  return sortLktActivityDesc(valid);
}

export function getLatestMovement(): LktActivityEvent | null {
  return getLatestLktMovement(getLktActivity());
}

export function getRecentLktActivity(limit = 20): LktActivityEvent[] {
  return getLktActivity().slice(0, limit);
}
