/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — busca segura de
 * asset remoto (hoje: só o logo_url oficial de onboarding_profiles,
 * NUNCA uma URL arbitrária vinda do brief do usuário). Bloqueio de
 * SSRF: só https, host resolvido não pode ser loopback/privado/
 * link-local/metadata service, Content-Type precisa ser imagem
 * conhecida, tamanho e tempo limitados. Nunca lança -- toda falha
 * degrada para "logo indisponível" com warning explícito (nunca
 * bloqueia a geração inteira por causa disto).
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 8_000_000; // ~8MB
const ALLOWED_CONTENT_TYPES = /^image\/(png|jpe?g|webp|gif)/i;

export interface AssetFetchResult {
  ok: boolean;
  bytes?: Buffer;
  contentType?: string;
  error?: string;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true;
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true; // não resolveu para IP válido -- trata como não confiável
}

/**
 * Busca segura de um asset de imagem por URL https pública. Rejeita
 * explicitamente localhost/IP privado/link-local/metadata service
 * (169.254.169.254 incluso) antes de qualquer fetch real.
 */
export async function fetchAssetSafely(rawUrl: string): Promise<AssetFetchResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "URL inválida." };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "Somente URLs https são aceitas." };
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    return { ok: false, error: "Host não permitido." };
  }
  if (isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { ok: false, error: "Endereço IP não permitido." };
  }
  if (!isIP(hostname)) {
    try {
      const resolved = await dnsLookup(hostname);
      if (isPrivateOrReservedIp(resolved.address)) {
        return { ok: false, error: "Host resolve para um endereço não permitido." };
      }
    } catch {
      return { ok: false, error: "Não foi possível resolver o host." };
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal, redirect: "error" });
    if (!res.ok) return { ok: false, error: `Falha ao buscar asset (HTTP ${res.status}).` };
    const contentType = res.headers.get("content-type") ?? "";
    if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
      return { ok: false, error: `Tipo de conteúdo não suportado: ${contentType || "desconhecido"}.` };
    }
    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_BYTES) {
      return { ok: false, error: "Asset excede o tamanho máximo permitido." };
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return { ok: false, error: "Asset excede o tamanho máximo permitido." };
    }
    return { ok: true, bytes: Buffer.from(arrayBuffer), contentType };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return { ok: false, error: timedOut ? "Tempo limite excedido ao buscar o asset." : "Não foi possível buscar o asset." };
  } finally {
    clearTimeout(timer);
  }
}
