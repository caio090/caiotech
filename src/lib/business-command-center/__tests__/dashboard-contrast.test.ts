(function () {
function assertContrast(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const colors = {
  canvas: "#090b10",
  panel: "#11141c",
  elevated: "#171b26",
  text: "#f6f7fb",
  secondary: "#bcc4d4",
  muted: "#8993a8",
  violet: "#c4b5fd",
  green: "#86efac",
  amber: "#fcd34d",
  red: "#fca5a5",
} as const;

function luminance(hex: string) {
  const channels = hex.slice(1).match(/.{2}/g)?.map((value) => Number.parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

const normalTextPairs = [
  [colors.text, colors.canvas, "texto principal sobre canvas"],
  [colors.text, colors.panel, "texto principal sobre painel"],
  [colors.secondary, colors.panel, "texto secundario sobre card"],
  [colors.muted, colors.panel, "texto auxiliar sobre card"],
  [colors.violet, colors.panel, "acao violeta sobre card"],
  [colors.green, colors.panel, "positivo sobre card"],
  [colors.amber, colors.panel, "atencao sobre card"],
  [colors.red, colors.panel, "critico sobre card"],
] as const;

for (const [foreground, background, label] of normalTextPairs) {
  assertContrast(contrast(foreground, background) >= 4.5, `${label} deve atingir WCAG AA`);
}
assertContrast(contrast(colors.secondary, colors.elevated) >= 4.5, "texto de botao disabled permanece legivel");
console.log(`[result] ${normalTextPairs.length + 1} contrast assertions passed`);
})();
