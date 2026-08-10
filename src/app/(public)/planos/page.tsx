import type { Metadata } from "next";
import PlanosClient from "./_planos-client";

/**
 * Sprint Public Home + Brand SEO V1 — mesma divisão aplicada à Home:
 * `/planos` era um Client Component sem `metadata` próprio, herdando o
 * mesmo título/descrição/canonical da Home via layout raiz (causa raiz real
 * de o Google confundir as duas páginas). Canonical aqui é self-referential
 * para `/planos` -- nunca aponta para `/`, são páginas com propósito
 * diferente (oferta/preços vs. marca/produto).
 */
export const metadata: Metadata = {
  title: "Planos e preços | LOKAT OS",
  description:
    "Compare os planos da LOKAT OS — comunidade, start, pro e agência. 14 dias grátis, sem cartão, sem cobrança automática.",
  alternates: {
    canonical: "https://www.lokat.com.br/planos",
  },
  openGraph: {
    title: "Planos e preços | LOKAT OS",
    description: "Compare os planos da LOKAT OS — comunidade, start, pro e agência. 14 dias grátis, sem cartão.",
    url: "https://www.lokat.com.br/planos",
    siteName: "Lokat",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planos e preços | LOKAT OS",
    description: "Compare os planos da LOKAT OS — comunidade, start, pro e agência. 14 dias grátis, sem cartão.",
  },
};

export default function PlanosPage() {
  return <PlanosClient />;
}
