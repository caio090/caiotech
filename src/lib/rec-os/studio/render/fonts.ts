/**
 * Sprint REC OS Studio Visual Engine (Prompt 01) — materializa as fontes
 * reais da marca (fonts-data.ts, base64) em arquivos de verdade em
 * os.tmpdir(), único diretório com escrita garantida numa function
 * serverless da Vercel. Memoizado por processo -- a decodificação só
 * acontece uma vez por instância (cold start), não a cada requisição.
 *
 * Nenhum arquivo de fonte é aceito de upload de usuário -- só as 6
 * fontes já usadas pelo restante do app (Space Grotesk/Space Mono via
 * Google Fonts em src/app/layout.tsx), nunca uma fonte arbitrária.
 */
import { mkdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SpaceGrotesk_Regular_TTF_BASE64,
  SpaceGrotesk_Medium_TTF_BASE64,
  SpaceGrotesk_SemiBold_TTF_BASE64,
  SpaceGrotesk_Bold_TTF_BASE64,
  SpaceMono_Regular_TTF_BASE64,
  SpaceMono_Bold_TTF_BASE64,
} from "./fonts-data";

export type StudioFontWeightKey = "regular" | "medium" | "semibold" | "bold";

/** Nome de família tal como registrado na tabela `name` do próprio .ttf --
 *  precisa bater exatamente com isso para o resvg-js resolver a fonte
 *  carregada via `font.fontFiles` (não é um apelido livre). */
export const STUDIO_FONT_FAMILY_DISPLAY = "Space Grotesk";
export const STUDIO_FONT_FAMILY_MONO = "Space Mono";

const FONT_DIR = join(tmpdir(), "lokat-studio-fonts");

const DISPLAY_FONTS: Record<StudioFontWeightKey, { file: string; base64: string }> = {
  regular: { file: "SpaceGrotesk-Regular.ttf", base64: SpaceGrotesk_Regular_TTF_BASE64 },
  medium: { file: "SpaceGrotesk-Medium.ttf", base64: SpaceGrotesk_Medium_TTF_BASE64 },
  semibold: { file: "SpaceGrotesk-SemiBold.ttf", base64: SpaceGrotesk_SemiBold_TTF_BASE64 },
  bold: { file: "SpaceGrotesk-Bold.ttf", base64: SpaceGrotesk_Bold_TTF_BASE64 },
};
const MONO_FONTS: Record<"regular" | "bold", { file: string; base64: string }> = {
  regular: { file: "SpaceMono-Regular.ttf", base64: SpaceMono_Regular_TTF_BASE64 },
  bold: { file: "SpaceMono-Bold.ttf", base64: SpaceMono_Bold_TTF_BASE64 },
};

let materializedPaths: string[] | null = null;

function materializeOne(file: string, base64: string): string {
  const dest = join(FONT_DIR, file);
  const bytes = Buffer.from(base64, "base64");
  if (existsSync(dest) && statSync(dest).size === bytes.length) return dest;
  writeFileSync(dest, bytes);
  return dest;
}

/**
 * Garante que os 6 arquivos de fonte existem em disco e retorna os
 * caminhos absolutos (para @resvg/resvg-js `font.fontFiles`, que só
 * aceita caminho de arquivo, nunca buffer em memória).
 */
export function ensureStudioFontFiles(): string[] {
  if (materializedPaths) return materializedPaths;
  mkdirSync(FONT_DIR, { recursive: true });
  const paths: string[] = [];
  for (const { file, base64 } of Object.values(DISPLAY_FONTS)) paths.push(materializeOne(file, base64));
  for (const { file, base64 } of Object.values(MONO_FONTS)) paths.push(materializeOne(file, base64));
  materializedPaths = paths;
  return paths;
}

/** font-weight numérico -> peso real disponível (nunca inventa um peso que não foi baixado). */
export function resolveDisplayWeightKey(weight: number): StudioFontWeightKey {
  if (weight >= 700) return "bold";
  if (weight >= 600) return "semibold";
  if (weight >= 500) return "medium";
  return "regular";
}
