import EcosystemMapClient from "./_ecosystem-client";

/** Fase 4: mapa da plataforma, exclusivo do Super Admin. Autorização real de superfície continua sendo a do layout admin -- esta página não cria um gate paralelo; o seletor de superfície aqui dentro é só uma representação do registry (Fase 35), não altera quem pode ver o quê de verdade. */
export default function EcosystemMapPage() {
  return <EcosystemMapClient />;
}
