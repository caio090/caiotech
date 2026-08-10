import type { Metadata } from "next";
import HomeClient from "./_home-client";

/**
 * Sprint Public Home + Brand SEO V1 — a Home era um Client Component sem
 * nenhum `metadata` próprio, herdando título/descrição/canonical do layout
 * raiz. `/planos` faz exatamente o mesmo, então as duas páginas renderizavam
 * o MESMO <title>/<meta description>/<link rel="canonical"> -- causa raiz
 * real (confirmada por auditoria, não assumida) de o Google tratar as duas
 * como conteúdo quase idêntico e escolher `/planos` para representar a marca.
 * `export const metadata` só existe em Server Component, então a Home foi
 * dividida: este arquivo é a casca de servidor (metadata + structured data),
 * `_home-client.tsx` mantém toda a interatividade existente inalterada.
 */
export const metadata: Metadata = {
  title: "LOKAT OS | Gestão, operação e inteligência para sua empresa",
  description:
    "Centralize projetos, clientes, conteúdo, calendário e operação. Trabalhe com o Jarvis conectado ao contexto da sua empresa.",
  alternates: {
    canonical: "https://www.lokat.com.br/",
  },
  openGraph: {
    title: "LOKAT OS | Gestão, operação e inteligência para sua empresa",
    description:
      "Centralize projetos, clientes, conteúdo, calendário e operação. Trabalhe com o Jarvis conectado ao contexto da sua empresa.",
    url: "https://www.lokat.com.br/",
    siteName: "Lokat",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOKAT OS | Gestão, operação e inteligência para sua empresa",
    description:
      "Centralize projetos, clientes, conteúdo, calendário e operação. Trabalhe com o Jarvis conectado ao contexto da sua empresa.",
  },
};

/**
 * WebSite + Organization (Fase 15/16) -- já existiam como Organization/
 * SoftwareApplication/WebSite embutidos na Home antiga; só foram movidos
 * para a casca de servidor e alinhados para usar a URL canonical exata
 * (com barra final). Nenhum dado novo foi inventado: sem CNPJ, telefone,
 * endereço, número de funcionários ou perfis sociais -- nenhum desses
 * existe de forma confiável neste repositório.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.lokat.com.br/#org",
      name: "Lokat",
      url: "https://www.lokat.com.br/",
      logo: "https://www.lokat.com.br/icon.svg",
      description: "LOKAT OS conecta marketing, clientes, produção, operação e dados para empresas, agências e equipes.",
      contactPoint: { "@type": "ContactPoint", contactType: "customer service", url: "https://www.lokat.com.br/contato" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.lokat.com.br/#app",
      name: "LOKAT OS",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://www.lokat.com.br/",
      description: "Sistema operacional para organizar marketing, clientes, produção e resultados.",
      publisher: { "@id": "https://www.lokat.com.br/#org" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.lokat.com.br/#website",
      url: "https://www.lokat.com.br/",
      name: "Lokat",
      alternateName: "LOKAT OS",
      publisher: { "@id": "https://www.lokat.com.br/#org" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://www.lokat.com.br/blog/busca?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient />
    </>
  );
}
