import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prompt 01 (Studio Visual Engine) — @resvg/resvg-js é um addon nativo
  // (N-API, binário .node por plataforma) usado só pelo compositor do
  // Studio (render/compositor.ts). Precisa ficar de fora do bundle
  // ESM/Turbopack (mesmo motivo pelo qual "sharp" já está na lista
  // default do Next) para que o require() nativo resolva o binário
  // certo em runtime, em vez do bundler tentar colocá-lo num chunk.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Prompt 07 (Studio Linux Runtime Fix) — causa raiz do incidente de
  // Production (ERR_DLOPEN_FAILED, libvips-cpp.so.8.18.6 ausente).
  //
  // Investigado e DESCARTADO: o Next tem uma exclusão de
  // "node_modules/sharp/**/*"/"@img/sharp-libvips*/**/*" do trace
  // quando builda dentro da própria Vercel (hasNextSupport, via
  // NOW_BUILDER -- ver node_modules/next/dist/server/ci-info.js), mas
  // essa exclusão vive em collect-build-traces.js, que só roda no
  // pipeline Webpack (node_modules/next/dist/build/index.js: o bloco
  // que chama collectBuildTraces é guardado por
  // `bundler !== Bundler.Turbopack`) -- este projeto builda com
  // Turbopack (confirmado no log de build: "▲ Next.js ... (Turbopack)"),
  // então essa exclusão nunca chega a rodar aqui. Confirmado
  // empiricamente: build local com NOW_BUILDER=1 não reproduziu nenhuma
  // exclusão.
  //
  // Causa real, confirmada por inspeção do pacote publicado
  // (`npm pack @img/sharp-libvips-linux-x64@1.3.3` → contém exatamente
  // `lib/libvips-cpp.so.8.18.6`, o arquivo citado no erro de Production)
  // e por inspeção do próprio trace gerado: o tracer (seja o do Webpack
  // via @vercel/nft, seja o do Turbopack) consegue seguir o require()
  // que resolve `@img/sharp-<plataforma>` (arquivo .node do addon nativo
  // -- rastreável, aparece no trace) mas NÃO consegue enxergar que esse
  // addon, já dentro do código nativo compilado, faz um dlopen() do
  // `libvips-cpp.so` usando um caminho de diretório resolvido em
  // runtime (`@img/sharp-libvips-<plataforma>/lib/index.js` só exporta
  // `__dirname` -- nenhum require() aponta pro .so em si). Isso é uma
  // limitação geral de qualquer tracer JS-level diante de dlopen()
  // chamado de dentro de um binário nativo, não um bug específico desta
  // versão do Next -- por isso o próprio Next documenta "sharp" como
  // exemplo padrão de outputFileTracingIncludes (ver
  // node_modules/next/dist/docs/.../output.md). Escopado só à rota que
  // realmente importa sharp (render/compositor.ts, via
  // create-studio-visual.ts) -- nunca o pacote inteiro em todas as rotas.
  //
  // x64 E arm64: nem `vercel project inspect`/`vercel inspect` nem o
  // log de build real do deployment quebrado (dpl_B33TSicgKsQLwApedn9uV6wPKGeH,
  // consultado via `vercel inspect --logs`) expõem a arquitetura de CPU
  // da Function em texto -- e um `vercel build` local produziu
  // `.vc-config.json` com `"architecture":"arm64"` mesmo vindo de um
  // Mac Apple Silicon, o que sugere que isso reflete um default do
  // projeto na Vercel, não o host que builda. Sem uma forma confiável
  // de confirmar qual arquitetura a Function do Studio roda de fato,
  // inclui as duas variantes glibc (x64 e arm64, os dois únicos
  // suportados por Function do Node.js na Vercel -- nunca musl) em vez
  // de arriscar deixar a errada de fora outra vez.
  outputFileTracingIncludes: {
    "/api/studio/images/generate": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linux-arm64/**/*",
      "./node_modules/@img/sharp-libvips-linux-arm64/**/*",
    ],
  },
};

export default nextConfig;
