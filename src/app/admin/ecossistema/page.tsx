import { redirect } from "next/navigation";

/**
 * Sprint Navegação e Experiência 3.0.1.2 (Fase 9, Opção A) — /admin/ecossistema
 * deixou de ser uma entrada operacional principal (estava, inclusive,
 * ocupando um dos 4 slots fixos do rodapé mobile do Super Admin — ver
 * src/lib/mobile-shell/types.ts). O conteúdo real (EcosystemMapClient)
 * não foi apagado nem duplicado: passou a viver em
 * /admin/status/arquitetura ("Arquitetura da Plataforma"), subordinado à
 * área de Status. Esta rota continua existindo como alias de
 * compatibilidade para qualquer link/bookmark antigo — nunca 404.
 */
export default function EcosystemMapAliasPage() {
  redirect("/admin/status/arquitetura");
}
