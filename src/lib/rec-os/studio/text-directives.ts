/**
 * Prompt 03 (Studio Release Fix) -- P1: parser deterministico de
 * "directives" de texto dentro do briefing livre (freeformBrief).
 * Puro, sem I/O, sem LLM -- nunca usa IA para decidir se o usuario
 * forneceu headline/CTA explicitos (a Vidigal ja e usada para
 * SUGERIR quando nada foi informado; aqui e so reconhecimento de
 * padrao deterministico).
 *
 * Reconhece linhas como:
 *   Headline: HOJE ATE MAIS TARDE
 *   Headline = HOJE ATE MAIS TARDE
 *   Titulo: HOJE ATE MAIS TARDE
 *   CTA: PECA AGORA
 *   Chamada: PECA AGORA
 *
 * O valor extraido e preservado byte-a-byte apos um trim controlado
 * (sem reescrever copy, sem mudar capitalizacao/pontuacao, sem
 * traduzir, sem emoji) -- so remove caracteres de controle/invisiveis
 * perigosos (bidi override, zero-width, BOM) que poderiam distorcer a
 * renderizacao, nunca conteudo visivel.
 */

const HEADLINE_LINE = /^(?:headline|t[ií]tulo)\s*[:=]\s*(.+)$/i;
const CTA_LINE = /^(?:cta|chamada)\s*[:=]\s*(.+)$/i;

const MAX_HEADLINE_CHARS = 200;
const MAX_CTA_CHARS = 80;

/**
 * C0 controls + DEL, zero-width space/joiner/non-joiner/LRM/RLM
 * (U+200B-200F), bidi embedding/override (U+202A-202E), bidi
 * isolates (U+2066-2069), BOM/zero-width-no-break-space (U+FEFF).
 * Construida a partir de escapes \u..., nunca um caractere invisivel
 * literal dentro do arquivo-fonte -- mantem o arquivo auditavel em
 * qualquer editor/terminal.
 */
const DANGEROUS_INVISIBLE_CHARS = new RegExp(
  "[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]",
  "g",
);

/**
 * Remove so caracteres de controle/invisiveis perigosos para o
 * render -- nunca altera conteudo visivel, nunca reescreve/corrige/
 * traduz o texto do usuario.
 */
function sanitizeExtractedText(value: string, maxChars: number): string {
  const stripped = value.replace(DANGEROUS_INVISIBLE_CHARS, "");
  return stripped.trim().slice(0, maxChars);
}

export interface StudioTextDirectives {
  headline: string | null;
  cta: string | null;
  /** freeformBrief sem as linhas de directive ja extraidas -- para a
   *  Vidigal raciocinar sobre o restante do pedido, nao sobre a
   *  sintaxe "Headline: ...". Se nada foi extraido, e o texto original. */
  remainingBrief: string;
}

/**
 * Extrai headline/CTA explicitos de um briefing livre, de forma
 * deterministica (primeira linha que casar cada padrao vence). Nunca
 * lanca, nunca usa IA.
 */
export function parseStudioTextDirectives(freeformBrief: string): StudioTextDirectives {
  const lines = freeformBrief.split(/\r?\n/);
  let headline: string | null = null;
  let cta: string | null = null;
  const remainingLines: string[] = [];

  for (const line of lines) {
    const headlineMatch = headline === null ? HEADLINE_LINE.exec(line.trim()) : null;
    if (headlineMatch) {
      const extracted = sanitizeExtractedText(headlineMatch[1], MAX_HEADLINE_CHARS);
      if (extracted) { headline = extracted; continue; }
    }
    const ctaMatch = cta === null ? CTA_LINE.exec(line.trim()) : null;
    if (ctaMatch) {
      const extracted = sanitizeExtractedText(ctaMatch[1], MAX_CTA_CHARS);
      if (extracted) { cta = extracted; continue; }
    }
    remainingLines.push(line);
  }

  return { headline, cta, remainingBrief: remainingLines.join("\n").trim() };
}

/**
 * Resolve o texto final a renderizar, respeitando a precedencia
 * obrigatoria (Prompt 03): (1) campo estruturado do usuario > (2)
 * directive extraida do freeform > (3) sugestao da Vidigal. Nunca
 * permite que (3) sobrescreva (1) ou (2) -- e nunca deixa DNA/tom de
 * marca influenciar esta escolha (DNA nunca chega a esta funcao).
 */
export function resolveFinalText(structured: string | undefined, directive: string | null, suggested: string | null): string | null {
  const structuredTrimmed = structured?.trim();
  if (structuredTrimmed) return structuredTrimmed;
  if (directive) return directive;
  return suggested?.trim() || null;
}
