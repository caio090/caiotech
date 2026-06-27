import type { Metadata } from "next";
import "./globals.css";
import { PageTransition } from "@/components/page-transition";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LOKAT OS",
  description: "O sistema operacional do seu negócio",
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
      <body className="h-full antialiased">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
