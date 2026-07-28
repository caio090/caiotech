import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const files = {
  workspace: read("src/app/admin/meu-negocio/_restaurant-workspace.tsx"),
  assistant: read("src/app/admin/meu-negocio/_ask-lokat-panel.tsx"),
  section: read("src/components/motion/motion-section.tsx"),
  stagger: read("src/components/motion/motion-stagger.tsx"),
  orb: read("src/components/motion/lokat-intelligence-orb.tsx"),
  preferences: read("src/lib/motion/motion-preferences.ts"),
  package: read("package.json"),
};

const checks: Array<[string, boolean]> = [
  ["mesma rota integrada", !fs.existsSync(path.join(root, "src/app/admin/meu-negocio-v2"))],
  ["GSAP instalado", files.package.includes('"gsap"')],
  ["GSAP React instalado", files.package.includes('"@gsap/react"')],
  ["Three instalado", files.package.includes('"three"')],
  ["sem Fiber", !files.package.includes('"@react-three/fiber"')],
  ["sem Drei", !files.package.includes('"@react-three/drei"')],
  ["motion compartilhado na workspace", files.workspace.includes("<MotionSection")],
  ["useGSAP", files.section.includes("useGSAP") && files.stagger.includes("useGSAP")],
  ["scope", files.section.includes("{ scope") && files.stagger.includes("{ scope")],
  ["reduced motion", files.section.includes("prefers-reduced-motion") && files.preferences.includes("prefers-reduced-motion")],
  ["orb lazy e SSR false", files.assistant.includes("dynamic(") && files.assistant.includes("ssr: false")],
  ["orb somente no assistente", files.assistant.includes("<LokatIntelligenceOrb") && !files.workspace.includes("LokatIntelligenceOrb")],
  ["DPR limitado", files.orb.includes("Math.min(devicePixelRatio, 1.5)")],
  ["mobile sem WebGL", files.preferences.includes("innerWidth >= 768")],
  ["pointer coarse sem WebGL", files.preferences.includes("pointer: coarse")],
  ["pausa fora da viewport", files.orb.includes("IntersectionObserver")],
  ["pausa com aba oculta", files.orb.includes("document.hidden")],
  ["animation frame cancelado", files.orb.includes("cancelAnimationFrame")],
  ["geometry disposed", files.orb.includes("geometry?.dispose()")],
  ["material disposed", files.orb.includes("material?.dispose()")],
  ["renderer disposed", files.orb.includes("renderer?.dispose()")],
  ["sem textura externa", !files.orb.includes("TextureLoader")],
  ["sem modelo externo", !files.orb.includes("GLTFLoader")],
  ["ESC no assistente", files.assistant.includes('event.key === "Escape"')],
  ["retorno de foco", files.assistant.includes("previous?.focus()")],
];

let failed = 0;
for (const [label, ok] of checks) { if (!ok) { failed += 1; console.error(`  not ok - ${label}`); } else console.log(`  ok - ${label}`); }
console.log(`[result] ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
