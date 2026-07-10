import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default:  "LOKAT OS | Marketing, CRM e conteúdo com IA",
    template: "%s | LOKAT OS",
  },
  description:
    "Planeje campanhas, gerencie leads, aprove conteúdos, acompanhe clientes e organize sua operação de marketing em um só lugar, com IA e automação.",
  keywords: [
    "marketing com IA", "CRM para agências", "sistema de marketing",
    "gestão de conteúdo", "automação de marketing", "aprovação de conteúdo",
    "social media", "negócios locais", "agência de marketing", "Floriano PI",
  ],
  openGraph: {
    title:       "LOKAT OS | Marketing, CRM e conteúdo com IA",
    description: "Planeje campanhas, leads, aprovações, relatórios e atendimento em uma única plataforma com IA para agências e negócios locais.",
    url:         "https://www.lokat.com.br",
    siteName:    "LOKAT OS",
    locale:      "pt_BR",
    type:        "website",
  },
  twitter: {
    card:        "summary_large_image",
    title:       "LOKAT OS | Marketing, CRM e conteúdo com IA",
    description: "Organize marketing, CRM, conteúdo, aprovações e clientes em uma plataforma com IA.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
