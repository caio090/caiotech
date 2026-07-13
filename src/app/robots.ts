import type { MetadataRoute } from "next";

const BASE_URL = "https://www.lokat.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/plataforma",
          "/planos",
          "/diagnostico",
          "/diagnostico-marketing",
          "/pre-acesso",
          "/rec",
          "/contato",
          "/blog",
          "/termos",
          "/privacidade",
        ],
        disallow: [
          "/admin",
          "/api",
          "/login",
          "/criar-conta",
          "/checkout",
          "/onboarding",
          "/client",
          "/agency",
          "/invite",
          "/_next",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
