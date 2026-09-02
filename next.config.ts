import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prompt 01 (Studio Visual Engine) — @resvg/resvg-js é um addon nativo
  // (N-API, binário .node por plataforma) usado só pelo compositor do
  // Studio (render/compositor.ts). Precisa ficar de fora do bundle
  // ESM/Turbopack (mesmo motivo pelo qual "sharp" já está na lista
  // default do Next) para que o require() nativo resolva o binário
  // certo em runtime, em vez do bundler tentar colocá-lo num chunk.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
