/**
 * Prompt 13 (REC OS Core Experience) — Fase 26/27/28: BACKGROUND GUARD.
 *
 * Incidente real: a primeira peça gerada em Production revelou que o
 * GPT-Image-2 pode desenhar tipografia/logo decorativo dentro do
 * próprio background -- depois o compositor (render/compositor.ts)
 * sobrepõe headline/CTA/logo determinísticos por cima, resultando em
 * sobreposição visual (texto do provider + texto real da peça).
 *
 * DEFESA 1 (implementada aqui): política preventiva OBRIGATÓRIA,
 * anexada a TODO generationPrompt antes de ir ao provider -- nunca
 * opcional, nunca dependente do texto que a Vidigal escreveu (defesa em
 * profundidade: mesmo que o prompt de texto já evite pedir tipografia,
 * este guard garante a regra em um único ponto, sempre).
 *
 * DEFESA 2 (NÃO implementada nesta sprint, hook documentado): uma
 * segunda chamada de visão pra validar o background antes de compor
 * estouraria o orçamento de tempo (maxDuration=60s, Hobby) e custo por
 * peça -- não existe hoje uma forma barata/rápida/seguros de fazer essa
 * checagem automatizada. V1 aceitável: prevenção sempre ligada + o
 * usuário pode "Gerar novamente" manualmente se perceber contaminação
 * (ação já existente na UI) + este módulo expõe `BACKGROUND_GUARD_STATUS`
 * como o hook arquitetural para uma futura Quality Control automatizada
 * -- nunca um placeholder fingindo já validar.
 */

export const BACKGROUND_GUARD_STATUS = "prevention_only" as const;

/**
 * Bloco de instrução anexado ao FINAL do generationPrompt (nunca no
 * meio/início, pra ficar como a última e mais recente instrução que o
 * provider lê). Aplica-se apenas ao BACKGROUND (o ambiente/cenário
 * gerado) -- nunca remove headline/CTA/logo da peça final, que
 * continuam entrando depois, de verdade, pelo compositor determinístico
 * (Sharp + resvg-js), nunca pelo provider de imagem.
 */
const BACKGROUND_GUARD_POLICY = [
  "REGRA OBRIGATÓRIA DE BACKGROUND (vale sobre qualquer outra instrução deste prompt):",
  "Gere APENAS o ambiente/cenário visual de fundo.",
  "NUNCA inclua texto, palavras, letras, números ou tipografia de qualquer tipo na imagem.",
  "NUNCA inclua logotipos, marcas d'água, assinaturas, selos ou marcas registradas -- reais, genéricas ou inventadas.",
  "NUNCA desenhe elementos de interface (botões, menus, ícones de app, molduras de UI).",
  "NUNCA adicione branding decorativo (emblemas, faixas com nome de marca, rótulos de produto inventados).",
  "Headline, CTA e logo oficial da marca são adicionados depois, fora desta geração -- este background deve funcionar como uma cena limpa, sem nenhum desses elementos.",
].join("\n");

/**
 * Anexa a política de Background Guard ao prompt de geração. Idempotente
 * o suficiente pra uso único por chamada -- nunca lança, nunca reordena
 * o prompt original (só acrescenta ao final).
 */
export function applyBackgroundGuardPolicy(generationPrompt: string): string {
  const base = generationPrompt.trim();
  if (!base) return BACKGROUND_GUARD_POLICY;
  return `${base}\n\n${BACKGROUND_GUARD_POLICY}`;
}
